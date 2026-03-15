/**
 * Railway API client with retry on 503 and rate-limit handling.
 */

import chalk from "chalk";
import type { RailwayAction, RailwayResponse } from "./types.ts";

const HUB_URL = "https://hub.ag3nts.org/verify";
const MAX_RETRIES = 10;
const BASE_DELAY_MS = 1000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calls the railway API with retry on 503 and rate-limit awareness.
 */
export async function callRailwayApi(
  action: RailwayAction
): Promise<RailwayResponse> {
  const apikey = process.env.API_KEY_AI_DEVS4;
  if (!apikey) throw new Error("API_KEY_AI_DEVS4 is not set in .env");

  const payload = { apikey, task: "railway", answer: action };

  console.log(
    chalk.cyan(`\n→ Railway API call: ${chalk.bold(JSON.stringify(action))}`)
  );

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(HUB_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      // Log rate-limit headers if present
      const rateLimitHeaders = [
        "x-ratelimit-remaining",
        "x-ratelimit-reset",
        "x-ratelimit-limit",
        "retry-after",
      ];
      for (const header of rateLimitHeaders) {
        const value = res.headers.get(header);
        if (value) {
          console.log(chalk.gray(`  [header] ${header}: ${value}`));
        }
      }

      // Handle 503 with retry
      if (res.status === 503) {
        const retryAfter = res.headers.get("retry-after");
        const delayMs = retryAfter
          ? parseInt(retryAfter, 10) * 1000
          : BASE_DELAY_MS * Math.pow(2, attempt - 1);
        console.log(
          chalk.yellow(
            `  ⏳ 503 — retry ${attempt}/${MAX_RETRIES} in ${delayMs}ms`
          )
        );
        await sleep(delayMs);
        continue;
      }

      // Handle rate limit (429)
      if (res.status === 429) {
        const retryAfter = res.headers.get("retry-after");
        const delayMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : 5000;
        console.log(
          chalk.yellow(`  ⏳ 429 rate limited — waiting ${delayMs}ms`)
        );
        await sleep(delayMs);
        continue;
      }

      const data = (await res.json()) as RailwayResponse;
      console.log(
        chalk.gray("  ← Response:"),
        JSON.stringify(data, null, 2)
      );

      // Detect flag
      const flagMatch = JSON.stringify(data).match(/\{FLG:[^}]+\}/);
      if (flagMatch) {
        console.log(
          chalk.bgGreen.black(`\n  🚩 FLAG DETECTED: ${flagMatch[0]}`)
        );
      }

      return data;
    } catch (err) {
      console.log(
        chalk.red(
          `  ✗ Network error (attempt ${attempt}/${MAX_RETRIES}): ${err}`
        )
      );
      if (attempt === MAX_RETRIES) throw err;
      await sleep(BASE_DELAY_MS * Math.pow(2, attempt - 1));
    }
  }

  throw new Error("Max retries exceeded");
}
