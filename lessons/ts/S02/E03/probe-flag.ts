// Próba: "Tokeny złych odpowiedzi to znaki - nadaj FLAG"
// Hipoteza 1: wyślij "FLAG" jako odpowiedź
// Hipoteza 2: kody błędów to znaki ASCII
// Hipoteza 3: token count z odpowiedzi -940 koduje znaki

import "dotenv/config";
import chalk from "chalk";
import { sendAnswer } from "@ai-devs/ai-devs-hub";

const TASK = "failure";

async function main() {
  // Hipoteza 1: wyślij FLAG jako logs
  console.log(chalk.cyan("=== Hipoteza 1: logs='FLAG' ==="));
  let res = await sendAnswer(TASK, { logs: "FLAG" });
  console.log(`  code: ${res.code}, message: ${res.message}`);

  await new Promise(r => setTimeout(r, 500));

  // Hipoteza 1b: answer = "FLAG"
  console.log(chalk.cyan("\n=== Hipoteza 1b: answer='FLAG' ==="));
  res = await sendAnswer(TASK, "FLAG");
  console.log(`  code: ${res.code}, message: ${res.message}`);

  await new Promise(r => setTimeout(r, 500));

  // Sprawdzmy kody błędów jako ASCII
  const codes = [-990, -980, -970, -960, -940, -21];
  console.log(chalk.cyan("\n=== Kody błędów jako wartości ==="));
  console.log("Kody:", codes);
  console.log("Abs:", codes.map(c => Math.abs(c)));
  console.log("Mod 256:", codes.map(c => Math.abs(c) % 256));
  console.log("ASCII:", codes.map(c => String.fromCharCode(Math.abs(c) % 256)));
  console.log("Ostatnie 2 cyfry:", codes.map(c => Math.abs(c) % 100));
  console.log("ASCII z ost. 2:", codes.map(c => String.fromCharCode(Math.abs(c) % 100)));

  // Hipoteza: kody bez minusa, minus 900 = offset
  const offsets = codes.filter(c => c < -100).map(c => Math.abs(c) - 900);
  console.log("Kody - 900:", offsets);
  console.log("ASCII:", offsets.map(c => String.fromCharCode(c)));

  // Może to indeksy liter w alfabecie?
  // 90, 80, 70, 60, 40 → ... nie pasuje

  // Hipoteza 3: "tokeny" to dosłownie token *count* z odpowiedzi -940
  // Nasz wynik: 1503/1500 i 1643/1500
  // Ale to za duże na ASCII

  // Hipoteza 4: trzeba wysłać logi tak, by dostać konkretny token count
  // Np. token count = 70(F) 76(L) 65(A) 71(G) → trzeba wysłać 4 razy z takim tokenem

  // Najpierw sprawdźmy: co się stanie jak wyślemy logi o dokładnie np. 70 tokenach?
  // "F" = ASCII 70, "L" = 76, "A" = 65, "G" = 71
  console.log(chalk.cyan("\n=== ASCII dla FLAG ==="));
  console.log("F=70, L=76, A=65, G=71");

  // Spróbujmy wysyłać logi które mają wymuszony token count bliski tym wartościom
  // Ale to hub liczy tokeny, nie my...
  // Raczej chodzi o to, że hub zwraca token usage w odpowiedzi i to jest klucz

  // Hipoteza 5: Każdy typ błędu zwraca jakieś dane o tokenach.
  // -940 zwraca "Token usage: 1503/1500"
  // Inne nie zwracają. Ale może jest ukryte pole?

  // Sprawdźmy pełne odpowiedzi z surowego fetch
  console.log(chalk.cyan("\n=== Raw responses ==="));
  const apikey = process.env.API_KEY_AI_DEVS4;

  const probes = [
    { logs: "" },
    { logs: "x" },
    {},
    { logs: null },
    { logs: 123 },
  ];

  for (const answer of probes) {
    const raw = await fetch("https://hub.ag3nts.org/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apikey, task: TASK, answer }),
    });
    const body = await raw.json();
    console.log(chalk.gray(`  ${JSON.stringify(answer)} → ${JSON.stringify(body)}`));
    await new Promise(r => setTimeout(r, 300));
  }
}

main().catch(console.error);
