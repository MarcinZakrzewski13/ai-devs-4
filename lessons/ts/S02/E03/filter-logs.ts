import type { LogEntry } from "./types";

const IMPORTANT_LEVELS = new Set(["WARN", "ERRO", "CRIT"]);

export function filterLogs(
  entries: LogEntry[],
  requiredSubsystems?: string[],
): LogEntry[] {
  const reqSet = requiredSubsystems
    ? new Set(requiredSubsystems.map((s) => s.toUpperCase()))
    : null;

  return entries.filter((e) => {
    if (IMPORTANT_LEVELS.has(e.level)) return true;
    if (reqSet && reqSet.has(e.subsystem.toUpperCase())) return true;
    return false;
  });
}

/**
 * Deduplicate entries: keep first occurrence of each unique (level, message) pair.
 * For repeated events, append "(xN)" count to message.
 */
export function deduplicateLogs(entries: LogEntry[]): LogEntry[] {
  const seen = new Map<string, { entry: LogEntry; count: number }>();

  for (const e of entries) {
    const key = `${e.level}|${e.message}`;
    const existing = seen.get(key);
    if (existing) {
      existing.count++;
    } else {
      seen.set(key, { entry: e, count: 1 });
    }
  }

  return [...seen.values()].map(({ entry, count }) => {
    if (count > 1) {
      return { ...entry, message: `${entry.message} (x${count})` };
    }
    return entry;
  });
}
