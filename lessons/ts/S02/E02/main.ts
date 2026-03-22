// Modele uzyte w zadaniu:
//   - brak (detekcja kabli algorytmicznie przez analize pikseli)

import "dotenv/config";
import chalk from "chalk";
import { fetchCurrentBoard } from "./fetch-board.ts";
import { detectCables } from "./detect-cables.ts";
import { computeRotations } from "./compute-rotations.ts";
import { executeRotations } from "./execute-rotations.ts";
import { TARGET_STATE } from "./target-state.ts";

const MAX_ATTEMPTS = 3;

async function main() {
  console.log(chalk.bold.cyan("\n=== S02E02: Electricity (cable rotation puzzle) ===\n"));

  console.log(chalk.cyan("Target state (hardcoded from pixel analysis):"));
  for (let r = 1; r <= 3; r++) {
    const row = [1, 2, 3].map((c) => (TARGET_STATE[`${r}x${c}`] ?? "?").padEnd(5)).join(" | ");
    console.log(chalk.white(`  ${row}`));
  }

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    console.log(chalk.bold.cyan(`\n--- Attempt ${attempt}/${MAX_ATTEMPTS} ---`));

    // Reset on first attempt, just re-fetch on retries
    const currentPng = await fetchCurrentBoard(attempt === 1);

    console.log(chalk.cyan("\n--- Detecting current board cables ---"));
    const currentState = await detectCables(currentPng);

    // Compute rotations
    let plan;
    try {
      plan = computeRotations(currentState, TARGET_STATE);
    } catch (err) {
      console.log(chalk.red(`[main] Rotation computation failed: ${err}`));
      if (attempt < MAX_ATTEMPTS) {
        console.log(chalk.yellow("[main] Retrying..."));
        continue;
      }
      throw err;
    }

    if (plan.length === 0) {
      console.log(chalk.green("[main] Board already matches target!"));
    }

    // Execute rotations
    const result = await executeRotations(plan);
    if (result) {
      console.log(chalk.bgGreen.black("\n SUCCESS! Flag received. \n"));
      return;
    }

    // No flag — re-fetch and retry
    if (attempt < MAX_ATTEMPTS) {
      console.log(chalk.yellow("[main] No flag received. Will re-analyze board..."));
    }
  }

  console.log(chalk.red("\n[main] Max attempts reached without flag. Check detection accuracy."));
}

main().catch((err) => {
  console.error(chalk.red("[main] Fatal error:"), err);
  process.exit(1);
});
