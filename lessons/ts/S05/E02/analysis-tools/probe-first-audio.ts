/**
 * M2 exploratory probe — S05E02 phonecall
 *
 * Cel:
 *   1. POST { action: "start" } → zestawienie sesji.
 *   2. Wygenerowanie krótkiego audio testowego (gpt-4o-mini-tts, PL).
 *   3. POST { audio: <base64 mp3> } → pierwsza właściwa wypowiedź Tymona.
 *   4. Dump surowej odpowiedzi Huba (JSON).
 *   5. Detekcja pola z audio operatora (raw base64 / data-url).
 *   6. Whisper transkrypt odpowiedzi operatora.
 *
 * Cel dydaktyczny: potwierdzić kontrakt Huba dla kroku audio → response
 * (nazwa pola z audio operatora, format, pola statusowe).
 *
 * Modele:
 *   - gpt-4o-mini-tts (T2S) — wygenerowanie audio Tymona.
 *   - whisper-1 (S2T) — transkrypcja odpowiedzi operatora.
 *
 * Uruchomienie:
 *   bun run lessons/ts/S05/E02/analysis-tools/probe-first-audio.ts
 */
import { writeFileSync, createReadStream, mkdirSync } from "node:fs";
import path from "node:path";
import chalk from "chalk";
import OpenAI from "openai";

const HUB_URL = "https://hub.ag3nts.org/verify";
const TASK = "phonecall";
const TMP_DIR = path.resolve(
  "lessons/ts/resources/S05E02/tmp/attempt-0-probe"
);
const TTS_MODEL = "gpt-4o-mini-tts";
const TTS_VOICE = "onyx";
const WHISPER_MODEL = "whisper-1";

// Kluczowa pierwsza wypowiedź — wg task.md musi zawierać:
//   przedstawienie + pytanie o 3 drogi (RD224/RD472/RD820)
//   + kontekst „transport do jednej z baz Zygfryda"
// Robimy full-scenario message żeby jednocześnie sprawdzić protokół
// i zainicjować rozmowę wg zasad zadania.
const FIRST_UTTERANCE = [
  "Dzień dobry, tu Tymon Gajewski.",
  "Dzwonię w sprawie transportu organizowanego do jednej z baz Zygfryda.",
  "Proszę o status trzech dróg: RD224, RD472 oraz RD820.",
].join(" ");

const TTS_INSTRUCTIONS =
  "Mężczyzna, spokojny, rzeczowy ton, tempo normalne, jak podczas rozmowy telefonicznej. Wyraźna polska wymowa. Krótkie pauzy między zdaniami.";

const W = 58;
const BORDER = chalk.cyan("═".repeat(W));
const step = (label: string) =>
  console.log(chalk.cyan("  ◆ ") + chalk.white(label) + chalk.gray("..."));
const done = (label: string) =>
  console.log(chalk.green("  ✓ ") + chalk.gray(label));
const warn = (label: string) =>
  console.log(chalk.yellow("  ! ") + chalk.yellow(label));

const looksLikeBase64Mp3 = (s: string): boolean => {
  if (typeof s !== "string" || s.length < 100) return false;
  if (!/^[A-Za-z0-9+/=\s]+$/.test(s.slice(0, 200))) return false;
  try {
    const buf = Buffer.from(s.slice(0, 20), "base64");
    if (buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33) return true;
    if (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0) return true;
    return false;
  } catch {
    return false;
  }
};

const looksLikeDataUrl = (s: string): { mime: string; b64: string } | null => {
  const m = /^data:(audio\/[a-z0-9+.-]+);base64,([A-Za-z0-9+/=]+)$/.exec(s);
  if (!m) return null;
  return { mime: m[1], b64: m[2] };
};

const scanForAudio = (
  obj: unknown,
  pathAcc: string,
  hits: Array<{ path: string; kind: string; length: number; sample: string }>
): void => {
  if (obj == null) return;
  if (typeof obj === "string") {
    const dataUrl = looksLikeDataUrl(obj);
    if (dataUrl) {
      hits.push({
        path: pathAcc,
        kind: `data-url:${dataUrl.mime}`,
        length: dataUrl.b64.length,
        sample: dataUrl.b64.slice(0, 40),
      });
      return;
    }
    if (looksLikeBase64Mp3(obj)) {
      hits.push({
        path: pathAcc,
        kind: "raw-base64-mp3",
        length: obj.length,
        sample: obj.slice(0, 40),
      });
    }
    return;
  }
  if (Array.isArray(obj)) {
    obj.forEach((item, i) => scanForAudio(item, `${pathAcc}[${i}]`, hits));
    return;
  }
  if (typeof obj === "object") {
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      scanForAudio(v, pathAcc ? `${pathAcc}.${k}` : k, hits);
    }
  }
};

const getByPath = (obj: unknown, dotted: string): unknown => {
  if (!dotted) return obj;
  const parts = dotted.split(/\.|\[(\d+)\]\.?|\[(\d+)\]/).filter(Boolean);
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur == null) return undefined;
    if (Array.isArray(cur) && /^\d+$/.test(p)) {
      cur = cur[Number(p)];
    } else if (typeof cur === "object") {
      cur = (cur as Record<string, unknown>)[p];
    } else return undefined;
  }
  return cur;
};

const synthesize = async (
  client: OpenAI,
  text: string
): Promise<Buffer> => {
  const res = await client.audio.speech.create({
    model: TTS_MODEL,
    voice: TTS_VOICE,
    input: text,
    instructions: TTS_INSTRUCTIONS,
    response_format: "mp3",
  });
  return Buffer.from(await res.arrayBuffer());
};

const transcribe = async (
  client: OpenAI,
  mp3Path: string
): Promise<string> => {
  const res = await client.audio.transcriptions.create({
    model: WHISPER_MODEL,
    file: createReadStream(mp3Path),
    language: "pl",
  });
  return res.text;
};

const postJson = async (payload: unknown): Promise<{ status: number; text: string; ms: number }> => {
  const t0 = Date.now();
  const res = await fetch(HUB_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  return { status: res.status, text, ms: Date.now() - t0 };
};

const main = async (): Promise<void> => {
  console.log("\n" + BORDER);
  console.log(chalk.cyan.bold("  S05E02 · M2 PROBE (first audio)".padEnd(W - 2)));
  console.log(
    chalk.gray("  start → TTS → POST audio → dump response → whisper")
  );
  console.log(BORDER + "\n");

  const apikey = process.env.API_KEY_AI_DEVS4;
  const oaKey = process.env.OPENAI_API_KEY;
  if (!apikey) {
    console.log(chalk.red("  ✗ API_KEY_AI_DEVS4 nie ustawione"));
    process.exit(1);
  }
  if (!oaKey) {
    console.log(chalk.red("  ✗ OPENAI_API_KEY nie ustawione (TTS + whisper)"));
    process.exit(1);
  }

  mkdirSync(TMP_DIR, { recursive: true });
  const client = new OpenAI({ apiKey: oaKey });

  // ---- 1. START ----
  step("POST /verify { action: start }");
  const startRes = await postJson({
    apikey,
    task: TASK,
    answer: { action: "start" },
  });
  done(`HTTP ${startRes.status} (${startRes.ms}ms, ${startRes.text.length}B)`);
  writeFileSync(path.join(TMP_DIR, "m2-start-response.json"), startRes.text);

  // ---- 2. TTS ----
  step(`TTS ${TTS_MODEL} voice=${TTS_VOICE} — "${FIRST_UTTERANCE.slice(0, 60)}..."`);
  const mp3 = await synthesize(client, FIRST_UTTERANCE);
  const outMp3Path = path.join(TMP_DIR, "m2-tymon-turn-1-out.mp3");
  writeFileSync(outMp3Path, mp3);
  done(`Zapis ${path.basename(outMp3Path)} (${mp3.length}B)`);

  const b64Out = mp3.toString("base64");
  writeFileSync(
    path.join(TMP_DIR, "m2-tymon-turn-1-out.txt"),
    FIRST_UTTERANCE
  );
  done(`Base64 len=${b64Out.length}`);

  // ---- 3. POST audio ----
  step("POST /verify { audio: <base64 mp3> }");
  const audioRes = await postJson({
    apikey,
    task: TASK,
    answer: { audio: b64Out },
  });
  done(
    `HTTP ${audioRes.status} (${audioRes.ms}ms, ${audioRes.text.length}B body)`
  );

  writeFileSync(
    path.join(TMP_DIR, "m2-audio-response-raw.txt"),
    audioRes.text
  );

  let json: unknown = null;
  try {
    json = JSON.parse(audioRes.text);
    writeFileSync(
      path.join(TMP_DIR, "m2-audio-response.json"),
      JSON.stringify(json, null, 2)
    );
  } catch {
    warn("Response nie jest JSON.");
    console.log(chalk.gray("  Preview:"), audioRes.text.slice(0, 400));
    return;
  }

  // ---- 4. Analiza pól ----
  const topKeys =
    json && typeof json === "object" && !Array.isArray(json)
      ? Object.keys(json as Record<string, unknown>)
      : [];
  console.log(chalk.cyan("\n  Top-level pola:"), chalk.white(topKeys.join(", ") || "(brak)"));
  for (const k of topKeys) {
    const v = (json as Record<string, unknown>)[k];
    const t = Array.isArray(v) ? "array" : typeof v;
    const len =
      typeof v === "string"
        ? v.length
        : Array.isArray(v)
        ? v.length
        : v && typeof v === "object"
        ? Object.keys(v).length
        : 0;
    const preview =
      typeof v === "string"
        ? ` "${v.slice(0, 80).replace(/\n/g, "\\n")}"`
        : typeof v === "number" || typeof v === "boolean"
        ? ` ${v}`
        : "";
    console.log(chalk.gray(`    ${k}: ${t} (len=${len})${preview}`));
  }

  // ---- 5. Skan audio ----
  step("Skanowanie odpowiedzi w poszukiwaniu audio operatora");
  const hits: Array<{ path: string; kind: string; length: number; sample: string }> = [];
  scanForAudio(json, "", hits);

  if (hits.length === 0) {
    warn("Nie wykryto audio operatora w odpowiedzi (raw B64 / data-url).");
    console.log(
      chalk.gray("  → operator odpowiedział tekstem, lub audio w innym polu/formacie.")
    );
  } else {
    done(`Wykryto ${hits.length} kandydat(-ów) na audio`);
    for (const h of hits) {
      console.log(
        chalk.magenta(`    • path=${h.path}`),
        chalk.gray(`kind=${h.kind} len=${h.length}`),
        chalk.gray(`sample=${h.sample}...`)
      );
    }
    for (let i = 0; i < hits.length; i += 1) {
      const h = hits[i]!;
      const raw = getByPath(json, h.path) as string;
      const cleanB64 = h.kind.startsWith("data-url")
        ? (looksLikeDataUrl(raw)?.b64 ?? "")
        : raw;
      const mp3In = path.join(TMP_DIR, `m2-operator-turn-1-in-${i}.mp3`);
      writeFileSync(mp3In, Buffer.from(cleanB64, "base64"));
      done(`Zapis ${path.basename(mp3In)}`);
      step(`Whisper transkrypt ${path.basename(mp3In)}`);
      try {
        const text = await transcribe(client, mp3In);
        writeFileSync(
          path.join(TMP_DIR, `m2-operator-turn-1-transcript-${i}.txt`),
          text
        );
        console.log(chalk.hex("#FF8C00")(`  🎤 OPERATOR[${i}]: "${text}"`));
      } catch (e) {
        warn(`Whisper błąd: ${(e as Error).message}`);
      }
    }
  }

  console.log("\n" + BORDER);
  console.log(chalk.cyan.bold("  M2 PROBE ZAKOŃCZONY".padEnd(W - 2)));
  console.log(chalk.gray(`  Wyniki: ${TMP_DIR}`));
  console.log(BORDER + "\n");
};

main().catch((e) => {
  console.error(chalk.red("\n✗ Probe failed:"), e);
  process.exit(1);
});
