import { sendAnswer } from "@ai-devs/ai-devs-hub";
import type { ListenResponse } from "./types.ts";

const TASK = "radiomonitoring";

export const startSession = async (): Promise<void> => {
  await sendAnswer(TASK, { action: "start" });
};

export const listenOnce = async (): Promise<ListenResponse> => {
  const res = await sendAnswer(TASK, { action: "listen" });
  return res as unknown as ListenResponse;
};

export const transmit = async (answer: {
  cityName: string;
  cityArea: string;
  warehousesCount: number;
  phoneNumber: string;
}): Promise<{ code: number; message: string; flag?: string }> => {
  return sendAnswer(TASK, { action: "transmit", ...answer }) as Promise<{
    code: number;
    message: string;
    flag?: string;
  }>;
};
