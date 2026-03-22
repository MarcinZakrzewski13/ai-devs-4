import type { ZmailRequest, ZmailResponse } from "./types.ts";

const ZMAIL_URL = "https://hub.ag3nts.org/api/zmail";
const API_KEY = process.env.API_KEY_AI_DEVS4!;

export const callZmail = async (
  action: string,
  params: Record<string, unknown> = {}
): Promise<ZmailResponse> => {
  const body: ZmailRequest = {
    apikey: API_KEY,
    action,
    ...params,
  };

  const res = await fetch(ZMAIL_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  return res.json() as Promise<ZmailResponse>;
};
