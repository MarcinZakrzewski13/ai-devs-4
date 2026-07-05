import chalk from "chalk";
import type { HubResponse } from "./types.ts";

const HUB_URL = "https://hub.ag3nts.org/verify";
const TASK = "phonecall";

const getApiKey = (): string => {
  const key = process.env.API_KEY_AI_DEVS4;
  if (!key) throw new Error("API_KEY_AI_DEVS4 not set");
  return key;
};

const sleep = (ms: number): Promise<void> =>
  new Promise((r) => setTimeout(r, ms));

const post = async (answer: unknown, retries = 3): Promise<HubResponse> => {
  const payload = { apikey: getApiKey(), task: TASK, answer };
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const t0 = Date.now();
    const res = await fetch(HUB_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const dt = Date.now() - t0;
    const rawText = await res.text();
    try {
      const json = JSON.parse(rawText) as HubResponse;
      const audioNote = json.audio ? ` audio=${json.audio.length}B64` : "";
      console.log(
        chalk.gray(
          `  [hub] HTTP ${res.status} ${dt}ms code=${json.code} msg="${(json.message ?? "").slice(0, 60)}"${audioNote}`
        )
      );
      return json;
    } catch {
      const backoff = 3000 * (attempt + 1);
      console.log(
        chalk.yellow(
          `  [hub] non-JSON (HTTP ${res.status}, ${rawText.length}B). Retry ${attempt + 1}/${retries} po ${backoff}ms`
        )
      );
      if (attempt === retries) {
        throw new Error(`Hub non-JSON after retries: ${rawText.slice(0, 200)}`);
      }
      await sleep(backoff);
    }
  }
  throw new Error("unreachable");
};

export const sendStart = (): Promise<HubResponse> =>
  post({ action: "start" });

export const sendAudio = (b64: string): Promise<HubResponse> =>
  post({ audio: b64 });
