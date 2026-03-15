/**
 * Wysyła deklarację do Hub i zapisuje odpowiedzi (tmp przed, final po fladze).
 */

import {
  sendAnswer,
  saveTmpAnswer,
  saveFinalAnswer,
} from "@ai-devs/ai-devs-hub";

const EPISODE_ID = "S01E04";
const TASK = "sendit";

/**
 * Wysyła deklarację do /verify, zapisuje tmp przed wysłaniem i final po potwierdzeniu flagi.
 */
export async function verifyAnswer(declaration: string): Promise<void> {
  const answer = { declaration };
  await saveTmpAnswer(EPISODE_ID, TASK, answer);
  const response = await sendAnswer(TASK, answer);
  if (response.code === 0 || response.message?.includes("{FLG:")) {
    await saveFinalAnswer(EPISODE_ID, TASK, answer, response);
  }
}
