import chalk from "chalk";
import type { ModelProvider } from "@ai-devs/ai-core";
import type { CsvData, ToolRequest, ToolResponse } from "./types.ts";
import { runGuard } from "./guard.ts";
import { normalizeCitiesQuery } from "./normalizer.ts";
import { findCities } from "./search-engine.ts";

export async function handleFindCities(
  body: ToolRequest,
  provider: ModelProvider,
  data: CsvData,
): Promise<ToolResponse> {
  const query = body.params;
  console.log(chalk.magenta(`\n[find-cities] ← "${query}"`));

  // Step 1: Guard
  const guard = await runGuard(provider, query, "Find cities selling a specific product by code");
  if (!guard.allowed) {
    console.log(chalk.red(`[find-cities] Rejected: ${guard.reason}`));
    return { output: `Request rejected: ${guard.reason}` };
  }

  // Step 2: Normalize
  const norm = await normalizeCitiesQuery(provider, query);

  // Step 3: Lookup
  const result = findCities(data, norm);
  console.log(chalk.green(`[find-cities] → "${result.slice(0, 100)}..."`));

  return { output: result };
}
