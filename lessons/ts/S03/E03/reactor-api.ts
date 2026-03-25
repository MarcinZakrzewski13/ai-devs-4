import chalk from "chalk";
import type { Command, ReactorResponse } from "./types";

const VERIFY_URL = "https://hub.ag3nts.org/verify";
const API_KEY = process.env.API_KEY_AI_DEVS4!;
const MAX_RETRIES = 3;

export async function sendCommand(command: Command): Promise<ReactorResponse> {
  const body = {
    apikey: API_KEY,
    task: "reactor",
    answer: { command },
  };

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const res = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.status === 429 || res.status === 503) {
      const wait = attempt * 1000 + 1000;
      console.log(chalk.yellow(`[retry] ${res.status}, waiting ${wait}ms...`));
      await Bun.sleep(wait);
      continue;
    }

    const data = (await res.json()) as ReactorResponse;
    console.log(chalk.cyan(`[cmd] ${command}`), chalk.gray(JSON.stringify(data).slice(0, 200)));
    return data;
  }

  throw new Error(`Failed after ${MAX_RETRIES} retries`);
}
