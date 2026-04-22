// Iteracja 2 (dry run): synteza z cache JSONL bez nowego listen + bez transmit.
// Uruchom po explore-session.ts:
//   bun run lessons/ts/S05/E01/analysis-tools/dry-synthesize.ts
// Opcjonalnie: bun run ... --force-llm  (omija cache, re-analizuje)

import "dotenv/config";
import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import path from "node:path";
import chalk from "chalk";
import { analyzeText } from "../analyzeText.ts";
import { analyzeJson, analyzeImageSmall, analyzeOther } from "../analyzeBinary.ts";
import { appendFacts } from "../factStore.ts";
import { aggregate, getCount } from "../factStore.ts";
import { synthesize } from "../synthesize.ts";
import { dumpBreakdown, getTotalCost } from "../costGuard.ts";

const TMP = path.resolve("lessons/ts/resources/S05E01/tmp");
const RAW_LOG = path.join(TMP, "raw-log.jsonl");

type RawEntry = {
  seq: number;
  code: number;
  message: string;
  hasTranscription: boolean;
  transcriptionLen: number;
  hasAttachment: boolean;
  meta: string | null;
  filesize: number | null;
  transcription: string | null;
};

async function readJsonl(filePath: string): Promise<RawEntry[]> {
  const entries: RawEntry[] = [];
  const rl = createInterface({ input: createReadStream(filePath) });
  for await (const line of rl) {
    if (line.trim()) entries.push(JSON.parse(line));
  }
  return entries;
}

async function main() {
  console.log(chalk.cyan.bold("\n  S05E01 — DRY SYNTHESIZE (from cache)\n"));

  let entries: RawEntry[];
  try {
    entries = await readJsonl(RAW_LOG);
  } catch {
    console.log(chalk.red(`  ✗ Cannot read ${RAW_LOG} — run explore-session.ts first`));
    process.exit(1);
  }

  console.log(chalk.gray(`  Loaded ${entries.length} entries from cache\n`));

  for (const entry of entries) {
    if (entry.code !== 100) continue;

    if (entry.hasTranscription && entry.transcription) {
      const len = entry.transcription.trim().length;
      if (len < 15) continue;
      const result = await analyzeText(entry.transcription, `seq${entry.seq}`);
      if (!result.isNoise) appendFacts(result.facts);
    } else if (entry.hasAttachment && entry.meta) {
      const mime = entry.meta.toLowerCase();
      const binPath = path.join(
        TMP,
        `bin-${entry.seq}${mimeExt(mime)}`
      );

      let b64: string;
      try {
        const buf = await Bun.file(binPath).arrayBuffer();
        b64 = Buffer.from(buf).toString("base64");
      } catch {
        console.log(chalk.gray(`  [dry] seq=${entry.seq} binary not found, skip`));
        continue;
      }

      let result;
      if (mime === "application/json") {
        result = await analyzeJson(b64, `seq${entry.seq}.json`);
      } else if (mime.startsWith("text/")) {
        const { decodeBase64Text } = await import("../decodeBinary.ts");
        const text = decodeBase64Text(b64);
        result = await analyzeText(text, `seq${entry.seq}.txt`);
      } else if (mime.startsWith("image/")) {
        const filesize = entry.filesize ?? 0;
        if (filesize < 200 * 1024) {
          result = await analyzeImageSmall(b64, mime, `seq${entry.seq}`);
        } else {
          console.log(chalk.yellow(`  [dry] seq=${entry.seq} large image skip`));
          continue;
        }
      } else if (mime.startsWith("audio/")) {
        const { transcribeAudioFile } = await import("../analyzeAudio.ts");
        let transcript: string;
        try {
          transcript = await transcribeAudioFile(binPath);
        } catch {
          console.log(chalk.yellow(`  [dry] audio file not found at ${binPath}, skip`));
          continue;
        }
        result = await analyzeText(transcript, `audio-seq${entry.seq}`);
      } else {
        result = await analyzeOther(b64, `seq${entry.seq}`);
      }

      if (result && !result.isNoise) appendFacts(result.facts);
    }
  }

  console.log(chalk.cyan(`\n  Facts collected: ${getCount()}\n`));

  const candidates = aggregate();
  console.log(chalk.white("  Candidates:\n") + chalk.gray(JSON.stringify(candidates, null, 2)));

  const answer = await synthesize(candidates);

  console.log(chalk.cyan.bold("\n  FINAL ANSWER (dry run — NOT transmitted):"));
  console.log(chalk.white(JSON.stringify(answer, null, 2)));

  await dumpBreakdown();
  console.log(chalk.gray(`  Total cost: $${getTotalCost().toFixed(5)}`));
}

const MIME_EXT: Record<string, string> = {
  "application/json": ".json",
  "text/plain": ".txt",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",
  "audio/mpeg": ".mp3",
  "audio/wav": ".wav",
};
const mimeExt = (m: string) => MIME_EXT[m] ?? ".bin";

main().catch((err) => {
  console.error(chalk.red("\n✗ " + (err instanceof Error ? err.stack ?? err.message : String(err))));
  process.exit(1);
});
