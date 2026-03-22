// Modele uzyte w zadaniu:
//   - google/gemini-3-flash-preview → agent loop: przeszukiwanie skrzynki mailowej i ekstrakcja danych

import chalk from "chalk";
import { allTools } from "./tools.ts";
import { buildSystemPrompt } from "./system-prompt.ts";
import { runMailboxAgent } from "./agent-loop.ts";

const main = async () => {
  console.log(chalk.cyan("[main] Starting mailbox agent..."));

  const systemPrompt = buildSystemPrompt();
  const result = await runMailboxAgent(allTools, systemPrompt);

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
