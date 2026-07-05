import { writeFileSync } from "node:fs";
import chalk from "chalk";
import OpenAI from "openai";
import { trackTts } from "./costGuard.ts";

const MODEL = "gpt-4o-mini-tts";
const VOICE = "onyx";
const INSTRUCTIONS = [
  "Mężczyzna, spokojny i rzeczowy ton — profesjonalna rozmowa telefoniczna.",
  "Tempo normalne, wyraźna polska wymowa. Krótkie pauzy między zdaniami.",
  "Bez emocji, bez patosu, bez luźnych wtrętów.",
  "Ton osoby raportującej służbowo, ale nie sztywnej.",
].join(" ");

const getClient = (): OpenAI =>
  new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const sanitize = (raw: string): string =>
  raw
    .replace(/[\r\n]+/g, " ")
    .replace(/[*_`#>[\]]/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();

export const synthesizeToMp3 = async (
  text: string,
  outMp3Path: string,
  label: string
): Promise<{ b64: string; bytes: number; cleanText: string }> => {
  const clean = sanitize(text);
  console.log(
    chalk.cyan(`  🗣  OUT (${label}):`),
    chalk.white(`"${clean.slice(0, 120)}"`)
  );
  const client = getClient();
  const res = await client.audio.speech.create({
    model: MODEL,
    voice: VOICE,
    input: clean,
    instructions: INSTRUCTIONS,
    response_format: "mp3",
    speed: 0.4,
  });
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(outMp3Path, buf);
  await trackTts(clean.length, label);
  const b64 = buf.toString("base64");
  return { b64, bytes: buf.length, cleanText: clean };
};
