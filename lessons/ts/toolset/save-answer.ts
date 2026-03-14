import type { AiDevsResponse } from "./ai-devs.ts";
import chalk from "chalk";
import path from "path";

const ANSWERS_DIR = path.resolve(import.meta.dir, "../../answers");

export type FinalAnswerFile = {
  episodeId: string;
  task: string;
  computedAt: string;
  confirmedAt: string;
  flag: string | null;
  answer: unknown;
  hubResponse: AiDevsResponse;
};

/**
 * Saves answer to answers/tmp/{episodeId}-{task}-{timestamp}.json
 * @returns Path to the saved file
 */
export const saveTmpAnswer = async (
  episodeId: string,
  task: string,
  answer: unknown
): Promise<string> => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `${episodeId}-${task}-${timestamp}.json`;
  const filePath = path.join(ANSWERS_DIR, "tmp", filename);

  const content = JSON.stringify({ episodeId, task, computedAt: new Date().toISOString(), answer }, null, 2);
  await Bun.write(filePath, content);

  console.log(chalk.gray(`  [save-answer] tmp → ${filePath}`));
  return filePath;
};

/**
 * Saves answer to answers/final/{episodeId}-{task}.json (overwrites on re-run).
 * Does NOT include apikey.
 * @returns Path to the saved file
 */
export const saveFinalAnswer = async (
  episodeId: string,
  task: string,
  answer: unknown,
  response: AiDevsResponse
): Promise<string> => {
  const now = new Date().toISOString();
  const flag = response.flag ?? response.message?.match(/\{FLG:[^}]+\}/)?.[0] ?? null;

  const data: FinalAnswerFile = {
    episodeId,
    task,
    computedAt: now,
    confirmedAt: now,
    flag,
    answer,
    hubResponse: response,
  };

  const filename = `${episodeId}-${task}.json`;
  const filePath = path.join(ANSWERS_DIR, "final", filename);

  await Bun.write(filePath, JSON.stringify(data, null, 2));

  console.log(chalk.green(`  [save-answer] final → ${filePath}`));
  return filePath;
};
