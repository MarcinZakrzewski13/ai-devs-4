// Modele uzyte w zadaniu:
//   - brak (kompresja deterministyczna)

import "dotenv/config";
import chalk from "chalk";
import { fetchLogs } from "./fetch-logs";
import { parseLogs } from "./parse-logs";
import { filterLogs, deduplicateLogs } from "./filter-logs";
import { formatLogs } from "./format-logs";
import { countTokens } from "./count-tokens";
import { compressLogs } from "./compress-logs";
import { sendAndIterate } from "./send-and-iterate";

// Hub uses different tokenizer, so we target 1350 to have margin
const TOKEN_LIMIT = 1350;
const MAX_ITERATIONS = 5;

async function main() {
  // 1. Fetch raw logs
  const raw = await fetchLogs();

  // 2. Parse
  const allEntries = parseLogs(raw);

  // 3. Iteration loop
  let requiredSubsystems: string[] = [];

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    console.log(chalk.cyan(`\n=== Iteration ${i + 1} ===`));

    // Filter and deduplicate
    const filtered = filterLogs(
      allEntries,
      requiredSubsystems.length > 0 ? requiredSubsystems : undefined,
    );
    const deduped = deduplicateLogs(filtered);
    console.log(chalk.gray(`Filtered: ${filtered.length}, deduplicated: ${deduped.length}`));

    // Compress (handles shortening + dropping low-priority entries to fit)
    const entries = compressLogs(deduped, TOKEN_LIMIT);
    const formatted = formatLogs(entries);
    const tokens = countTokens(formatted);
    console.log(chalk.gray(`Final token count: ${tokens}, entries: ${entries.length}`));

    // Send
    const result = await sendAndIterate(formatted);

    if (result.flag) {
      console.log(chalk.green("\nDone!"));
      return;
    }

    // Accumulate missing subsystems for next iteration
    if (result.missingSubsystems) {
      for (const s of result.missingSubsystems) {
        if (!requiredSubsystems.includes(s)) {
          requiredSubsystems.push(s);
        }
      }
    }
  }

  console.log(chalk.red("Max iterations reached without flag."));
}

main().catch(console.error);
