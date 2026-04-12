import chalk from "chalk";
import type { WindpowerResponse, CollectedData } from "./types";

const API_KEY = process.env.API_KEY_AI_DEVS4!;
const HUB_URL = "https://hub.ag3nts.org/verify";
const TASK_NAME = "windpower";

export const callWindpower = async (
  answer: Record<string, unknown>
): Promise<WindpowerResponse> => {
  const res = await fetch(HUB_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apikey: API_KEY, task: TASK_NAME, answer }),
  });

  if (!res.ok) {
    await new Promise((r) => setTimeout(r, 500));
    const retry = await fetch(HUB_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apikey: API_KEY, task: TASK_NAME, answer }),
    });
    return retry.json() as Promise<WindpowerResponse>;
  }

  return res.json() as Promise<WindpowerResponse>;
};

export const pollResults = async (
  expectedCount: number,
  maxWaitMs: number,
  deadline: number
): Promise<unknown[]> => {
  const results: unknown[] = [];
  const start = Date.now();

  while (results.length < expectedCount) {
    const elapsed = Date.now() - start;
    const remaining = deadline - Date.now();

    if (elapsed > maxWaitMs || remaining < 3000) {
      console.log(
        chalk.yellow(
          `[poll] Stopping after ${elapsed}ms, collected ${results.length}/${expectedCount}`
        )
      );
      break;
    }

    const res = await callWindpower({ action: "getResult" });

    if ((res as any).sourceFunction) {
      results.push(res);
      console.log(
        chalk.green(
          `[poll] Got result ${results.length}/${expectedCount}: ${(res as any).sourceFunction}`
        )
      );
      continue; // immediately try next, don't sleep
    }

    if (res.code === 11) {
      await new Promise((r) => setTimeout(r, 500));
    } else {
      console.log(chalk.yellow(`[poll] Unexpected: code=${res.code} ${res.message}`));
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  return results;
};

export const collectData = (results: unknown[]): CollectedData => {
  const data: CollectedData = {
    weather: null,
    turbinecheck: null,
    powerplantcheck: null,
  };

  for (const r of results) {
    const src = (r as any).sourceFunction;
    if (src === "weather") data.weather = r;
    else if (src === "turbinecheck") data.turbinecheck = r;
    else if (src === "powerplantcheck") data.powerplantcheck = r;
  }

  return data;
};
