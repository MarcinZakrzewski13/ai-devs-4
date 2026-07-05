import { writeFile } from "node:fs/promises";
import path from "node:path";
import chalk from "chalk";

const HARD_CAP_USD = 2.0;
const TMP_DIR = path.resolve("lessons/ts/resources/S05E02/tmp");

type CostEntry = {
  model: string;
  promptTokens: number;
  completionTokens: number;
  costUsd: number;
  label: string;
  timestamp: string;
};

const TOKEN_COST: Record<string, { in: number; out: number }> = {
  "gpt-5-nano": { in: 0.1, out: 0.4 },
  "gpt-5-mini": { in: 0.4, out: 1.6 },
  "gpt-5": { in: 2.0, out: 8.0 },
};

// Płaskie stawki dla usług audio ($/jednostka).
// gpt-4o-mini-tts: ~$0.60 / 1M chars input.
// whisper-1: $0.006 / min (60s).
const AUDIO_COST = {
  ttsPerMChar: 0.6,
  whisperPerMin: 0.006,
};

const entries: CostEntry[] = [];
let totalUsd = 0;

export const trackCost = async (
  model: string,
  usage: { promptTokens: number; completionTokens: number },
  label: string
): Promise<void> => {
  const rates = TOKEN_COST[model] ?? { in: 2.0, out: 8.0 };
  const costUsd =
    (usage.promptTokens / 1_000_000) * rates.in +
    (usage.completionTokens / 1_000_000) * rates.out;
  await pushEntry(model, usage, costUsd, label);
};

export const trackTts = async (chars: number, label: string): Promise<void> => {
  const costUsd = (chars / 1_000_000) * AUDIO_COST.ttsPerMChar;
  await pushEntry(
    "gpt-4o-mini-tts",
    { promptTokens: chars, completionTokens: 0 },
    costUsd,
    `tts:${label}`
  );
};

export const trackWhisper = async (
  audioBytes: number,
  label: string
): Promise<void> => {
  // Prymitywne oszacowanie długości audio: MP3 ~16 kB/s ~= 128 kbps.
  // Bierzemy średnio 20 kB/s → sec = bytes / 20480.
  const seconds = audioBytes / 20480;
  const minutes = seconds / 60;
  const costUsd = minutes * AUDIO_COST.whisperPerMin;
  await pushEntry(
    "whisper-1",
    { promptTokens: audioBytes, completionTokens: 0 },
    costUsd,
    `whisper:${label}`
  );
};

const pushEntry = async (
  model: string,
  usage: { promptTokens: number; completionTokens: number },
  costUsd: number,
  label: string
): Promise<void> => {
  totalUsd += costUsd;
  const entry: CostEntry = {
    model,
    promptTokens: usage.promptTokens,
    completionTokens: usage.completionTokens,
    costUsd,
    label,
    timestamp: new Date().toISOString(),
  };
  entries.push(entry);
  console.log(
    chalk.gray(
      `  [cost] ${label} | ${model} | +$${costUsd.toFixed(5)} | total=$${totalUsd.toFixed(5)}`
    )
  );
  if (totalUsd >= HARD_CAP_USD) {
    await dumpBreakdown();
    throw new Error(
      `Cost cap exceeded: $${totalUsd.toFixed(4)} >= $${HARD_CAP_USD}`
    );
  }
};

export const dumpBreakdown = async (): Promise<void> => {
  const breakdown = { totalUsd, entries };
  const filePath = path.join(TMP_DIR, "cost-breakdown.json");
  await writeFile(filePath, JSON.stringify(breakdown, null, 2), "utf8");
  console.log(chalk.yellow(`  [cost] breakdown saved → ${filePath}`));
};

export const getTotalCost = (): number => totalUsd;
