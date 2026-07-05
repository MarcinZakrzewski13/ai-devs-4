/**
 * S05E02 · phonecall — orkiestracja
 *
 * Modele:
 *   - whisper-1              — S2T (audio operatora → tekst)
 *   - gpt-4o-mini-tts        — TTS (tekst Tymona → MP3)
 *   - gpt-5-mini             — decyzja treści wypowiedzi (agent LLM) + Structured Output (statusy dróg)
 *
 * Uruchomienie:
 *   bun run lessons/ts/S05/E02/main.ts
 *
 * Auto-restart × MAX_ATTEMPTS (hub jest niedeterministyczny, sesje mogą się spalać losowo).
 */
import chalk from "chalk";
import { runConversation } from "./runConversation.ts";
import { dumpBreakdown, getTotalCost } from "./costGuard.ts";
import { saveTmpAnswer, saveFinalAnswer } from "@ai-devs/ai-devs-hub";
import type { AttemptResult } from "./runConversation.ts";

const W = 60;
const BORDER = chalk.cyan("═".repeat(W));
const MAX_ATTEMPTS = 4;

const main = async (): Promise<void> => {
  console.log("\n" + BORDER);
  console.log(chalk.cyan.bold("  S05E02 · PHONECALL".padEnd(W - 2)));
  console.log(
    chalk.gray("  whisper-1 · gpt-4o-mini-tts · gpt-5-mini | cap $2.00")
  );
  console.log(chalk.gray(`  auto-restart × ${MAX_ATTEMPTS}`));
  console.log(BORDER + "\n");

  const startedAt = new Date().toISOString();
  const sleep = (ms: number): Promise<void> =>
    new Promise((r) => setTimeout(r, ms));

  let last: AttemptResult | null = null;
  for (let i = 1; i <= MAX_ATTEMPTS; i += 1) {
    last = await runConversation(i);
    if (last.ok && last.flag) break;
    console.log(
      chalk.yellow(
        `  ⚠ attempt ${i} failed (phase=${last.finalPhase}) — ${
          i < MAX_ATTEMPTS ? "restart za 5s..." : "koniec prób"
        }`
      )
    );
    if (i < MAX_ATTEMPTS) await sleep(5000);
  }
  if (!last) throw new Error("no attempts executed");
  const result = last;

  console.log("\n" + BORDER);
  console.log(chalk.cyan.bold("  WYNIK".padEnd(W - 2)));
  console.log(
    chalk.gray(
      `  ok=${result.ok} phase=${result.finalPhase} flag=${result.flag ?? "-"} cost=$${getTotalCost().toFixed(5)}`
    )
  );
  console.log(BORDER + "\n");

  await dumpBreakdown();

  const answer = {
    task: "phonecall",
    attempt: result.state.attemptId,
    startedAt,
    finishedAt: new Date().toISOString(),
    phase: result.finalPhase,
    flag: result.flag,
    roadStatuses: result.state.roadStatuses,
    turnCount: result.state.turns.length,
  };

  await saveTmpAnswer("S05E02", "phonecall", answer);
  if (result.ok && result.flag) {
    await saveFinalAnswer(
      "S05E02",
      "phonecall",
      answer,
      { code: 0, message: result.flag, flag: result.flag }
    );
    console.log(chalk.green(`  saveFinalAnswer OK: ${result.flag}`));
  } else {
    console.log(
      chalk.yellow(`  ⚠ Bez flagi po ${MAX_ATTEMPTS} próbach — analiza w tmp/attempt-*/`)
    );
  }
};

main().catch(async (e) => {
  console.error(chalk.red("\n✗ main failed:"), e);
  try {
    await dumpBreakdown();
  } catch {}
  process.exit(1);
});
