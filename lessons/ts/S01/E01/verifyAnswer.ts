import { sendAnswer, saveTmpAnswer, saveFinalAnswer } from "@ai-devs/ai-devs-hub";
import type { PersonAnswer } from "./types.ts";

const EPISODE_ID = "S01E01";
const TASK = "people";

/** Sends the final answer to hub.ag3nts.org, saves tmp before and final after flag. */
export async function verifyAnswer(answer: PersonAnswer[]): Promise<void> {
  await saveTmpAnswer(EPISODE_ID, TASK, answer);
  const response = await sendAnswer(TASK, answer);
  if (response.code === 0 || response.message?.includes("{FLG:")) {
    await saveFinalAnswer(EPISODE_ID, TASK, answer, response);
  }
}
