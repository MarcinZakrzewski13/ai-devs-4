import chalk from "chalk";
import { createDefaultProvider } from "@ai-devs/ai-core";
import { trackCost } from "./costGuard.ts";
import type { ConversationState, ConversationTurn, Phase } from "./types.ts";

const MODEL = "gpt-5-mini";

const SYSTEM_PROMPT = `Jesteś Tymonem Gajewskim. Dzwonisz przez telefon do operatora systemu OKO.
Rozmowa wyłącznie po polsku. Zachowujesz się jak człowiek — spokojnie, rzeczowo.

ABSOLUTNIE KRYTYCZNE:
- Wykonuj TYLKO to, co mówi sekcja "TERAZ" na końcu tego promptu. NIC więcej.
- Nie łącz wielu spraw w jednej wypowiedzi jeśli TERAZ tego nie każe.
- Jedno-dwa krótkie zdania na wypowiedź.
- Nigdy nie ujawniaj lokalizacji/nazwy bazy Zygfryda (żadnych miast, regionów, współrzędnych).
- Nigdy nie mów że jesteś AI/botem/asystentem.
- Bez markdown, bez cudzysłowów, bez emoji, bez opisów akcji.

INFORMACJE MISYJNE (używasz TYLKO gdy TERAZ tego wymaga):
- Twoje imię i nazwisko: Tymon Gajewski.
- Powód rozmowy: transport organizowany do jednej z baz Zygfryda.
- Hasło autoryzacyjne: BARBAKAN.
- Uzasadnienie wyłączenia monitoringu: transport żywności do tajnej bazy Zygfryda, lokalizacja utajniona, misja nie może zostać zalogowana.

STAN ROZMOWY:
- Faza: {PHASE}
- Statusy dróg: {ROADS}
- Hasło już wypowiedziane w tej rozmowie: {PWD}
- Powód wyłączenia monitoringu już podany: {REASON}

TERAZ:
{HINT}

Wygeneruj SAMĄ wypowiedź Tymona (bez cudzysłowów, bez opisów, bez tagów, bez znaczników).`;

const fmtTurns = (turns: ConversationTurn[], n = 6): string => {
  const recent = turns.slice(-n);
  if (recent.length === 0) return "(brak historii)";
  return recent
    .map((t) => `${t.role === "tymon" ? "TYMON" : "OPERATOR"}: ${t.text}`)
    .join("\n");
};

export const decideUtterance = async (
  state: ConversationState,
  hint: string
): Promise<string> => {
  const provider = createDefaultProvider();

  const system = SYSTEM_PROMPT.replace("{PHASE}", state.phase)
    .replace(
      "{ROADS}",
      Object.entries(state.roadStatuses)
        .map(([k, v]) => `${k}=${v}`)
        .join(", ")
    )
    .replace("{PWD}", state.passwordSpoken ? "TAK" : "NIE")
    .replace("{REASON}", state.reasonSpoken ? "TAK" : "NIE")
    .replace("{HINT}", hint);

  const usedInThisSession = state.turns
    .filter((t) => t.role === "tymon")
    .map((t) => `- "${t.text}"`)
    .join("\n");
  const variationSeed = `attempt=${state.attemptId} turn=${state.turns.filter(
    (t) => t.role === "tymon"
  ).length + 1}`;
  const userContent =
    `Historia rozmowy:\n${fmtTurns(state.turns)}\n\n` +
    `Kontekst techniczny: ${variationSeed}.\n\n` +
    `WAŻNE: operator uważa, że mówisz w dziwny sposób. Ten szablon wypowiedzi już go raził — zmień słownictwo i konstrukcję zdania.\n` +
    `Wypowiedzi już użyte (unikaj powtarzania ich brzmienia, słowa kluczowe merytoryczne — hasło, kody dróg — zostają):\n${usedInThisSession || "(brak)"}\n\n` +
    `Wygeneruj nową wersję wypowiedzi Tymona zgodną z sekcją TERAZ, ale nie kopiuj poprzednich sformułowań.`;

  const res = await provider.generateText({
    messages: [
      { role: "system", content: system },
      { role: "user", content: userContent },
    ],
    model: MODEL,
    temperature: 1.0,
  });
  await trackCost(MODEL, res.usage, `agent:${state.phase}`);

  const utter = res.text.trim().replace(/^["""]|["""]$/g, "");
  console.log(chalk.cyan(`  [agent] "${utter.slice(0, 140)}"`));
  return utter;
};

/**
 * Constraint checker — deterministyczna walidacja generowanej wypowiedzi.
 * Zwraca listę problemów; puste = OK.
 */
export const checkConstraints = (
  utter: string,
  phase: Phase,
  passwordSpoken: boolean
): string[] => {
  const problems: string[] = [];
  const lc = utter.toLowerCase();

  // 1. Hasło musi paść w fazach autoryzacyjnych. W STATUSES_RECEIVED i dalszych — NIE.
  const spelled = lc.replace(/[,\s.]+/g, "");
  const hasBarbakan = lc.includes("barbakan") || spelled.includes("barbakan");
  const passwordExpected =
    phase === "IDENTITY_CONFIRMED" || phase === "AUTH_CHALLENGED";
  if (hasBarbakan && !passwordExpected) {
    problems.push("Hasło BARBAKAN nie może paść w tej fazie.");
  }
  if (passwordExpected && !hasBarbakan) {
    problems.push("Wymagane: wypowiedz BARBAKAN.");
  }

  // 2. Nie ujawniać lokalizacji bazy — blacklist konkretnych miast/regionów.
  const forbidden = [
    "warszaw",
    "krakow",
    "kraków",
    "gdańsk",
    "gdansk",
    "poznań",
    "poznan",
    "łódź",
    "lodz",
    "wrocław",
    "wroclaw",
    "grudziądz",
    "grudziadz",
    "syjon",
    "koordynat",
    "współrzęd",
    "wspolrzed",
  ];
  const hit = forbidden.find((w) => lc.includes(w));
  if (hit) problems.push(`Zakazane słowo: "${hit}".`);

  // 3. Nie ujawniać, że jest botem.
  const bot = ["jestem ai", "jestem botem", "jestem asysten", "sztuczna inteligencja"];
  if (bot.some((w) => lc.includes(w))) {
    problems.push("Ujawnia że jest AI/botem.");
  }

  // 4. Długość — max ~350 znaków (rozmowa telefoniczna).
  if (utter.length > 400) {
    problems.push(`Za długa wypowiedź (${utter.length} chars).`);
  }
  if (utter.length < 3) {
    problems.push("Pusta / zbyt krótka wypowiedź.");
  }

  return problems;
};
