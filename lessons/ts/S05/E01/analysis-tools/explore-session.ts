// Iteracja 1: eksploracja sesji bez LLM.
// Uruchom: bun run lessons/ts/S05/E01/analysis-tools/explore-session.ts
// Wynik: lessons/ts/resources/S05E01/tmp/raw-log.jsonl + binarki bin-N.ext

import "dotenv/config";
import { writeFile, appendFile, mkdir } from "node:fs/promises";
import path from "node:path";
import chalk from "chalk";
import { sendAnswer } from "@ai-devs/ai-devs-hub";

const TASK = "radiomonitoring";
const MAX = 60;
const TMP = path.resolve("lessons/ts/resources/S05E01/tmp");
const RAW_LOG = path.join(TMP, "raw-log.jsonl");

const MIME_EXT: Record<string, string> = {
  "application/json": ".json",
  "application/pdf": ".pdf",
  "text/plain": ".txt",
  "text/html": ".html",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",
  "audio/mpeg": ".mp3",
  "audio/wav": ".wav",
  "audio/ogg": ".ogg",
  "audio/flac": ".flac",
  "audio/m4a": ".m4a",
};

const mimeExt = (m: string) => MIME_EXT[m.toLowerCase()] ?? ".bin";

type Stats = {
  total: number;
  text: number;
  noise: number;
  binary: Record<string, number>;
  endReason: string;
};

async function main() {
  await mkdir(TMP, { recursive: true });

  console.log(chalk.cyan.bold("\n  S05E01 — EXPLORE SESSION (no LLM)"));
  console.log(chalk.gray(`  TMP: ${TMP}\n`));

  console.log(chalk.gray("  Starting session..."));
  await sendAnswer(TASK, { action: "start" });
  console.log(chalk.green("  ✓ session started\n"));

  const stats: Stats = {
    total: 0,
    text: 0,
    noise: 0,
    binary: {},
    endReason: "max reached",
  };

  for (let seq = 1; seq <= MAX; seq++) {
    console.log(chalk.gray(`  ┄ listen ${seq}/${MAX}`));

    let raw: any;
    try {
      raw = await sendAnswer(TASK, { action: "listen" });
    } catch (err) {
      console.log(chalk.red(`  ✗ fetch error: ${err}`));
      stats.endReason = `fetch error at seq ${seq}`;
      break;
    }

    stats.total++;

    const entry: any = {
      seq,
      timestamp: new Date().toISOString(),
      code: raw.code,
      message: raw.message,
      hasTranscription: !!raw.transcription,
      transcriptionLen: raw.transcription?.length ?? 0,
      hasAttachment: !!raw.attachment,
      meta: raw.meta ?? null,
      filesize: raw.filesize ?? null,
      transcription: raw.transcription ?? null,
    };

    await appendFile(RAW_LOG, JSON.stringify(entry) + "\n", "utf8");

    if (raw.transcription !== undefined) {
      const len = raw.transcription.trim().length;
      if (len < 15) {
        stats.noise++;
        console.log(chalk.gray(`    → noise (len=${len})`));
      } else {
        stats.text++;
        console.log(
          chalk.white(`    → TEXT (len=${len}): "${raw.transcription.slice(0, 80)}..."`)
        );
      }
    } else if (raw.attachment && raw.meta) {
      const mime = raw.meta.toLowerCase();
      stats.binary[mime] = (stats.binary[mime] ?? 0) + 1;

      const ext = mimeExt(mime);
      const binPath = path.join(TMP, `bin-${seq}${ext}`);
      const buf = Buffer.from(raw.attachment, "base64");
      await writeFile(binPath, buf);

      console.log(
        chalk.yellow(
          `    → BINARY ${mime} (base64=${raw.attachment.length}, decoded=${buf.length}B) → bin-${seq}${ext}`
        )
      );

      if (mime.startsWith("audio/")) {
        console.log(
          chalk.yellow(
            `  ⚠ AUDIO detected (${mime}) at seq ${seq} — whisper-1 available, logging only in explore`
          )
        );
        // Exploration: log but continue (whisper-1 is approved)
      }
    }

    if (raw.code !== 100) {
      stats.endReason = `code=${raw.code} msg="${raw.message}"`;
      console.log(chalk.cyan(`  ✓ End signal: ${stats.endReason}`));
      break;
    }

    const msg = (raw.message ?? "").toLowerCase();
    const endWords = ["no more", "end of", "finished", "all data", "enough data", "done", "completed", "wystarczy", "koniec"];
    if (endWords.some((w) => msg.includes(w))) {
      stats.endReason = `end message: "${raw.message}"`;
      console.log(chalk.cyan(`  ✓ End message: ${raw.message}`));
      break;
    }
  }

  const report = {
    timestamp: new Date().toISOString(),
    stats,
    summary: {
      totalListens: stats.total,
      textFragments: stats.text,
      noiseFragments: stats.noise,
      binaryByMime: stats.binary,
      endReason: stats.endReason,
    },
  };

  const reportPath = path.join(TMP, "explore-report.json");
  await writeFile(reportPath, JSON.stringify(report, null, 2), "utf8");

  console.log(chalk.cyan.bold("\n  RAPORT EKSPLORACJI:"));
  console.log(chalk.white(JSON.stringify(report.summary, null, 2)));
  console.log(chalk.gray(`\n  Zapisano: ${RAW_LOG}`));
  console.log(chalk.gray(`  Raport:   ${reportPath}`));
}

main().catch((err) => {
  console.error(chalk.red("\n✗ " + (err instanceof Error ? err.stack ?? err.message : String(err))));
  process.exit(1);
});
