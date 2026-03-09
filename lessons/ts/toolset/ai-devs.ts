import chalk from "chalk";

const HUB_URL = "https://hub.ag3nts.org/verify";

type AiDevsResponse = {
  code: number;
  message: string;
  error?: string;
  flag?: string;
};

/**
 * Sends an answer to the AI Devs hub and prints the result (flag or error).
 * @param task - Task name (e.g. "people")
 * @param answer - Answer in the format required by the task
 * @returns Parsed response from the hub
 */
export const sendAnswer = async (
  task: string,
  answer: unknown
): Promise<AiDevsResponse> => {
  const apikey = process.env.API_KEY_AI_DEVS4;
  if (!apikey) {
    throw new Error("API_KEY_AI_DEVS4 is not set in .env");
  }

  const payload = { apikey, task, answer };

  console.log(chalk.cyan(`\n→ Sending answer for task: ${chalk.bold(task)}`));
  console.log(chalk.gray("  Payload:"), JSON.stringify(payload, null, 2));

  const res = await fetch(HUB_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = (await res.json()) as AiDevsResponse;

  console.log(chalk.gray("\n← Response:"), JSON.stringify(data, null, 2));

  // code === 0 means success; negative codes are errors
  if (data.code === 0 || data.message?.includes("{FLG:")) {
    const flag = data.flag ?? data.message?.match(/\{FLG:[^}]+\}/)?.[0];
    console.log(chalk.green(`\n✓ Flag captured: ${chalk.bold(flag ?? data.message)}`));
  } else {
    console.log(
      chalk.red(`\n✗ Error [${data.code}]: ${data.message ?? data.error}`)
    );
  }

  return data;
};
