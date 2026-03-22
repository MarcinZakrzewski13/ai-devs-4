import chalk from "chalk";
import { sendAnswer, saveTmpAnswer, saveFinalAnswer } from "@ai-devs/ai-devs-hub";
import type { MissionResult } from "./types.ts";

const MAX_RETRIES = 5;

export const submitMission = async (instructions: string[]): Promise<MissionResult> => {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    console.log(chalk.cyan(`\n[submit] Attempt ${attempt}/${MAX_RETRIES}`));
    console.log(chalk.gray(`[submit] Instructions: ${JSON.stringify(instructions)}`));

    const answer = { instructions };
    await saveTmpAnswer("S02E05", "drone", answer);
    const result = await sendAnswer("drone", answer);

    console.log(chalk.yellow(`[submit] Response: code=${result.code}, message=${result.message}`));

    if (result.code === 0 || result.message?.includes("{FLG:")) {
      console.log(chalk.bgGreen.black(`\n FLAG: ${result.message} \n`));
      await saveFinalAnswer("S02E05", "drone", answer, result);
      return { success: true, flag: result.message };
    }

    console.log(chalk.red(`[submit] Error: ${result.message}`));
    return { success: false, message: result.message };
  }

  return { success: false, message: "Max retries reached" };
};
