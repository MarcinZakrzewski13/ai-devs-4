// Ładuje notatki Natana z resources/S04E04/natan_notes/
// i scala je w jeden tekst z sekcjami oznaczonymi nagłówkami —
// to jest input dla LLM w extractData.ts.

import { readFile } from "node:fs/promises";
import path from "node:path";

const NOTES_DIR = path.resolve("lessons/ts/resources/S04E04/natan_notes");

// Guardraile — w razie nieoczekiwanej zmiany danych
const MAX_TOTAL_BYTES = 100_000; // ~25k tokenów
const MAX_FILES = 20;

export async function loadNotes(): Promise<string> {
  const files = [
    { name: "ogloszenia", path: path.join(NOTES_DIR, "ogłoszenia.txt") },
    { name: "rozmowy", path: path.join(NOTES_DIR, "rozmowy.txt") },
    { name: "transakcje", path: path.join(NOTES_DIR, "transakcje.txt") },
  ];

  if (files.length > MAX_FILES) {
    throw new Error(`Too many files: ${files.length} > ${MAX_FILES}`);
  }

  const parts: string[] = [];
  let totalBytes = 0;

  for (const f of files) {
    const content = await readFile(f.path, "utf8");
    totalBytes += Buffer.byteLength(content, "utf8");
    if (totalBytes > MAX_TOTAL_BYTES) {
      throw new Error(
        `Notes exceed size guardrail: ${totalBytes} > ${MAX_TOTAL_BYTES} bytes`
      );
    }
    parts.push(`=== ${f.name} ===\n${content.trim()}\n`);
  }

  return parts.join("\n");
}
