import chalk from "chalk";
import { sendStart, sendAudio } from "./hubClient.ts";
import { synthesizeToMp3 } from "./synthesize.ts";
import { decodeAudio, transcribeFile } from "./transcribe.ts";
import { paths, writeText, dumpState, attemptDir } from "./persistAudio.ts";
import { extractRoadStatuses } from "./extractRoadStatuses.ts";
import { advancePhase, phaseHint } from "./stateMachine.ts";
import { decideUtterance, checkConstraints } from "./agent.ts";
import { extractFlag, isFatalFail } from "./verifyAnswer.ts";
import {
  getSuccessfulPhrase,
  recordSuccessfulPhrase,
} from "./successPhrases.ts";
import type {
  ConversationState,
  ConversationTurn,
  HubResponse,
  Phase,
} from "./types.ts";

const MAX_TURNS = 10;

const emptyState = (attemptId: number): ConversationState => ({
  phase: "AWAIT_START",
  turns: [],
  roadStatuses: { RD224: "UNKNOWN", RD472: "UNKNOWN", RD820: "UNKNOWN" },
  passwordSpoken: false,
  reasonSpoken: false,
  attemptId,
  flag: null,
});

const anyPassable = (r: ConversationState["roadStatuses"]): boolean =>
  Object.values(r).some((v) => v === "PASSABLE");

export type AttemptResult = {
  ok: boolean;
  flag: string | null;
  finalPhase: Phase;
  state: ConversationState;
};

export const runConversation = async (attemptId: number): Promise<AttemptResult> => {
  console.log(chalk.cyan.bold(`\n  ▶ ATTEMPT ${attemptId}`));
  const state = emptyState(attemptId);
  attemptDir(attemptId);

  // 1. START
  const startRes = await sendStart();
  state.turns.push({
    role: "hub",
    seq: 0,
    text: `${startRes.message ?? ""} | ${startRes.msg ?? ""}`,
    hubCode: startRes.code,
    hubMessage: startRes.message,
  });
  // Hub zwraca zmienne kody (0, 110, 120, ...) — nie kod ≠ 0 = fail.
  // Fail tylko gdy brak "started"/"session" w message albo error explicit.
  const startedOk =
    (startRes.message ?? "").toLowerCase().includes("started") ||
    (startRes.action ?? "") === "start";
  if (!startedOk || isFatalFail(startRes)) {
    console.log(
      chalk.red(`  ✗ start failed code=${startRes.code} msg="${startRes.message}"`)
    );
    dumpState(attemptId, "state-final.json", state);
    return { ok: false, flag: null, finalPhase: "FAIL", state };
  }
  state.phase = "OPEN_LINE";

  // 2. Loop dialogowy
  let seq = 1;
  while (
    state.phase !== "SUCCESS" &&
    state.phase !== "FAIL" &&
    seq <= MAX_TURNS
  ) {
    // a) Decyduj co powiedzieć: reuse successful phrase jeśli istnieje, inaczej LLM.
    const phaseAtDecision = state.phase;
    const hint = phaseHint(state);
    const cached = getSuccessfulPhrase(phaseAtDecision);
    const utter = cached ?? (await generateUtterance(state, hint));

    // Aktualizuj flagi stanu wg treści (przed synth).
    const spelledUtter = utter.toLowerCase().replace(/[,\s.]+/g, "");
    if (/barbakan/i.test(utter) || spelledUtter.includes("barbakan")) {
      state.passwordSpoken = true;
    }
    if (
      /tajn|utajni|logach|logi|nie może zostać zalog|nie moze zostac zalog|nie można zdradzić/i.test(
        utter
      )
    ) {
      state.reasonSpoken = true;
    }

    // b) Syntezuj i wyślij
    const p = paths(attemptId, seq, "out");
    const { b64, cleanText } = await synthesizeToMp3(
      utter,
      p.mp3,
      `turn-${seq}-out`
    );
    writeText(p.txt, cleanText);
    state.turns.push({
      role: "tymon",
      seq,
      text: cleanText,
      audioPath: p.mp3,
    });

    const hubRes = await sendAudio(b64);
    state.turns.push({
      role: "hub",
      seq,
      text: hubRes.message ?? "",
      hubCode: hubRes.code,
      hubMessage: hubRes.message,
    });

    // c) Analizuj odpowiedź huba
    const flag = extractFlag(hubRes);
    if (flag) {
      state.flag = flag;
      state.phase = "SUCCESS";
      dumpState(attemptId, "hub-response-final.json", hubRes);
      dumpState(attemptId, "state-final.json", state);
      return { ok: true, flag, finalPhase: "SUCCESS", state };
    }
    if (isFatalFail(hubRes)) {
      state.phase = "FAIL";
      dumpState(attemptId, "hub-response-fatal.json", hubRes);
      dumpState(attemptId, "state-final.json", state);
      return { ok: false, flag: null, finalPhase: "FAIL", state };
    }

    // d) Jeśli operator audio → transcribe → wpisz w turn
    let operatorText = "";
    if (hubRes.audio) {
      const pi = paths(attemptId, seq, "in");
      const bytes = decodeAudio(hubRes.audio, pi.mp3);
      operatorText = await transcribeFile(pi.mp3, `turn-${seq}-in`, bytes);
      writeText(pi.txt, operatorText);
      state.turns.push({
        role: "operator",
        seq,
        text: operatorText,
        audioPath: pi.mp3,
      });
    } else {
      console.log(chalk.gray(`  [hub] brak audio operatora w tej turze`));
    }

    // e) Structured extraction statusów dróg — gdy operator wspomina o RD*.
    const mentionsRoads = /rd[\s-]*(224|472|820)/i.test(operatorText);
    if (
      operatorText &&
      (mentionsRoads ||
        state.phase === "IDENTITY_CONFIRMED" ||
        state.phase === "STATUSES_RECEIVED")
    ) {
      try {
        const extracted = await extractRoadStatuses(operatorText);
        state.roadStatuses = {
          RD224: extracted.RD224,
          RD472: extracted.RD472,
          RD820: extracted.RD820,
        };
      } catch (e) {
        console.log(
          chalk.yellow(`  [extract] błąd: ${(e as Error).message}`)
        );
      }
    }

    // f) Aktualizuj fazę
    const nextPhase = advancePhase(
      state,
      operatorText,
      hubRes.message ?? "",
      hubRes.code,
      false
    );
    if (nextPhase !== state.phase) {
      console.log(
        chalk.blue(`  [phase] ${state.phase} → ${nextPhase}`)
      );
      // Faza się posunęła w sensownym kierunku → wypowiedź zaakceptowana.
      // Wykluczamy FAIL/SUCCESS (SUCCESS wyszedł już wcześniej przez flag path).
      if (nextPhase !== "FAIL") {
        recordSuccessfulPhrase(phaseAtDecision, cleanText);
      }
      state.phase = nextPhase;
    }

    dumpState(attemptId, `state-turn-${seq}.json`, state);
    seq += 1;
  }

  dumpState(attemptId, "state-final.json", state);
  console.log(
    chalk.gray(`  [end] phase=${state.phase} turns=${seq - 1}`)
  );
  return {
    ok: state.phase === "SUCCESS",
    flag: state.flag,
    finalPhase: state.phase,
    state,
  };
};

const MAX_REGEN = 1;

const generateUtterance = async (
  state: ConversationState,
  hint: string
): Promise<string> => {
  let utter = await decideUtterance(state, hint);
  for (let i = 0; i <= MAX_REGEN; i += 1) {
    const problems = checkConstraints(utter, state.phase, state.passwordSpoken);
    if (problems.length === 0) return utter;
    console.log(chalk.yellow(`  [constraint] ${problems.join(" | ")}`));
    if (i === MAX_REGEN) {
      console.log(chalk.yellow(`  [constraint] max regen → wysyłam mimo warning`));
      return utter;
    }
    utter = await decideUtterance(state, `${hint}\nUwaga naprawcza: ${problems.join("; ")}`);
  }
  return utter;
};

// pomocnicze dla logów
export const summarize = (state: ConversationState): string =>
  `phase=${state.phase} roads={${Object.entries(state.roadStatuses)
    .map(([k, v]) => `${k}:${v}`)
    .join(",")}} pwd=${state.passwordSpoken} reason=${state.reasonSpoken}`;

// re-export dla main.ts
export type { ConversationState, HubResponse };
export { anyPassable };
