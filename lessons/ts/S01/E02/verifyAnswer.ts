import { sendAnswer, saveTmpAnswer, saveFinalAnswer } from "@ai-devs/ai-devs-hub";
import type { FindhimAnswer } from "./types.ts";

const EPISODE_ID = "S01E02";
const TASK = "findhim";

/** Sends the final answer to hub.ag3nts.org, saves tmp before and final after flag. */
export async function verifyAnswer(answer: FindhimAnswer): Promise<void> {
  await saveTmpAnswer(EPISODE_ID, TASK, answer);
  const response = await sendAnswer(TASK, answer);
  if (response.code === 0 || response.message?.includes("{FLG:")) {
    await saveFinalAnswer(EPISODE_ID, TASK, answer, response);
  }
}
