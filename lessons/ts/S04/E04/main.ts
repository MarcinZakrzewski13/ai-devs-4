// Modele użyte w zadaniu:
//   - gpt-5-mini → ekstrakcja strukturalnych danych z notatek Natana (Structured Output)
//
// Zadanie S04E04 "filesystem": notatki Natana Ramsa zawierają informacje o miastach
// (potrzeby towarów), osobach (handlarze w każdym mieście) i transakcjach (kto co
// sprzedał). Trzeba zbudować wirtualny filesystem przez API hubu (trzy katalogi:
// /miasta, /osoby, /towary) i zatwierdzić wynik akcją "done".

import "dotenv/config";
import chalk from "chalk";
import { saveFinalAnswer, saveTmpAnswer } from "@ai-devs/ai-devs-hub";
import { loadNotes } from "./loadNotes.ts";
import { extractData } from "./extractData.ts";
import { buildOps } from "./buildOps.ts";
import { sendBatch, sendDone } from "./callFilesystem.ts";

const W = 58;
const BORDER = chalk.cyan("═".repeat(W));
const step = (label: string) =>
  console.log(chalk.cyan("  ◆ ") + chalk.white(label) + chalk.gray("..."));
const done = (label: string) =>
  console.log(chalk.green("  ✓ ") + chalk.gray(label));

async function main() {
  console.log("\n" + BORDER);
  console.log(chalk.cyan.bold("  S04E04 — FILESYSTEM (notatki Natana)".padEnd(W - 2)));
  console.log(chalk.gray("  Model: gpt-5-mini (Structured Output)"));
  console.log(chalk.gray("  Output: 3 katalogi w wirtualnym FS hubu"));
  console.log(BORDER + "\n");

  step("Ładowanie notatek Natana");
  const notes = await loadNotes();
  done(`notatki załadowane (${notes.length} znaków)`);

  step("Ekstrakcja danych (LLM)");
  const data = await extractData(notes);
  done(
    `wyekstrahowano: ${data.miasta.length} miast, ${data.osoby.length} osób, ${data.towary.length} towarów`
  );

  console.log(chalk.gray("\n  Miasta:  ") + data.miasta.map((m) => m.nazwa).join(", "));
  console.log(
    chalk.gray("  Osoby:   ") +
      data.osoby.map((o) => `${o.imie}${o.nazwisko ? " " + o.nazwisko : ""}→${o.miasto}`).join(", ")
  );
  console.log(chalk.gray("  Towary:  ") + data.towary.map((t) => t.nazwa).join(", ") + "\n");

  step("Budowanie operacji filesystem");
  const ops = buildOps(data);
  done(`${ops.length} operacji w batchu`);

  await saveTmpAnswer("S04E04", "filesystem", ops);

  console.log("\n" + chalk.cyan("─".repeat(W)));
  console.log(chalk.cyan.bold("  WYSYŁKA DO CENTRALI"));
  console.log(chalk.cyan("─".repeat(W)) + "\n");

  step("Batch create (reset + dirs + files)");
  await sendBatch(ops);
  done("batch OK");

  step("Walidacja końcowa (done)");
  const doneResponse = await sendDone();

  const flagMatch = JSON.stringify(doneResponse).match(/\{\{?FLG:[^}]+\}\}?/);
  if (flagMatch) {
    console.log(
      "\n" + chalk.bgYellow.black.bold("  🏁 FLAGA: " + flagMatch[0] + "  ") + "\n"
    );
  }

  if (doneResponse.code === 0) {
    await saveFinalAnswer("S04E04", "filesystem", ops, doneResponse as any);
    done("final answer zapisany");
  } else {
    console.log(chalk.bgRed.white.bold("  ✗ DONE FAILED: ") + JSON.stringify(doneResponse));
    process.exit(2);
  }
}

main().catch((err) => {
  console.error(chalk.red("\n✗ " + (err instanceof Error ? err.stack ?? err.message : String(err))));
  process.exit(1);
});
