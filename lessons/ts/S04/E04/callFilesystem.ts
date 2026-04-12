// Wysyłka operacji do API filesystem.
//
// Dwa wywołania:
//   1. batch: tablica createDirectory/createFile/reset operacji
//   2. done: osobny request (not in batch_mode allowed_actions)
//
// Używamy sendAnswer z @ai-devs/ai-devs-hub.

import chalk from "chalk";
import { sendAnswer } from "@ai-devs/ai-devs-hub";
import type { BatchOp } from "./buildOps.ts";
import type { ApiResponse } from "./types.ts";

const TASK = "filesystem";

type BatchResult = { index: number; code: number; message: string; path?: string };

export async function sendBatch(ops: BatchOp[]): Promise<ApiResponse> {
  console.log(chalk.gray(`  → batch: ${ops.length} ops`));
  const response = (await sendAnswer(TASK, ops)) as unknown as ApiResponse & {
    results?: BatchResult[];
  };
  console.log(chalk.gray(`  ← code=${response.code} ${response.message ?? ""}`));
  // API zwraca code=100 ("Batch actions executed.") jako status wrappera.
  // Sukces batcha = brak błędnych inner-ops (code < 0 lub >= 400).
  const results = response.results ?? [];
  const failed = results.filter((r) => r.code < 0 || r.code >= 400);
  if (failed.length > 0) {
    throw new Error(`Batch had ${failed.length} failing ops: ${JSON.stringify(failed)}`);
  }
  if (response.code !== 0 && response.code !== 100) {
    throw new Error(`Unexpected batch response code: ${JSON.stringify(response)}`);
  }
  return response;
}

export async function sendDone(): Promise<ApiResponse> {
  console.log(chalk.gray("  → done"));
  const response = (await sendAnswer(TASK, { action: "done" })) as unknown as ApiResponse;
  console.log(chalk.gray(`  ← code=${response.code} ${response.message ?? ""}`));
  return response;
}
