// Modele uzyte w zadaniu:
//   - anthropic/claude-sonnet-4-6 → agent loop: debugowanie firmware na VM przez Shell API

import chalk from "chalk";
import { allTools } from "./tools.ts";
import { buildSystemPrompt } from "./system-prompt.ts";
import { runFirmwareAgent } from "./agent-loop.ts";

const main = async () => {
  console.log(chalk.cyan("[main] Starting firmware agent..."));

  const systemPrompt = buildSystemPrompt();
  const result = await runFirmwareAgent(allTools, systemPrompt);

  console.log(chalk.cyan(`[main] Agent finished: ${result.summary}`));

  if (!result.finished) {
    console.log(chalk.red("[main] Agent did not finish successfully"));
    process.exit(1);
  }
};

main().catch((err) => {
  console.error(chalk.red("[main] Fatal error:"), err);
  process.exit(1);
});
