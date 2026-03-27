// Modele użyte w zadaniu:
//   - gpt-5-mini → discovery agent (API exploration + knowledge building)
//   - gpt-5-mini → route planner agent (vehicle selection + pathfinding + submission)

import { config } from "dotenv";
config();

import chalk from "chalk";
import { createKnowledgeBase } from "./knowledge-base";
import { runDiscoveryAgent } from "./discovery-agent";
import {
  parseMapFromKnowledge,
  parseVehiclesFromKnowledge,
} from "./parse-knowledge";
import { runRoutePlanner } from "./route-planner";

async function run() {
  console.log(
    chalk.bold.blue("=== S03E05: Save Them — LLM Agent Route Planner ===\n")
  );

  // Phase 1: Discovery — LLM agent explores APIs and builds knowledge base
  const kb = createKnowledgeBase();
  await runDiscoveryAgent(kb);

  // Phase 2: Parse structured data from knowledge base
  console.log(chalk.bold.magenta("\n=== Phase 2: Knowledge Extraction ===\n"));
  const map = parseMapFromKnowledge(kb);
  const vehicles = parseVehiclesFromKnowledge(kb);

  // Phase 3: Route planning — LLM agent decides vehicle + route, submits answers
  await runRoutePlanner(kb, map, vehicles);

  console.log(chalk.bold.blue("\n=== Done ==="));
}

run().catch((e) => {
  console.error(chalk.red(e));
  process.exit(1);
});
