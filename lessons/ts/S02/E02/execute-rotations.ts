import chalk from "chalk";
import { sendAnswer, saveTmpAnswer, saveFinalAnswer } from "@ai-devs/ai-devs-hub";
import type { AiDevsResponse } from "@ai-devs/ai-devs-hub";
import type { RotationPlan } from "./types.ts";

const TASK = "electricity";
const EPISODE_ID = "S02E02";

/**
 * Sends rotation commands to the hub sequentially.
 * Returns the response containing the flag, or null if no flag received.
 */
export async function executeRotations(plan: RotationPlan): Promise<AiDevsResponse | null> {
  const totalCalls = plan.reduce((sum, s) => sum + s.rotations, 0);
  console.log(chalk.cyan(`[executeRotations] Sending ${totalCalls} rotation(s) for ${plan.length} cell(s)...`));

  let callNum = 0;

  for (const { cell, rotations } of plan) {
    for (let i = 0; i < rotations; i++) {
      callNum++;
      console.log(chalk.gray(`  [${callNum}/${totalCalls}] Rotating ${cell}...`));

      const answer = { rotate: cell };
      await saveTmpAnswer(EPISODE_ID, TASK, answer);

      const response = await sendAnswer(TASK, answer);

      // Check for flag
      const flag = response.flag ?? response.message?.match(/\{FLG:[^}]+\}/)?.[0];
      if (flag) {
        console.log(chalk.bgGreen.black(` FLAG: ${flag} `));
        await saveFinalAnswer(EPISODE_ID, TASK, answer, response);
        return response;
      }
    }
  }

  console.log(chalk.yellow("[executeRotations] All rotations sent, no flag yet."));
  return null;
}
