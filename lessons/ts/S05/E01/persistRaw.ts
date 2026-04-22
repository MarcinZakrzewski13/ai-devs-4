import { writeFile, appendFile, mkdir } from "node:fs/promises";
import path from "node:path";
import chalk from "chalk";
import type { ListenResponse } from "./types.ts";

const TMP_DIR = path.resolve("lessons/ts/resources/S05E01/tmp");
const RAW_LOG = path.join(TMP_DIR, "raw-log.jsonl");

let initialized = false;

const ensureDir = async () => {
  if (!initialized) {
    await mkdir(TMP_DIR, { recursive: true });
    initialized = true;
  }
};

export const persistRaw = async (
  seq: number,
  raw: ListenResponse
): Promise<void> => {
  await ensureDir();

  const entry = {
    seq,
    timestamp: new Date().toISOString(),
    hasTranscription: !!raw.transcription,
    hasAttachment: !!raw.attachment,
    meta: raw.meta ?? null,
    filesize: raw.filesize ?? null,
    code: raw.code,
    message: raw.message,
    transcription: raw.transcription ?? null,
  };

  await appendFile(RAW_LOG, JSON.stringify(entry) + "\n", "utf8");
  console.log(chalk.gray(`  [persist] seq=${seq} → raw-log.jsonl`));

  if (raw.attachment && raw.meta) {
    const ext = mimeToExt(raw.meta);
    const binPath = path.join(TMP_DIR, `bin-${seq}${ext}`);
    const buf = Buffer.from(raw.attachment, "base64");
    await writeFile(binPath, buf);
    console.log(
      chalk.gray(`  [persist] seq=${seq} binary → bin-${seq}${ext} (${buf.length}B)`)
    );
  }
};

const mimeToExt = (mime: string): string => {
  const map: Record<string, string> = {
    "application/json": ".json",
    "application/pdf": ".pdf",
    "text/plain": ".txt",
    "text/html": ".html",
    "text/csv": ".csv",
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp",
    "audio/mpeg": ".mp3",
    "audio/wav": ".wav",
    "audio/ogg": ".ogg",
    "audio/flac": ".flac",
    "audio/m4a": ".m4a",
    "audio/webm": ".webm",
  };
  return map[mime] ?? ".bin";
};
