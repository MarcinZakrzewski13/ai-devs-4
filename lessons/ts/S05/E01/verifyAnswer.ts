import chalk from "chalk";
import { saveFinalAnswer, saveTmpAnswer } from "@ai-devs/ai-devs-hub";
import { transmit } from "./hubSession.ts";
import type { FinalAnswer } from "./types.ts";

const EPISODE_ID = "S05E01";
const TASK = "radiomonitoring";
const AREA_RE = /^\d+\.\d{2}$/;

export const verifyAnswer = async (answer: FinalAnswer): Promise<void> => {
  if (!AREA_RE.test(answer.cityArea)) {
    throw new Error(
      `cityArea format invalid: "${answer.cityArea}" — must match /^\\d+\\.\\d{2}$/`
    );
  }

  console.log(chalk.cyan("\n  ◆ Transmitting final answer..."));
  console.log(chalk.white("  " + JSON.stringify(answer, null, 2)));

  await saveTmpAnswer(EPISODE_ID, TASK, answer);

  const response = await transmit(answer);

  const flagMatch = JSON.stringify(response).match(/\{FLG:[^}]+\}/);
  if (flagMatch) {
    console.log(
      "\n" + chalk.bgYellow.black.bold("  🏁 FLAGA: " + flagMatch[0] + "  ") + "\n"
    );
  }

  if (response.code === 0 || flagMatch) {
    await saveFinalAnswer(EPISODE_ID, TASK, answer, response as any);
    console.log(chalk.green("  ✓ Final answer saved"));
  } else {
    console.log(
      chalk.bgRed.white.bold(
        `  ✗ TRANSMIT FAILED [${response.code}]: ${response.message}`
      )
    );
    process.exit(2);
  }
};
