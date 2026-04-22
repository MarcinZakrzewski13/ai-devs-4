// Modele użyte w zadaniu:
//   - gpt-5-nano → klasyfikacja szum/tekst + ekstrakcja faktów (Structured Output)
//   - gpt-5-mini → analiza binarek niejednoznacznych, vision dla małych obrazów, finalna synteza (Structured Output)

import "dotenv/config";
import chalk from "chalk";
import { startSession } from "./hubSession.ts";
import { runListenLoop } from "./listenLoop.ts";
import { aggregate, getCount } from "./factStore.ts";
import { synthesize } from "./synthesize.ts";
import { verifyAnswer } from "./verifyAnswer.ts";
import { dumpBreakdown, getTotalCost } from "./costGuard.ts";

const W = 58;
const BORDER = chalk.cyan("═".repeat(W));
const step = (label: string) =>
  console.log(chalk.cyan("  ◆ ") + chalk.white(label) + chalk.gray("..."));
const done = (label: string) =>
  console.log(chalk.green("  ✓ ") + chalk.gray(label));

async function main() {
  console.log("\n" + BORDER);
  console.log(chalk.cyan.bold("  S05E01 — RADIOMONITORING".padEnd(W - 2)));
  console.log(chalk.gray("  Models: gpt-5-nano (extract) | gpt-5-mini (vision+synth)"));
  console.log(chalk.gray("  Cost cap: $0.50 | Max listens: 50"));
  console.log(BORDER + "\n");

  step("Starting hub session");
  await startSession();
  done("session started");

  console.log("\n" + chalk.cyan("─".repeat(W)));
  console.log(chalk.cyan.bold("  NASŁUCH RADIOWY"));
  console.log(chalk.cyan("─".repeat(W)) + "\n");

  await runListenLoop();
  done(`listen loop finished — ${getCount()} facts collected`);

  step("Aggregating candidates");
  const candidates = aggregate();
  done(`aggregated: ${Object.keys(candidates).join(", ")}`);

  step("Synthesizing final answer (LLM)");
  const answer = await synthesize(candidates);
  done(`answer: ${JSON.stringify(answer)}`);

  await dumpBreakdown();
  console.log(chalk.gray(`  Total cost: $${getTotalCost().toFixed(5)}`));

  console.log("\n" + chalk.cyan("─".repeat(W)));
  console.log(chalk.cyan.bold("  TRANSMIT"));
  console.log(chalk.cyan("─".repeat(W)) + "\n");

  await verifyAnswer(answer);
}

main().catch((err) => {
  console.error(
    chalk.red(
      "\n✗ " + (err instanceof Error ? err.stack ?? err.message : String(err))
    )
  );
  process.exit(1);
});
