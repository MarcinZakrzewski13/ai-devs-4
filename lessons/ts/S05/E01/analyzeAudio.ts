import { createReadStream, writeFileSync } from "node:fs";
import { mkdirSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import chalk from "chalk";
import OpenAI from "openai";
import { analyzeText } from "./analyzeText.ts";
import type { TextAnalysisResult } from "./types.ts";

const MODEL = "whisper-1";
const TMP_DIR = path.resolve("lessons/ts/resources/S05E01/tmp");

const getClient = (): OpenAI =>
  new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const transcribeAudio = async (b64: string, seq: number): Promise<string> => {
  const audioPath = path.join(TMP_DIR, `bin-${seq}.mp3`);

  const buf = Buffer.from(b64, "base64");
  writeFileSync(audioPath, buf);

  console.log(chalk.gray(`  [whisper] transcribing ${audioPath} (${buf.length}B)...`));

  const client = getClient();
  const transcription = await client.audio.transcriptions.create({
    model: MODEL,
    file: createReadStream(audioPath),
    language: "pl",
  });

  console.log(
    chalk.hex("#FF8C00")(
      `  🎤 AUDIO TRANSCRIPT (seq=${seq}): "${transcription.text.slice(0, 120)}..."`
    )
  );

  return transcription.text;
};

export const transcribeAudioFile = async (filePath: string): Promise<string> => {
  console.log(chalk.gray(`  [whisper] transcribing ${filePath}...`));

  const client = getClient();
  const transcription = await client.audio.transcriptions.create({
    model: MODEL,
    file: createReadStream(filePath),
    language: "pl",
  });

  return transcription.text;
};

export const analyzeAudio = async (
  b64: string,
  seq: number
): Promise<TextAnalysisResult> => {
  const transcript = await transcribeAudio(b64, seq);

  // Whisper cost ≈ $0.006/min but we have no token usage to track
  // Approximate: 1 min audio ≈ $0.006; log as note
  console.log(chalk.gray(`  [cost] whisper-1 seq=${seq} transcript len=${transcript.length}`));

  return analyzeText(transcript, `audio-seq${seq}`);
};
