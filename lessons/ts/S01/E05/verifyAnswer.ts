/**
 * Saves the railway flag after successful API interaction.
 */

import { saveTmpAnswer, saveFinalAnswer } from "@ai-devs/ai-devs-hub";
import type { RailwayResponse } from "./types.ts";

const EPISODE_ID = "S01E05";
const TASK = "railway";

/**
 * Saves flag from the railway API response.
 */
export async function saveRailwayFlag(
  answer: unknown,
  response: RailwayResponse
): Promise<void> {
  await saveTmpAnswer(EPISODE_ID, TASK, answer);
  if (response.code === 0 || JSON.stringify(response).includes("{FLG:")) {
    await saveFinalAnswer(EPISODE_ID, TASK, answer, response);
  }
}
