const API_KEY = process.env.API_KEY_AI_DEVS4!;
const HUB_URL = "https://hub.ag3nts.org/verify";
const TASK = "domatowo";

export const callDomatowo = async (
  answer: Record<string, unknown>
): Promise<unknown> => {
  const res = await fetch(HUB_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apikey: API_KEY, task: TASK, answer }),
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  }

  return res.json();
};
