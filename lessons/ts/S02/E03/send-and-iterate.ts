import chalk from "chalk";
import { sendAnswer, saveTmpAnswer, saveFinalAnswer } from "@ai-devs/ai-devs-hub";
import type { IterationResult } from "./types";

const EPISODE_ID = "S02E03";
const TASK = "failure";

const SUBSYSTEM_RE = /[A-Z]{2,}[\d]+[A-Z]*/g;

export async function sendAndIterate(logs: string): Promise<IterationResult> {
  const answer = { logs };
  await saveTmpAnswer(EPISODE_ID, TASK, answer);

  console.log(chalk.blue("Sending answer to hub..."));
  const response = await sendAnswer(TASK, answer);
  console.log(chalk.gray(`Response code: ${response.code}`));
  console.log(chalk.gray(`Response message: ${response.message}`));

  const flag =
    response.flag ?? response.message?.match(/\{FLG:[^}]+\}/)?.[0];

  if (flag) {
    console.log(chalk.bgGreen.black(` FLAG: ${flag} `));
    await saveFinalAnswer(EPISODE_ID, TASK, answer, response);
    return { flag };
  }

  // Parse feedback for missing subsystem IDs
  const msg = response.message ?? "";
  const matches = msg.match(SUBSYSTEM_RE) ?? [];
  // Deduplicate
  const missing = [...new Set(matches)];

  if (missing.length > 0) {
    console.log(chalk.yellow(`Missing subsystems: ${missing.join(", ")}`));
  }

  return {
    feedback: msg,
    missingSubsystems: missing.length > 0 ? missing : undefined,
  };
}
