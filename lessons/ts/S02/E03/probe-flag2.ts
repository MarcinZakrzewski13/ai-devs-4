// Próba 2: "Tokeny złych odpowiedzi to znaki - nadaj FLAG"
// Policzymy tokeny wiadomości błędów i spróbujemy jeszcze kilku podejść

import "dotenv/config";
import chalk from "chalk";
import { sendAnswer } from "@ai-devs/ai-devs-hub";
import { countTokens } from "./count-tokens";
import { encodingForModel } from "js-tiktoken";

const TASK = "failure";
const enc = encodingForModel("gpt-4o");

// Znane odpowiedzi błędne
const errorMessages = [
  { code: -990, message: 'Missing required field "logs".' },
  { code: -980, message: 'Field "logs" must be plain text with multiple log lines.' },
  { code: -970, message: 'Field "logs" cannot be empty.' },
  { code: -960, message: "These logs seem too short to analyze. Add more lines." },
  { code: -940, message: "Unfortunately this does not fit in the context window. Stronger compression is needed. Token usage: 1503/1500 (100.2%)." },
];

async function main() {
  // Analiza 1: token count wiadomości
  console.log(chalk.cyan("=== Token count wiadomości błędów ==="));
  for (const e of errorMessages) {
    const tokens = countTokens(e.message);
    const tokenIds = enc.encode(e.message);
    console.log(`  [${e.code}] tokens=${tokens} → ${String.fromCharCode(tokens)} (ASCII)`);
    console.log(`    token IDs: [${tokenIds.join(", ")}]`);
  }

  // Analiza 2: pierwsze/ostatnie tokeny IDs
  console.log(chalk.cyan("\n=== Poszukiwanie F(70) L(76) A(65) G(71) w token IDs ==="));
  for (const e of errorMessages) {
    const tokenIds = enc.encode(e.message);
    const hasF = tokenIds.includes(70);
    const hasL = tokenIds.includes(76);
    const hasA = tokenIds.includes(65);
    const hasG = tokenIds.includes(71);
    if (hasF || hasL || hasA || hasG) {
      console.log(`  [${e.code}] contains: ${hasF ? "F(70)" : ""} ${hasL ? "L(76)" : ""} ${hasA ? "A(65)" : ""} ${hasG ? "G(71)" : ""}`);
    }
  }

  // Hipoteza: wyślij "F\nL\nA\nG" jako logi
  console.log(chalk.cyan("\n=== Próba: logs='F\\nL\\nA\\nG' ==="));
  let res = await sendAnswer(TASK, { logs: "F\nL\nA\nG" });
  console.log(`  code: ${res.code}, message: ${res.message}`);
  await new Promise(r => setTimeout(r, 500));

  // Hipoteza: wyślij logi o token count = 70 (F), 76 (L), 65 (A), 71 (G) po kolei
  // i zbierz odpowiedzi
  console.log(chalk.cyan("\n=== Próba: wysyłanie logów o precyzyjnym token count ==="));
  const targetTokens = [70, 76, 65, 71]; // F, L, A, G
  const chars = ["F", "L", "A", "G"];
  for (let i = 0; i < targetTokens.length; i++) {
    const target = targetTokens[i];
    // Budujemy logi o dokładnie target tokenów
    let testLogs = "[2026-03-21 06:00] [WARN] test line\n".repeat(3);
    let tokens = countTokens(testLogs);
    // Dodajemy padding
    while (tokens < target) {
      testLogs += "x";
      tokens = countTokens(testLogs);
    }
    while (tokens > target) {
      testLogs = testLogs.slice(0, -1);
      tokens = countTokens(testLogs);
    }
    console.log(`  Target ${target} (${chars[i]}): actual tokens=${countTokens(testLogs)}`);
    res = await sendAnswer(TASK, { logs: testLogs });
    console.log(`  → code: ${res.code}, message: ${res.message}`);
    await new Promise(r => setTimeout(r, 500));
  }

  // Hipoteza: pola error codes w określonej kolejności
  // -970(F=70), ?(L=76), ?(A=65), ?(G=71)
  // Może jest więcej error codes niż znaleźliśmy?
  // Spróbujmy inne typy błędnych danych
  console.log(chalk.cyan("\n=== Szukanie nowych kodów błędów ==="));
  const moreProbes = [
    { name: "object_in_logs", answer: { logs: { nested: true } } },
    { name: "boolean_logs", answer: { logs: true } },
    { name: "empty_object", answer: { logs: {} } },
    { name: "extra_field", answer: { logs: "test\ntest\ntest", extra: "data" } },
    { name: "unicode_logs", answer: { logs: "🔥\n🔥\n🔥" } },
    { name: "many_newlines", answer: { logs: "\n\n\n\n\n\n\n\n\n\n" } },
    { name: "only_newlines_with_content", answer: { logs: "a\nb\nc\nd\ne\nf\ng\nh\ni\nj" } },
  ];

  for (const p of moreProbes) {
    res = await sendAnswer(TASK, p.answer);
    console.log(`  ${p.name} → code: ${res.code}`);
    if (res.code !== -960 && res.code !== -970 && res.code !== -980) {
      console.log(`    NEW CODE! message: ${res.message}`);
    }
    await new Promise(r => setTimeout(r, 300));
  }
}

main().catch(console.error);
