import type { HubResponse } from "./types.ts";

const HUB_URL = "https://hub.ag3nts.org/verify";
const TASK = "foodwarehouse";

export const callTool = async (
  toolPayload: Record<string, unknown>
): Promise<HubResponse> => {
  const apikey = process.env.API_KEY_AI_DEVS4;
  if (!apikey) throw new Error("API_KEY_AI_DEVS4 is not set");

  const res = await fetch(HUB_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apikey, task: TASK, answer: toolPayload }),
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  }

  return res.json() as Promise<HubResponse>;
};
