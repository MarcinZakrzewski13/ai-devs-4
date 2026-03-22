import chalk from "chalk";
import { createDefaultProvider } from "@ai-devs/ai-core";
import type { LogEntry } from "./types";
import { countTokens } from "./count-tokens";

const LEVEL_PRIORITY: Record<string, number> = { CRIT: 3, ERRO: 2, WARN: 1 };

/**
 * Compress logs to fit within token limit.
 * Strategy: prioritize CRIT > ERRO > WARN, drop lowest priority until fits.
 * Then shorten messages deterministically.
 */
export function compressLogs(
  entries: LogEntry[],
  tokenLimit: number,
): LogEntry[] {
  // Sort by priority (CRIT first), then chronologically within same priority
  const sorted = [...entries].sort((a, b) => {
    const pa = LEVEL_PRIORITY[a.level] ?? 0;
    const pb = LEVEL_PRIORITY[b.level] ?? 0;
    if (pa !== pb) return pb - pa;
    return a.raw.localeCompare(b.raw);
  });

  // Shorten messages
  const shortened = sorted.map((e) => ({
    ...e,
    message: shortenMessage(e.message),
  }));

  // Re-sort chronologically
  shortened.sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));

  // Drop WARN entries from the end until we fit
  let result = [...shortened];
  while (result.length > 0) {
    const text = result
      .map((e) => `[${e.date} ${e.time}] [${e.level}] ${e.message}`)
      .join("\n");
    const tokens = countTokens(text);
    if (tokens <= tokenLimit) {
      console.log(chalk.gray(`Compressed to ${tokens} tokens (${result.length} entries)`));
      return result;
    }
    // Drop lowest priority entry (from the end of priority-sorted list)
    const lowestPrio = Math.min(...result.map((e) => LEVEL_PRIORITY[e.level] ?? 0));
    const idx = result.findLastIndex((e) => (LEVEL_PRIORITY[e.level] ?? 0) === lowestPrio);
    if (idx >= 0) result.splice(idx, 1);
  }

  return result;
}

function shortenMessage(msg: string): string {
  const replacements: [RegExp, string][] = [
    [/temperature/gi, "temp"],
    [/pressure/gi, "pres"],
    [/Protection interlock initiated reactor trip\.?/gi, "prot interlock trip"],
    [/Immediate protective actions are required\.?/gi, "immediate action req"],
    [/Manual override is locked\.?/gi, "manual override locked"],
    [/Energy conversion is terminated\.?/gi, "energy conv terminated"],
    [/Heat rejection is no longer sufficient\.?/gi, "heat rejection insufficient"],
    [/Shutdown logic is moving to hard trip stage\.?/gi, "hard trip stage"],
    [/Core loop continuity is compromised\.?/gi, "core loop compromised"],
    [/Critical loads are shedding\.?/gi, "loads shedding"],
    [/Reactor protection initiates critical stop\.?/gi, "reactor prot stop"],
    [/automatic shutdown is mandatory\.?/gi, "auto shutdown mandatory"],
    [/Protective shutdown path is being enforced\.?/gi, "prot shutdown enforced"],
    [/Performance constraints are now enforced\.?/gi, "constraints enforced"],
    [/The subsystem remains in degraded operation mode\.?/gi, "degraded mode"],
    [/Automatic fallback path has been applied\.?/gi, "auto fallback applied"],
    [/Runtime proceeds in constrained mode\.?/gi, "runtime constrained"],
    [/Monitoring continues without immediate trip\.?/gi, "monitoring continues"],
    [/Automatic damping remains engaged\.?/gi, "auto damping engaged"],
    [/Corrective ramp is queued\.?/gi, "corrective ramp queued"],
    [/Stability window is narrowed\.?/gi, "stability narrowed"],
    [/Retry timer is active\.?/gi, "retry active"],
    [/Cooling reserve may become constrained\.?/gi, "cooling reserve constrained"],
    [/Automatic correction remains active\.?/gi, "auto correction active"],
    [/Monitoring intensity has been increased\.?/gi, "monitoring increased"],
    [/Dissipation lag continues to accumulate\.?/gi, "dissipation lag growing"],
    [/Escalation rules are armed\.?/gi, "escalation armed"],
    [/Recovery completed with degraded margin\.?/gi, "recovery degraded"],
    [/Mechanical stress is increasing\.?/gi, "mech stress rising"],
    [/Emergency bias remains armed\.?/gi, "emerg bias armed"],
    [/Throughput tuning is required\.?/gi, "throughput tuning req"],
    [/\. /g, "; "],
    [/reported /gi, ""],
    [/exceeded /gi, "excdd "],
    [/threshold/gi, "thresh"],
    [/emergency/gi, "emerg"],
    [/critical/gi, "crit"],
    [/coolant/gi, "cool"],
    [/cooling/gi, "cool"],
    [/shutdown/gi, "shtdwn"],
    [/immediately/gi, "immed"],
    [/recommended/gi, "recom"],
    [/insufficient/gi, "insuff"],
    [/approximately/gi, "~"],
    [/configuration/gi, "config"],
    [/  +/g, " "],
  ];

  let result = msg;
  for (const [pattern, replacement] of replacements) {
    result = result.replace(pattern, replacement);
  }
  return result.trim();
}
