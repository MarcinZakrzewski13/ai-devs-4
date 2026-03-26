import chalk from "chalk";
import type { ModelProvider } from "@ai-devs/ai-core";
import type { CsvData, ToolRequest, ToolResponse } from "./types.ts";
import { runGuard } from "./guard.ts";
import { normalizeSearchQuery } from "./normalizer.ts";
import { searchItems } from "./search-engine.ts";

export async function handleSearchItems(
  body: ToolRequest,
  provider: ModelProvider,
  data: CsvData,
): Promise<ToolResponse> {
  const query = body.params;
  console.log(chalk.magenta(`\n[search-items] ← "${query}"`));

  // Step 1: Guard
  const guard = await runGuard(provider, query, "Product catalog search by name or description");
  if (!guard.allowed) {
    console.log(chalk.red(`[search-items] Rejected: ${guard.reason}`));
    return { output: `Request rejected: ${guard.reason}` };
  }

  // Step 2: Normalize
  const norm = await normalizeSearchQuery(provider, query);

  // Step 3: Search
  const result = searchItems(data, norm);
  console.log(chalk.green(`[search-items] → "${result.slice(0, 100)}..."`));

  return { output: result };
}
