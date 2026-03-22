// noLetterSent: "" + tokenCount = klucz
// "Tokeny złych odpowiedzi to znaki" → tokenCount to ASCII code litery?
// Musimy trafić w tokenCount = 70(F), 76(L), 65(A), 71(G)

import "dotenv/config";
import chalk from "chalk";
import { countTokens } from "./count-tokens";

const TASK = "failure";

async function sendRaw(logs: string) {
  const apikey = process.env.API_KEY_AI_DEVS4;
  const raw = await fetch("https://hub.ag3nts.org/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apikey, task: TASK, answer: { logs } }),
  });
  return await raw.json() as any;
}

async function main() {
  // Najpierw: sprawdźmy jak hub liczy tokeny i jakie dostajemy noLetterSent
  // Budujemy logi o kontrolowanym rozmiarze
  const baseLine = "[2026-03-21 06:00] [WARN] ECCS8 test event";

  // Test: 10 linii → tokenCount=209. Zmierzmy nasze lokalne tokeny
  const test10 = Array(10).fill(baseLine).join("\n");
  console.log(`10 linii: lokalne tokeny = ${countTokens(test10)}`);

  // Cel: tokenCount = 70 (F). Musimy wysłać ~70 tokenów ale min 10 linii
  // Ale 10 linii to 209 tokenów — za dużo na 70
  // Może hub liczy tokeny inaczej? Albo minimum linii jest mniejsze?
  // Sprawdźmy ile linii minimum potrzeba

  console.log(chalk.cyan("\n=== Szukanie minimum linii ==="));
  for (let lines = 9; lines <= 11; lines++) {
    const logs = Array(lines).fill(baseLine).join("\n");
    const res = await sendRaw(logs);
    console.log(`  ${lines} lines: code=${res.code}, tokenCount=${res.tokenCount}, noLetterSent=${JSON.stringify(res.noLetterSent)}`);
    await new Promise(r => setTimeout(r, 300));
  }

  // Spróbujmy krótszych linii
  console.log(chalk.cyan("\n=== Krótsze linie ==="));
  const shortLine = "[2026-03-21 06:00] [WARN] X";
  for (let lines = 10; lines <= 12; lines++) {
    const logs = Array(lines).fill(shortLine).join("\n");
    const localTokens = countTokens(logs);
    const res = await sendRaw(logs);
    console.log(`  ${lines} short lines: local=${localTokens}, hub_tokenCount=${res.tokenCount}, code=${res.code}, noLetterSent=${JSON.stringify(res.noLetterSent)}`);
    await new Promise(r => setTimeout(r, 300));
  }

  // Cel: tokenCount dokładnie 70 (F=70), potem 76 (L), 65 (A), 71 (G)
  // Potrzebujemy 10+ linii z tokenCount=70
  // Spróbujmy ultra-krótkich linii
  console.log(chalk.cyan("\n=== Ultra-krótkie linie ==="));
  const tinyLine = "[2026-03-21 06:00] [WARN] X";
  // 10 ultra-krótkich linii
  let logs = Array(10).fill(tinyLine).join("\n");
  let localT = countTokens(logs);
  let res = await sendRaw(logs);
  console.log(`  10 tiny: local=${localT}, hub=${res.tokenCount}, code=${res.code}`);
  await new Promise(r => setTimeout(r, 300));

  // Jeszcze krótsze - 1 znak na linię
  console.log(chalk.cyan("\n=== Minimalny format ==="));
  const miniLine = "a";
  for (let lines = 10; lines <= 15; lines++) {
    logs = Array(lines).fill(miniLine).join("\n");
    localT = countTokens(logs);
    res = await sendRaw(logs);
    console.log(`  ${lines}x"a": local=${localT}, hub=${res.tokenCount}, code=${res.code}, letter=${JSON.stringify(res.noLetterSent)}`);
    await new Promise(r => setTimeout(r, 300));
  }

  // Spróbujmy podejścia: manipulujmy długością, by uzyskać tokenCount=70
  console.log(chalk.cyan("\n=== Celowanie w tokenCount=70 (F) ==="));
  // Zaczynamy od 10 linii "a" i dodajemy znaki
  let targetTokenCount = 70;
  let baseLog = Array(10).fill("a").join("\n");
  localT = countTokens(baseLog);
  res = await sendRaw(baseLog);
  console.log(`  base 10x"a": hub=${res.tokenCount}`);
  await new Promise(r => setTimeout(r, 300));

  // Iterujemy - dodajemy tekst aż hub powie tokenCount=70
  let current = baseLog;
  let hubTokens = res.tokenCount;

  if (hubTokens < targetTokenCount) {
    // Trzeba dodać tekst
    while (hubTokens < targetTokenCount) {
      current += " word";
      res = await sendRaw(current);
      hubTokens = res.tokenCount;
      if (hubTokens >= targetTokenCount - 5) {
        console.log(`  hub=${hubTokens}, local=${countTokens(current)}`);
      }
      await new Promise(r => setTimeout(r, 200));
    }
    console.log(`  Osiągnięto hub tokenCount=${hubTokens}`);
    console.log(`  Response: ${JSON.stringify(res)}`);
  } else {
    console.log(`  Base already at ${hubTokens} tokens`);
  }
}

main().catch(console.error);
