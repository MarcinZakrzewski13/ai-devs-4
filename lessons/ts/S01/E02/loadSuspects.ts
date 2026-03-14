import fs from "fs";
import path from "path";
import chalk from "chalk";
import type { Suspect } from "./types.ts";

type S01E01AnswerFile = {
  episodeId: string;
  task: string;
  answer: Array<{ name: string; surname: string; born: number }>;
};

/** Path to S01E01 final answer (root answers/final/). */
const S01E01_PATH = path.resolve(
  import.meta.dir,
  "../../../../answers/final/S01E01-people.json"
);

/**
 * Loads suspects from S01E01 final answer.
 * Uses name, surname, born (birth year) for findhim.
 */
export function loadSuspects(): Suspect[] {
  const raw = JSON.parse(
    fs.readFileSync(S01E01_PATH, "utf-8")
  ) as S01E01AnswerFile;

  const suspects = raw.answer.map((p) => ({
    name: p.name,
    surname: p.surname,
    born: p.born,
  }));

  console.log(chalk.blue(`[loadSuspects] Loaded ${suspects.length} suspects from S01E01`));
  return suspects;
}
