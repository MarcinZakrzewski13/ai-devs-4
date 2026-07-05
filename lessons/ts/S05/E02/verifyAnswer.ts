import chalk from "chalk";
import type { HubResponse } from "./types.ts";

const FLAG_RE = /\{FLG:[^}]+\}/i;

export const extractFlag = (res: HubResponse): string | null => {
  const candidates = [res.flag, res.message, res.msg, res.error];
  for (const c of candidates) {
    if (typeof c !== "string") continue;
    const m = FLAG_RE.exec(c);
    if (m) return m[0];
  }
  return null;
};

export const isSuccess = (res: HubResponse): boolean =>
  extractFlag(res) !== null;

export const isFatalFail = (res: HubResponse): boolean => {
  if (typeof res.code === "number" && res.code < 0) return true;
  const s = `${res.message ?? ""} ${res.error ?? ""}`.toLowerCase();
  return (
    s.includes("error") ||
    s.includes("failed") ||
    s.includes("suspended") ||
    s.includes("terminated") ||
    s.includes("burned") ||
    s.includes("spalona") ||
    s.includes("musisz zadzwonić ponownie")
  );
};

export const logHubResult = (label: string, res: HubResponse): void => {
  const flag = extractFlag(res);
  if (flag) {
    console.log(chalk.green.bold(`\n  ✓ FLAG (${label}): ${flag}`));
  }
};
