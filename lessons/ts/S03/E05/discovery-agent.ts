import chalk from "chalk";
import { runAgentLoop } from "./agent-loop";
import { apiCallTool } from "./tools/api-call";
import { createSaveKnowledgeTool } from "./tools/save-knowledge";
import { finishTool } from "./tools/finish-tool";
import {
  DISCOVERY_SYSTEM_PROMPT,
  DISCOVERY_USER_MESSAGE,
} from "./prompts/discovery-prompt";
import type { KnowledgeBase } from "./types";

export async function runDiscoveryAgent(
  kb: KnowledgeBase
): Promise<void> {
  console.log(chalk.bold.magenta("\n=== Phase 1: API Discovery Agent ===\n"));

  const tools = [apiCallTool, createSaveKnowledgeTool(kb), finishTool];

  const result = await runAgentLoop(
    tools,
    DISCOVERY_SYSTEM_PROMPT,
    DISCOVERY_USER_MESSAGE,
    "gpt-5-mini",
    35
  );

  console.log(chalk.magenta(`\n[discovery] ${result.summary}`));
  console.log(
    chalk.magenta(
      `[discovery] Knowledge entries: ` +
        `endpoints=${kb.endpoints.length}, ` +
        `map=${kb.map.length}, ` +
        `vehicles=${kb.vehicles.length}, ` +
        `terrain=${kb.terrainRules.length}, ` +
        `other=${kb.other.length}`
    )
  );
}
