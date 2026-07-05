import { createReadStream, writeFileSync } from "node:fs";
import chalk from "chalk";
import OpenAI from "openai";
import { trackWhisper } from "./costGuard.ts";

const MODEL = "whisper-1";

const getClient = (): OpenAI =>
  new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const decodeAudio = (b64: string, outMp3Path: string): number => {
  const buf = Buffer.from(b64, "base64");
  writeFileSync(outMp3Path, buf);
  return buf.length;
};

export const transcribeFile = async (
  mp3Path: string,
  label: string,
  audioBytes: number
): Promise<string> => {
  const client = getClient();
  const res = await client.audio.transcriptions.create({
    model: MODEL,
    file: createReadStream(mp3Path),
    language: "pl",
  });
  await trackWhisper(audioBytes, label);
  console.log(
    chalk.hex("#FF8C00")(`  🎤 IN (${label}): "${res.text.slice(0, 120)}"`)
  );
  return res.text;
};
