import chalk from "chalk";
import type { ShellResponse } from "./types.ts";

const SHELL_URL = "https://hub.ag3nts.org/api/shell";
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const execShell = async (cmd: string): Promise<ShellResponse> => {
  const apiKey = process.env.API_KEY_AI_DEVS4;
  if (!apiKey) throw new Error("API_KEY_AI_DEVS4 not set");

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(SHELL_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apikey: apiKey, cmd }),
      });

      if (res.status === 429) {
        const retryAfter = parseInt(res.headers.get("retry-after") ?? "5", 10);
        console.log(chalk.yellow(`[shell] Rate limit, waiting ${retryAfter}s...`));
        await sleep(retryAfter * 1000);
        continue;
      }

      if (res.status === 503) {
        console.log(chalk.yellow(`[shell] 503, retrying in ${RETRY_DELAY_MS}ms...`));
        await sleep(RETRY_DELAY_MS);
        continue;
      }

      const data = (await res.json()) as ShellResponse;

      // Detect ban
      if (
        data.error &&
        (data.error.includes("ban") || data.error.includes("blocked"))
      ) {
        const seconds = data.error.match(/(\d+)\s*s/)?.[1];
        const waitSec = seconds ? parseInt(seconds, 10) : 30;
        console.log(chalk.red(`[shell] Banned for ${waitSec}s, waiting...`));
        await sleep(waitSec * 1000);
        continue;
      }

      return data;
    } catch (e) {
      if (attempt < MAX_RETRIES - 1) {
        console.log(chalk.yellow(`[shell] Network error, retrying...`));
        await sleep(RETRY_DELAY_MS);
        continue;
      }
      throw e;
    }
  }

  return { error: "Max retries exceeded" };
};
