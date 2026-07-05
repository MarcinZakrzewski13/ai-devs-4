// Modele uzyte w zadaniu:
//   - anthropic/claude-sonnet-4-6 → agent loop: eksploracja zdalnego serwera przez Shell API,
//     analiza logow (grep/jq), JOIN po plikach, arytmetyka dat (dzien przed)

import chalk from "chalk";
import { allTools } from "./tools.ts";
import { buildSystemPrompt } from "./system-prompt.ts";
import { runShellAgent } from "./agent-loop.ts";

const W = 58;
const BORDER = chalk.cyan("═".repeat(W));

const main = async () => {
  console.log("\n" + BORDER);
  console.log(chalk.cyan.bold("  S05E03 — SHELLACCESS".padEnd(W - 2)));
  console.log(chalk.gray("  Agent: claude-sonnet-4-6 · shell przez hub /verify"));
  console.log(chalk.gray("  Cel: data/miasto/wsp. Rafala → dzien PRZED"));
  console.log(BORDER + "\n");

  console.log("\n" + chalk.cyan("─".repeat(W)));
  console.log(chalk.cyan.bold("  AGENT STARTUJE"));
  console.log(chalk.cyan("─".repeat(W)));

  const result = await runShellAgent(allTools, buildSystemPrompt());

  console.log("\n" + BORDER);
  if (result.finished && result.flag) {
    console.log(chalk.bgGreen.black.bold(`  🎯 ${result.flag}`));
    console.log(chalk.gray(`  ${result.summary}`));
    console.log(BORDER + "\n");
    return;
  }

  console.log(chalk.bgRed.white.bold("  ✗ MISJA NIEUDANA"));
  console.log(chalk.gray(`  ${result.summary}`));
  console.log(BORDER + "\n");
  process.exit(1);
};

main().catch((err) => {
  console.error(chalk.red("[main] Fatal error:"), err);
  process.exit(1);
});
