import chalk from "chalk";
import type { AiDevsResponse } from "@ai-devs/ai-devs-hub";
import type { ShellResult } from "./types.ts";

const HUB_URL = "https://hub.ag3nts.org/verify";
const TASK = "shellaccess";
const MAX_RETRIES = 4;
const RETRY_DELAY_MS = 2500;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Runs a shell command on the remote server via the hub /verify endpoint.
 * The hub echoes the command's stdout; if the printed JSON is correct it also
 * returns the flag in the same response — there is no separate submit step.
 */
export const execCmd = async (cmd: string): Promise<ShellResult> => {
  const apikey = process.env.API_KEY_AI_DEVS4;
  if (!apikey) throw new Error("API_KEY_AI_DEVS4 is not set in .env");

  const payload = { apikey, task: TASK, answer: { cmd } };

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(HUB_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.status === 429 || res.status === 503 || res.status === 520) {
        const wait = parseInt(res.headers.get("retry-after") ?? "", 10);
        const ms = Number.isFinite(wait) ? wait * 1000 : RETRY_DELAY_MS;
        console.log(chalk.yellow(`[shell] HTTP ${res.status}, retry in ${ms}ms...`));
        await sleep(ms);
        continue;
      }

      const text = await res.text();
      let data: AiDevsResponse & { output?: string };
      try {
        data = JSON.parse(text);
      } catch {
        // Cloudflare / non-JSON body — retry
        console.log(chalk.yellow(`[shell] Non-JSON response, retrying...`));
        await sleep(RETRY_DELAY_MS);
        continue;
      }

      const output =
        data.output ?? data.message ?? (data.error ? `ERROR: ${data.error}` : "");
      const flag =
        data.flag ??
        (typeof data.message === "string"
          ? data.message.match(/\{FLG:[^}]+\}/)?.[0]
          : undefined) ??
        output.match(/\{FLG:[^}]+\}/)?.[0];

      return { output, flag, raw: data };
    } catch (e) {
      if (attempt < MAX_RETRIES - 1) {
        console.log(chalk.yellow(`[shell] Network error, retrying...`));
        await sleep(RETRY_DELAY_MS);
        continue;
      }
      throw e;
    }
  }

  return { output: "ERROR: max retries exceeded", raw: null };
};
