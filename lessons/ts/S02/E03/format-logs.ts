import type { LogEntry } from "./types";

export function formatLogs(entries: LogEntry[]): string {
  return entries
    .map((e) => `[${e.date} ${e.time}] [${e.level}] ${e.message}`)
    .join("\n");
}
