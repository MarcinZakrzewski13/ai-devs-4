// Modele użyte w zadaniu:
//   - anthropic/claude-sonnet-4-6 → agent loop (multi-tool orchestration: SQLite, CRUD orders, SHA1)
//
// Zadanie S04E05 "foodwarehouse": przygotowanie zamówień magazynowych dla miast
// z food4cities.json. Agent odkrywa schemat SQLite, koreluje destination/creatorID,
// generuje podpisy SHA1 przez API i tworzy kompletne zamówienia dla każdego miasta.

import "dotenv/config";
import chalk from "chalk";
import { saveFinalAnswer } from "@ai-devs/ai-devs-hub";
import { loadCities } from "./loadCities.ts";
import { buildSystemPrompt, buildUserMessage } from "./systemPrompt.ts";
import { runAgentLoop } from "./agentLoop.ts";
import { allTools } from "./tools.ts";

const W = 58;
const BORDER = chalk.cyan("═".repeat(W));
const step = (label: string) =>
  console.log(chalk.cyan("  ◆ ") + chalk.white(label) + chalk.gray("..."));
const done = (label: string) =>
  console.log(chalk.green("  ✓ ") + chalk.gray(label));

async function main() {
  console.log("\n" + BORDER);
  console.log(chalk.cyan.bold("  S04E05 — FOODWAREHOUSE (zamówienia magazynowe)".padEnd(W - 2)));
  console.log(chalk.gray("  Model: anthropic/claude-sonnet-4-6 (agent loop)"));
  console.log(chalk.gray("  Tryb: multi-tool (SQLite + CRUD orders + SHA1)"));
  console.log(BORDER + "\n");

  step("Ładowanie zapotrzebowania miast (food4cities.json)");
  const cities = await loadCities();
  done(`załadowano ${cities.length} miast`);

  for (const city of cities) {
    const items = Object.entries(city.items)
      .map(([name, qty]) => `${name}: ${qty}`)
      .join(", ");
    console.log(chalk.gray(`  ${city.city.padEnd(20)} ${items}`));
  }

  console.log("\n" + chalk.cyan("─".repeat(W)));
  console.log(chalk.cyan.bold("  AGENT STARTUJE"));
  console.log(chalk.gray("  Faza 1: odkrycie schematu DB"));
  console.log(chalk.gray("  Faza 2: generowanie podpisów SHA1"));
  console.log(chalk.gray("  Faza 3: tworzenie i wypełnianie zamówień"));
  console.log(chalk.gray("  Faza 4: weryfikacja i done"));
  console.log(chalk.cyan("─".repeat(W)) + "\n");

  const systemPrompt = buildSystemPrompt(cities);
  const userMessage = buildUserMessage(cities);

  const result = await runAgentLoop(allTools, systemPrompt, userMessage);

  console.log("\n" + BORDER);
  if (result.finished && result.flag) {
    console.log(chalk.bgGreen.black.bold("  SUKCES — flaga odebrana".padEnd(W - 2)));
    console.log(chalk.bgYellow.black.bold(`  ${result.flag}`.padEnd(W - 2)));
    console.log(BORDER + "\n");

    await saveFinalAnswer(
      "S04E05",
      "foodwarehouse",
      { cities: cities.map((c) => c.city) },
      { code: 0, message: result.flag, flag: result.flag }
    );
  } else {
    console.log(chalk.bgRed.white.bold("  MISJA NIEUDANA".padEnd(W - 2)));
    console.log(chalk.gray(`  ${result.summary}`));
    console.log(BORDER + "\n");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(chalk.red("\n✗ Fatal error:"), err);
  process.exit(1);
});
