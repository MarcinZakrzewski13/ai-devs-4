// "Tokeny złych odpowiedzi to znaki - nadaj FLAG"
// Dosłownie: tokeny LLM. Tekst jest tokenizowany.
// Cel: sprawić, by tokeny = "FLAG" w jakiś sposób.

import "dotenv/config";
import chalk from "chalk";
import { sendAnswer } from "@ai-devs/ai-devs-hub";
import { encodingForModel } from "js-tiktoken";

const TASK = "failure";
const enc = encodingForModel("gpt-4o");

async function main() {
  // Krok 1: Jakie tokeny to F, L, A, G?
  console.log(chalk.cyan("=== Token IDs dla poszczególnych liter ==="));
  for (const ch of ["F", "L", "A", "G", "FLAG", " FLAG", "FLAG ", " F", " L", " A", " G"]) {
    const ids = enc.encode(ch);
    console.log(`  "${ch}" → [${ids.join(", ")}]`);
  }

  // Krok 2: Co dekodują się tokeny o ID = ASCII wartościach F,L,A,G?
  console.log(chalk.cyan("\n=== Dekodowanie token IDs 65-76 ==="));
  for (let id = 65; id <= 76; id++) {
    try {
      const text = enc.decode(new Uint32Array([id]));
      console.log(`  ID ${id} → "${text}" (ASCII ${id} = '${String.fromCharCode(id)}')`);
    } catch {
      console.log(`  ID ${id} → [error]`);
    }
  }

  // Krok 3: Token IDs 70, 76, 65, 71 (F, L, A, G jako ASCII)
  console.log(chalk.cyan("\n=== Dekodowanie [70, 76, 65, 71] ==="));
  const flagTokenIds = new Uint32Array([70, 76, 65, 71]);
  const decoded = enc.decode(flagTokenIds);
  console.log(`  [70, 76, 65, 71] → "${decoded}"`);

  // Krok 4: A co z odwrotnym podejściem - jakie ID mają litery F,L,A,G jako tokeny?
  console.log(chalk.cyan("\n=== Token IDs liter w kontekście ==="));
  const flagText = "FLAG";
  const flagIds = enc.encode(flagText);
  console.log(`  "${flagText}" → [${flagIds.join(", ")}]`);

  // Dekodujmy te ID jako ASCII
  console.log(`  Te ID jako ASCII: "${flagIds.map(id => String.fromCharCode(id)).join("")}"`);

  // Krok 5: Wyślijmy tekst który dekoduje się z [70,76,65,71]
  console.log(chalk.cyan("\n=== Próba: tekst z token IDs [70,76,65,71] ==="));
  const textFromTokenIds = enc.decode(new Uint32Array([70, 76, 65, 71]));
  console.log(`  Tekst: "${textFromTokenIds}"`);
  let res = await sendAnswer(TASK, { logs: textFromTokenIds });
  console.log(`  code: ${res.code}, message: ${res.message}`);
  const extra = Object.keys(res).filter(k => !["code", "message"].includes(k));
  for (const k of extra) console.log(`  ${k}: ${JSON.stringify((res as any)[k])}`);

  await new Promise(r => setTimeout(r, 500));

  // Krok 6: Sprawdź /debug endpoint
  console.log(chalk.cyan("\n=== Sprawdzenie /debug ==="));
  const apikey = process.env.API_KEY_AI_DEVS4;
  try {
    const debugRes = await fetch("https://hub.ag3nts.org/debug");
    console.log(`  Status: ${debugRes.status}`);
    const body = await debugRes.text();
    console.log(`  Body: ${body.slice(0, 500)}`);
  } catch (err: any) {
    console.log(`  Error: ${err.message}`);
  }

  await new Promise(r => setTimeout(r, 500));

  // Krok 7: Wyślijmy "FLAG" dosłownie jako logi i sprawdźmy debug
  console.log(chalk.cyan("\n=== Próba: logs z wieloma liniami zawierającymi FLAG-related text ==="));
  const multiLineLogs = [
    "[2026-03-21 06:00] [CRIT] FLAG requested",
    "[2026-03-21 06:01] [CRIT] FLAG transmitted",
    "[2026-03-21 06:02] [CRIT] FLAG confirmed",
  ].join("\n");
  console.log(`  logs token IDs: [${enc.encode(multiLineLogs).join(", ")}]`);
  res = await sendAnswer(TASK, { logs: multiLineLogs });
  console.log(`  code: ${res.code}, message: ${res.message}`);
  for (const k of Object.keys(res).filter(k => !["code", "message"].includes(k))) {
    console.log(`  ${k}: ${JSON.stringify((res as any)[k])}`);
  }

  // Krok 8: Może trzeba wysłać wielo-liniowy tekst gdzie KAŻDA LINIA to jeden token?
  // Albo tekst gdzie tokeny formują "FLAG"?
  console.log(chalk.cyan("\n=== Próba: tekst gdzie tokenizacja daje słowo FLAG ==="));
  // Token IDs dla "FLAG" to np. [25765] lub inne
  // Ale chcemy żeby DEKODOWANE tokeny to "FLAG"
  // Czyli szukamy tekstu, który po tokenizacji daje tokeny,
  // a te tokeny zinterpretowane jako... co?

  // Może chodzi o cl100k_base (GPT-4) vs o200k_base (GPT-4o)?
  // Spróbujmy oba
  const enc2 = encodingForModel("gpt-4");
  console.log(`  gpt-4o: "FLAG" → [${enc.encode("FLAG").join(", ")}]`);
  console.log(`  gpt-4:  "FLAG" → [${enc2.encode("FLAG").join(", ")}]`);

  // Token ID flagowe
  const flagId4o = enc.encode("FLAG");
  const flagId4 = enc2.encode("FLAG");
  console.log(`  gpt-4o ID ${flagId4o} decoded by gpt-4: "${enc2.decode(new Uint32Array(flagId4o))}"`);
  console.log(`  gpt-4  ID ${flagId4} decoded by gpt-4o: "${enc2.decode(new Uint32Array(flagId4))}"`);
}

main().catch(console.error);
