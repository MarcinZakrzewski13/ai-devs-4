import chalk from "chalk";
import { runAgentLoop } from "./agent-loop";
import { apiCallTool } from "./tools/api-call";
import { createBfsPathfinderTool } from "./tools/bfs-tool";
import { submitAnswerTool } from "./tools/submit-tool";
import { finishTool } from "./tools/finish-tool";
import {
  buildPlannerPrompt,
  PLANNER_USER_MESSAGE,
} from "./prompts/planner-prompt";
import { formatKnowledge } from "./knowledge-base";
import type { GameMap, KnowledgeBase, Vehicle } from "./types";

export async function runRoutePlanner(
  kb: KnowledgeBase,
  map: GameMap,
  vehicles: Vehicle[]
): Promise<void> {
  console.log(chalk.bold.magenta("\n=== Phase 3: Route Planner Agent ===\n"));

  const knowledge = formatKnowledge(kb);
  console.log(chalk.gray("[planner] Knowledge base injected into prompt:"));
  console.log(chalk.gray(knowledge.slice(0, 500) + "...\n"));

  const bfsTool = createBfsPathfinderTool(map, vehicles);
  const tools = [bfsTool, apiCallTool, submitAnswerTool, finishTool];

  const systemPrompt = buildPlannerPrompt(knowledge);

  const result = await runAgentLoop(
    tools,
    systemPrompt,
    PLANNER_USER_MESSAGE,
    "gpt-5-mini",
    20
  );

  console.log(chalk.magenta(`\n[planner] ${result.summary}`));
}
