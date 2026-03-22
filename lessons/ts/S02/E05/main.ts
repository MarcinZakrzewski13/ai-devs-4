// Modele uzyte w zadaniu:
//   - gpt-5.4 → Vision: analiza mapy terenu, identyfikacja sektora tamy

import chalk from "chalk";
import { analyzeMap } from "./analyze-map.ts";
import { buildInstructions } from "./build-instructions.ts";
import { submitMission } from "./submit-mission.ts";

const main = async () => {
  console.log(chalk.cyan("[main] S02E05 — Drone mission planner"));

  // Step 1: Analyze map (vision) — cached after first run
  const damSector = await analyzeMap();
  console.log(chalk.cyan(`[main] Dam sector: column=${damSector.column}, row=${damSector.row}`));

  // Step 2: Build instructions
  const instructions = buildInstructions(damSector);
  console.log(chalk.cyan(`[main] Built ${instructions.length} instructions`));

  // Step 3: Submit mission
  const result = await submitMission(instructions);

  if (result.success) {
    console.log(chalk.green(`[main] Mission successful! Flag: ${result.flag}`));
  } else {
    console.log(chalk.red(`[main] Mission failed: ${result.message}`));
    console.log(chalk.yellow("[main] Review the error message and adjust build-instructions.ts or analyze-map.ts"));
    process.exit(1);
  }
};

main().catch((err) => {
  console.error(chalk.red("[main] Fatal error:"), err);
  process.exit(1);
});
