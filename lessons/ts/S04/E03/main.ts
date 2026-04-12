// Modele użyte w zadaniu:
//   - gpt-5-mini → agent loop: taktyczna ewakuacja z ruin Domatowa (tool calling)

import "dotenv/config";
import chalk from "chalk";
import { callDomatowo } from "./domatowo-api";
import { analyzeMap } from "./map-analysis";
import { buildSystemPrompt } from "./system-prompt";
import { allTools } from "./tools";
import { runAgentLoop } from "./agent-loop";
import type { TileType } from "./types";

const W = 58;
const BORDER = chalk.cyan("═".repeat(W));

const step = (label: string) =>
  console.log(chalk.cyan("  ◆ ") + chalk.white(label) + chalk.gray("..."));

const done = (label: string) =>
  console.log(chalk.green("  ✓ ") + chalk.gray(label));

const main = async () => {
  console.log("\n" + BORDER);
  console.log(
    chalk.cyan.bold(
      "  OPERACJA DOMATOWO — Ewakuacja partyzanta".padEnd(W - 2)
    )
  );
  console.log(chalk.gray("  Taktyczny agent AI (gpt-5-mini) · max 100 iteracji"));
  console.log(BORDER + "\n");

  step("Pobieranie mapy terenu z centrali");
  const mapData = (await callDomatowo({ action: "getMap" })) as {
    map: { size: number; grid: TileType[][] };
  };
  const parsedMap = analyzeMap(mapData.map.grid, mapData.map.size);
  done(`Mapa ${parsedMap.size}×${parsedMap.size} załadowana · ${parsedMap.b3Tiles.length} pól B3`);

  console.log(chalk.gray(parsedMap.asciiMap));
  console.log(
    chalk.gray("  Cele B3: ") + chalk.white(parsedMap.b3Tiles.join(", ")) + "\n"
  );

  step("Reset planszy");
  await callDomatowo({ action: "reset" });
  done("Plansza zresetowana · budżet 300 pkt akcji");

  step("Budowanie systemu promptu dla agenta");
  const systemPrompt = buildSystemPrompt(parsedMap);
  done("System prompt gotowy");

  console.log("\n" + chalk.cyan("─".repeat(W)));
  console.log(chalk.cyan.bold("  AGENT STARTUJE"));
  console.log(chalk.cyan("─".repeat(W)) + "\n");

  const result = await runAgentLoop(
    allTools,
    systemPrompt,
    "Execute the evacuation plan. " +
      "Create units, move them to cover all B3 clusters, inspect each B3 tile, " +
      "and call the helicopter as soon as a scout finds the partisan.",
    "gpt-5-mini",
    100
  );

  console.log("\n" + BORDER);
  if (result.finished) {
    console.log(chalk.bgGreen.black.bold("  MISJA ZAKOŃCZONA SUKCESEM".padEnd(W)));
    console.log(chalk.green(`  ${result.summary}`));
  } else {
    console.log(chalk.bgRed.white.bold("  MISJA NIEUDANA".padEnd(W)));
    console.log(chalk.red(`  ${result.summary}`));
  }
  console.log(BORDER + "\n");

  if (!result.finished) process.exit(1);
};

main().catch((err) => {
  console.error(chalk.red("\n  BŁĄD KRYTYCZNY:"), err);
  process.exit(1);
});
