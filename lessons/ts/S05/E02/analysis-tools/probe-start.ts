/**
 * M1 exploratory probe — S05E02 phonecall
 *
 * Cel:
 *   - POST { apikey, task: "phonecall", answer: { action: "start" } } na hub.ag3nts.org/verify
 *   - Zrzut surowej odpowiedzi JSON.
 *   - Automatyczne wykrycie pól z audio (Base64/MP3) i zapis do plików mp3.
 *   - Whisper transkrypt (jeśli audio się pojawi).
 *   - Raport w konsoli: nazwy pól, typy, długości, obecność audio, format.
 *
 * BEZ wysyłania kolejnych audio. Tylko rozpoznanie protokołu.
 *
 * Modele:
 *   - whisper-1 (S2T) — transkrypcja audio operatora.
 *
 * Uruchomienie:
 *   bun run lessons/ts/S05/E02/analysis-tools/probe-start.ts
 */
import { writeFileSync, createReadStream, mkdirSync } from "node:fs";
import path from "node:path";
import chalk from "chalk";
import OpenAI from "openai";

const HUB_URL = "https://hub.ag3nts.org/verify";
const TASK = "phonecall";
const TMP_DIR = path.resolve("lessons/ts/resources/S05E02/tmp/attempt-0-probe");
const WHISPER_MODEL = "whisper-1";

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
    // MP3: ID3 header ("ID3") lub frame sync 0xFF 0xFB/0xF3/0xF2
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

const transcribe = async (mp3Path: string): Promise<string> => {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const res = await client.audio.transcriptions.create({
    model: WHISPER_MODEL,
    file: createReadStream(mp3Path),
    language: "pl",
  });
  return res.text;
};

const main = async (): Promise<void> => {
  console.log("\n" + BORDER);
  console.log(chalk.cyan.bold("  S05E02 · M1 EXPLORATORY PROBE".padEnd(W - 2)));
  console.log(
    chalk.gray("  POST action:start → dump raw → detect audio → whisper")
  );
  console.log(BORDER + "\n");

  const apikey = process.env.API_KEY_AI_DEVS4;
  if (!apikey) {
    console.log(chalk.red("  ✗ API_KEY_AI_DEVS4 nie ustawione w .env"));
    process.exit(1);
  }

  mkdirSync(TMP_DIR, { recursive: true });

  step("POST /verify { action: start }");
  const payload = { apikey, task: TASK, answer: { action: "start" } };
  const t0 = Date.now();
  const res = await fetch(HUB_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const dt = Date.now() - t0;
  const rawText = await res.text();
  done(`HTTP ${res.status} (${dt}ms, ${rawText.length}B body)`);

  writeFileSync(path.join(TMP_DIR, "raw-start-response.txt"), rawText);

  let json: unknown = null;
  try {
    json = JSON.parse(rawText);
    writeFileSync(
      path.join(TMP_DIR, "raw-start-response.json"),
      JSON.stringify(json, null, 2)
    );
    done("Zapis raw-start-response.json");
  } catch {
    warn("Odpowiedź nie jest JSON — zapisano jako .txt");
    console.log(chalk.gray("  Preview:"), rawText.slice(0, 300));
    return;
  }

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
      typeof v === "string" ? ` "${v.slice(0, 80).replace(/\n/g, "\\n")}"` : "";
    console.log(chalk.gray(`    ${k}: ${t} (len=${len})${preview}`));
  }

  step("Skanowanie odpowiedzi w poszukiwaniu audio Base64");
  const hits: Array<{ path: string; kind: string; length: number; sample: string }> = [];
  scanForAudio(json, "", hits);

  if (hits.length === 0) {
    warn("Nie wykryto pól z audio Base64 (ID3/frame sync/data-url).");
    console.log(
      chalk.gray("  → operator może odpowiedzieć tekstem, lub audio jest w innym formacie.")
    );
  } else {
    done(`Wykryto ${hits.length} kandydat(-ów) na audio`);
    for (const h of hits) {
      console.log(
        chalk.magenta(`    • path=${h.path}`),
        chalk.gray(`kind=${h.kind}`),
        chalk.gray(`len=${h.length}`),
        chalk.gray(`sample=${h.sample}...`)
      );
    }

    for (let i = 0; i < hits.length; i += 1) {
      const h = hits[i]!;
      const b64 =
        h.kind.startsWith("data-url")
          ? h.sample /* placeholder — re-extract below */
          : (getByPath(json, h.path) as string);
      let cleanB64 = b64;
      if (h.kind.startsWith("data-url")) {
        const dataUrl = looksLikeDataUrl(getByPath(json, h.path) as string);
        cleanB64 = dataUrl ? dataUrl.b64 : "";
      }
      const mp3Path = path.join(TMP_DIR, `raw-start-audio-${i}.mp3`);
      writeFileSync(mp3Path, Buffer.from(cleanB64, "base64"));
      done(`Zapis ${path.basename(mp3Path)} (${cleanB64.length} B64 chars)`);

      if (!process.env.OPENAI_API_KEY) {
        warn("Brak OPENAI_API_KEY — pomijam whisper transkrypt.");
        continue;
      }
      step(`Whisper transkrypt ${path.basename(mp3Path)}`);
      try {
        const text = await transcribe(mp3Path);
        writeFileSync(
          path.join(TMP_DIR, `raw-start-transcript-${i}.txt`),
          text
        );
        console.log(
          chalk.hex("#FF8C00")(`  🎤 TRANSCRIPT[${i}]: "${text}"`)
        );
      } catch (e) {
        warn(`Whisper błąd: ${(e as Error).message}`);
      }
    }
  }

  console.log("\n" + BORDER);
  console.log(chalk.cyan.bold("  PROBE ZAKOŃCZONY".padEnd(W - 2)));
  console.log(chalk.gray(`  Wyniki: ${TMP_DIR}`));
  console.log(BORDER + "\n");
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

main().catch((e) => {
  console.error(chalk.red("\n✗ Probe failed:"), e);
  process.exit(1);
});
