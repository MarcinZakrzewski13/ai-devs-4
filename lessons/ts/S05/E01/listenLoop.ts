import chalk from "chalk";
import { listenOnce } from "./hubSession.ts";
import { persistRaw } from "./persistRaw.ts";
import { classify } from "./router.ts";
import { analyzeText } from "./analyzeText.ts";
import { analyzeJson, analyzeImageSmall, analyzeOther } from "./analyzeBinary.ts";
import { analyzeAudio } from "./analyzeAudio.ts";
import { appendFacts } from "./factStore.ts";
import type { ListenResponse } from "./types.ts";

const MAX_LISTENS = 50;

const END_MESSAGES = [
  "no more",
  "end of",
  "finished",
  "all data",
  "enough data",
  "got enough",
  "completed",
  "done",
  "wystarczy",
  "koniec",
];

const isEndMessage = (msg: string) => {
  const lower = msg.toLowerCase();
  return END_MESSAGES.some((e) => lower.includes(e));
};

export const runListenLoop = async (): Promise<void> => {
  console.log(chalk.cyan("\n  ◆ LISTEN LOOP start\n"));

  for (let seq = 1; seq <= MAX_LISTENS; seq++) {
    console.log(chalk.gray(`\n  ┄ listen ${seq}/${MAX_LISTENS}`));

    let raw: ListenResponse;
    try {
      raw = await listenOnce();
    } catch (err) {
      console.log(chalk.red(`  ✗ listen error: ${err}`));
      break;
    }

    await persistRaw(seq, raw);

    const decision = classify(raw);
    console.log(
      chalk.gray(`  [router] kind=${decision.kind} mime=${decision.mimeType ?? "-"} size=${decision.filesizeBytes ?? "-"}`)
    );

    if (decision.kind === "end" || isEndMessage(raw.message ?? "")) {
      console.log(chalk.cyan("  ✓ End of transmission signal received"));
      break;
    }

    try {
      switch (decision.kind) {
        case "noise":
          console.log(chalk.gray("  [router] noise → dropped"));
          break;

        case "text": {
          const result = await analyzeText(raw.transcription!, `seq${seq}`);
          if (!result.isNoise) appendFacts(result.facts);
          break;
        }

        case "binary-json": {
          const result = await analyzeJson(raw.attachment!, `seq${seq}.json`);
          if (!result.isNoise) appendFacts(result.facts);
          break;
        }

        case "binary-text": {
          const { decodeBase64Text } = await import("./decodeBinary.ts");
          const text = decodeBase64Text(raw.attachment!);
          const result = await analyzeText(text, `seq${seq}.txt`);
          if (!result.isNoise) appendFacts(result.facts);
          break;
        }

        case "binary-image-small": {
          const result = await analyzeImageSmall(
            raw.attachment!,
            raw.meta!,
            `seq${seq}`
          );
          if (!result.isNoise) appendFacts(result.facts);
          break;
        }

        case "binary-image-large":
          console.log(
            chalk.yellow(
              `  ⚠ Large image (${decision.filesizeBytes}B) — skipped, manual review needed`
            )
          );
          break;

        case "binary-audio": {
          console.log(chalk.cyan(`  🎤 Audio detected (seq=${seq}), transcribing with whisper-1...`));
          const result = await analyzeAudio(raw.attachment!, seq);
          if (!result.isNoise) appendFacts(result.facts);
          break;
        }

        case "binary-other": {
          const result = await analyzeOther(raw.attachment!, `seq${seq}`);
          if (!result.isNoise) appendFacts(result.facts);
          break;
        }
      }
    } catch (err) {
      console.log(chalk.red(`  ✗ analysis error seq=${seq}: ${err}`));
    }
  }

  console.log(chalk.cyan("\n  ✓ LISTEN LOOP done\n"));
};
