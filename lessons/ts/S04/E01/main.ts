// Modele uzyte w zadaniu:
//   - gpt-5-mini → agent loop: API discovery + CRUD operations on OKO system

import chalk from "chalk";
import { allTools } from "./tools";
import { buildSystemPrompt } from "./system-prompt";
import { runAgentLoop } from "./agent-loop";

const main = async () => {
  console.log(chalk.cyan("[main] Starting OKO editor agent..."));

  const systemPrompt = buildSystemPrompt();
  const userMessage =
    "Discover the OKO API and execute all required modifications. Start by calling help.";

  const result = await runAgentLoop(
    allTools,
    systemPrompt,
    userMessage,
    "gpt-5-mini",
    30
  );

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
