import path from "path";
import type { FinalAnswerFile } from "./types.ts";

const ANSWERS_FINAL_DIR = path.resolve(import.meta.dir, "../../answers/final");

/**
 * Loads a final answer file by episodeId and task.
 * @returns Parsed FinalAnswerFile or null if not found
 */
export const loadFinalAnswer = async (
  episodeId: string,
  task: string
): Promise<FinalAnswerFile | null> => {
  const filename = `${episodeId}-${task}.json`;
  const filePath = path.join(ANSWERS_FINAL_DIR, filename);

  const file = Bun.file(filePath);
  if (!(await file.exists())) return null;

  return (await file.json()) as FinalAnswerFile;
};

/**
 * Loads all final answer files from answers/final/.
 * @returns Array of FinalAnswerFile objects
 */
export const loadAllFinalAnswers = async (): Promise<FinalAnswerFile[]> => {
  const glob = new Bun.Glob("*.json");
  const files: FinalAnswerFile[] = [];

  for await (const filename of glob.scan(ANSWERS_FINAL_DIR)) {
    const filePath = path.join(ANSWERS_FINAL_DIR, filename);
    const file = Bun.file(filePath);
    files.push((await file.json()) as FinalAnswerFile);
  }

  return files;
};
