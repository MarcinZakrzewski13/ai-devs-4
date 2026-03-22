import chalk from "chalk";
import type { LogEntry } from "./types";

// Format: [YYYY-MM-DD HH:MM:SS] [LEVEL] message with SUBSYSTEM_ID inside
const LOG_RE = /^\[(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}):\d{2}\]\s+\[(\w+)\]\s+(.+)$/;
const SUBSYSTEM_RE = /\b([A-Z]{2,}[\d]+[A-Z]*)\b/;

export function parseLogs(raw: string): LogEntry[] {
  const lines = raw.split("\n").filter(Boolean);
  const entries: LogEntry[] = [];
  let unparsed = 0;

  for (const line of lines) {
    const m = line.match(LOG_RE);
    if (m) {
      const message = m[4];
      const subMatch = message.match(SUBSYSTEM_RE);
      entries.push({
        date: m[1],
        time: m[2],
        level: m[3],
        subsystem: subMatch ? subMatch[1] : "UNKNOWN",
        message,
        raw: line,
      });
    } else {
      unparsed++;
    }
  }

  const levels = new Map<string, number>();
  for (const e of entries) {
    levels.set(e.level, (levels.get(e.level) ?? 0) + 1);
  }
  console.log(chalk.gray(`Parsed: ${entries.length}, unparsed: ${unparsed}`));
  console.log(chalk.gray(`Levels: ${[...levels.entries()].map(([k, v]) => `${k}=${v}`).join(", ")}`));

  return entries;
}
