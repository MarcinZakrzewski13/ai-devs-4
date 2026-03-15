/**
 * Railway API client z dwoma trybami:
 *
 *  NORMAL (domyślny):
 *    503 → exponential backoff (1s, 2s, 4s...)
 *    429 → czeka pełny retry-after z nagłówka
 *    Wolny (~4 minuty na pełną sekwencję)
 *
 *  FAST (RAILWAY_FAST=true):
 *    503 → retry po 0.1s (zamiast exponential backoff)
 *    429 → czeka dokładnie retry-after sekundy, tylko raz
 *    Szybszy (~60-90s na pełną sekwencję)
 *    Dodatkowo: loguje WSZYSTKIE nagłówki odpowiedzi (szuka flag w headerach)
 */

import chalk from "chalk";
import type { RailwayAction, RailwayResponse } from "./types.ts";

const HUB_URL = "https://hub.ag3nts.org/verify";

/** Feature flag: RAILWAY_FAST=true → hammer mode (0.1s retry, ignoruje retry-after) */
export const FAST_MODE = process.env.RAILWAY_FAST === "true";

const MAX_RETRIES = FAST_MODE ? 500 : 10;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Wywołuje Railway API. Zachowanie zależy od flagi RAILWAY_FAST.
 */
export async function callRailwayApi(
  action: RailwayAction
): Promise<RailwayResponse> {
  const apikey = process.env.API_KEY_AI_DEVS4;
  if (!apikey) throw new Error("API_KEY_AI_DEVS4 is not set in .env");

  const payload = { apikey, task: "railway", answer: action };
  const mode = FAST_MODE ? chalk.yellow("FAST") : chalk.gray("normal");

  console.log(chalk.cyan(`\n→ Railway API [${mode}]: ${chalk.bold(JSON.stringify(action))}`));

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(HUB_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    // W trybie FAST loguj WSZYSTKIE nagłówki — może jest tam ukryta flaga
    if (FAST_MODE) {
      res.headers.forEach((value, key) => {
        console.log(chalk.gray(`  [header] ${key}: ${value}`));
      });
    } else {
      // Normal: tylko rate-limit headers
      for (const h of ["x-ratelimit-remaining", "x-ratelimit-reset", "x-ratelimit-limit", "retry-after"]) {
        const v = res.headers.get(h);
        if (v) console.log(chalk.gray(`  [header] ${h}: ${v}`));
      }
    }

    // --- 503 / 429 ---
    if (res.status === 503 || res.status === 429) {
      if (FAST_MODE) {
        // Hammer mode: ignoruj retry-after, walić co 0.1s
        console.log(chalk.yellow(`  ⚡ ${res.status} — hammer retry ${attempt}/${MAX_RETRIES} in 100ms`));
        await sleep(100);
      } else {
        // Normal mode: respektuj retry-after
        if (res.status === 429) {
          const retryAfter = res.headers.get("retry-after");
          const delayMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : 30_000;
          console.log(chalk.yellow(`  ⏳ 429 — waiting ${(delayMs / 1000).toFixed(0)}s`));
          await sleep(delayMs);
        } else {
          const delayMs = 1000 * Math.pow(2, attempt - 1);
          console.log(chalk.yellow(`  ⏳ 503 — retry ${attempt}/${MAX_RETRIES} in ${delayMs}ms`));
          await sleep(delayMs);
        }
      }
      continue;
    }

    // --- Sukces ---
    const data = (await res.json()) as RailwayResponse;
    console.log(chalk.gray("  ← Response:"), JSON.stringify(data, null, 2));

    const flagMatch = JSON.stringify(data).match(/\{FLG:[^}]+\}/);
    if (flagMatch) {
      console.log(chalk.bgGreen.black(`\n  🚩 FLAG DETECTED: ${flagMatch[0]}`));
    }

    return data;
  }

  throw new Error("Max retries exceeded");
}
