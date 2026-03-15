import chalk from "chalk";
import { loadFinalAnswer } from "@ai-devs/ai-devs-hub";
import type { Suspect } from "./types.ts";

/**
 * Loads suspects from S01E01 final answer via loadFinalAnswer().
 * Uses name, surname, born (birth year) for findhim.
 */
export async function loadSuspects(): Promise<Suspect[]> {
  const result = await loadFinalAnswer("S01E01", "people");
  if (!result) {
    throw new Error("S01E01 final answer not found — run S01E01 first");
  }

  const answer = result.answer as Array<{ name: string; surname: string; born: number }>;
  const suspects = answer.map((p) => ({
    name: p.name,
    surname: p.surname,
    born: p.born,
  }));

  console.log(chalk.blue(`[loadSuspects] Loaded ${suspects.length} suspects from S01E01`));
  return suspects;
}
