import { sendAnswer } from "../../toolset/ai-devs.ts";
import type { PersonAnswer } from "./types.ts";

/** Sends the final answer to hub.ag3nts.org and logs the result. */
export async function verifyAnswer(answer: PersonAnswer[]): Promise<void> {
  await sendAnswer("people", answer);
}
