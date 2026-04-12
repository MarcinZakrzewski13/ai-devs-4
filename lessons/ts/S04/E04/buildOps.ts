// Czysta funkcja: ExtractedData → FsOp[] (bez LLM, bez side-effectów).
//
// Kolejność operacji (ważne z powodu ograniczeń API):
//   1. reset                               — czysty start
//   2. createDirectory /miasta, /osoby, /towary
//   3. createFile /miasta/*                — muszą być PIERWSZE, bo osoby i towary do nich linkują
//      (reguła API: "markdown links must point to existing files")
//   4. createFile /osoby/*                 — link do /miasta/{miasto}
//   5. createFile /towary/*                — linki do /miasta/{sprzedawcy...}
//
// UWAGA: "done" NIE jest częścią batch_mode (patrz api-help.json — allowed_actions).
// Wysyłane jest osobno po pomyślnym batchu (patrz callFilesystem.ts).
//
// Walidacja nazw wg api-help: ^[a-z0-9_]+$, max 20 znaków dla pliku, 30 dla katalogu.

import type { ExtractedData, FsOp } from "./types.ts";

const NAME_PATTERN = /^[a-z0-9_]+$/;
const MAX_FILE_NAME = 20;

function assertValidName(name: string, kind: string): void {
  if (!NAME_PATTERN.test(name)) {
    throw new Error(`Invalid ${kind} name "${name}" — must match ^[a-z0-9_]+$`);
  }
  if (name.length > MAX_FILE_NAME) {
    throw new Error(`${kind} name "${name}" too long (${name.length} > ${MAX_FILE_NAME})`);
  }
}

/** Treść pliku /miasta/{nazwa}: surowy JSON z potrzebami.
 *  UWAGA: walidator (done) parsuje zawartość jako JSON object, więc NIE
 *  pakujemy w markdown code block (reguła "markdown only" dopuszcza plain text). */
function cityContent(potrzeby: { towar: string; ilosc: number }[]): string {
  const obj: Record<string, number> = {};
  for (const p of potrzeby) obj[p.towar] = p.ilosc;
  return JSON.stringify(obj, null, 2) + "\n";
}

/** Treść pliku /osoby/{imie_nazwisko}: imię + link markdown do miasta. */
function personContent(imie: string, nazwisko: string, miasto: string): string {
  const fullName = nazwisko ? `${capitalize(imie)} ${capitalize(nazwisko)}` : capitalize(imie);
  return `${fullName}\n\n[${miasto}](/miasta/${miasto})\n`;
}

/** Treść pliku /towary/{nazwa}: markdown linki do wszystkich miast-sprzedawców. */
function goodContent(sprzedawcy: string[]): string {
  const unique = Array.from(new Set(sprzedawcy)).sort();
  const lines = unique.map((m) => `- [${m}](/miasta/${m})`);
  return lines.join("\n") + "\n";
}

function capitalize(s: string): string {
  return s.length === 0 ? s : s[0]!.toUpperCase() + s.slice(1);
}

/** Operacje do wysłania w batch_mode. "done" jest wywoływane osobno. */
export type BatchOp = Exclude<FsOp, { action: "done" }>;

export function buildOps(data: ExtractedData): BatchOp[] {
  const ops: BatchOp[] = [];

  // 1. reset
  ops.push({ action: "reset" });

  // 2. dirs
  ops.push({ action: "createDirectory", path: "/miasta" });
  ops.push({ action: "createDirectory", path: "/osoby" });
  ops.push({ action: "createDirectory", path: "/towary" });

  // 3. miasta (muszą być przed osobami/towarami — linki MD muszą wskazywać istniejące pliki)
  for (const city of data.miasta) {
    assertValidName(city.nazwa, "city");
    ops.push({
      action: "createFile",
      path: `/miasta/${city.nazwa}`,
      content: cityContent(city.potrzeby),
    });
  }

  // 4. osoby
  for (const person of data.osoby) {
    const fileName = person.nazwisko
      ? `${person.imie}_${person.nazwisko}`
      : person.imie;
    assertValidName(fileName, "person");
    assertValidName(person.miasto, "person.miasto");
    ops.push({
      action: "createFile",
      path: `/osoby/${fileName}`,
      content: personContent(person.imie, person.nazwisko, person.miasto),
    });
  }

  // 5. towary
  for (const good of data.towary) {
    assertValidName(good.nazwa, "good");
    for (const seller of good.sprzedawcy) assertValidName(seller, "good.seller");
    ops.push({
      action: "createFile",
      path: `/towary/${good.nazwa}`,
      content: goodContent(good.sprzedawcy),
    });
  }

  return ops;
}
