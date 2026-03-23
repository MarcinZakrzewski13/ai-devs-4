import { sendAnswer, saveTmpAnswer, saveFinalAnswer } from "@ai-devs/ai-devs-hub";

const EPISODE_ID = "S03E01";
const TASK = "evaluation";

export async function verifyAnswer(recheck: string[]): Promise<void> {
  const answer = { recheck };
  await saveTmpAnswer(EPISODE_ID, TASK, answer);
  const response = await sendAnswer(TASK, answer);
  if (response.code === 0 || response.message?.includes("{FLG:")) {
    await saveFinalAnswer(EPISODE_ID, TASK, answer, response);
  }
}
