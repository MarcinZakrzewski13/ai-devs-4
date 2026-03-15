/**
 * Pobiera dokumentację SPK z hub.ag3nts.org i zapisuje do lessons/ts/resources/.
 * Zachowuje oryginalne nazwy plików.
 */

import chalk from "chalk";
import path from "path";

const DOC_BASE_URL = "https://hub.ag3nts.org/dane/doc/";
const RESOURCES_DIR = path.resolve(import.meta.dir, "../../resources");

/** Lista plików do pobrania (tekstowe + obraz). */
const DOC_FILES = [
  "zalacznik-E.md",
  "zalacznik-F.md",
  "zalacznik-G.md",
  "dodatkowe-wagony.md",
  "trasy-wylaczone.png",
] as const;

/**
 * Pobiera pojedynczy plik i zapisuje do resources.
 * @returns Ścieżka zapisanego pliku
 */
async function fetchAndSave(filename: string): Promise<string> {
  const url = `${DOC_BASE_URL}${filename}`;
  const filePath = path.join(RESOURCES_DIR, filename);

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  }

  const buffer = await res.arrayBuffer();
  await Bun.write(filePath, Buffer.from(buffer));

  console.log(chalk.gray(`  [loadDocs] fetched → ${filename}`));
  return filePath;
}

/**
 * Pobiera wszystkie pliki dokumentacji SPK i zapisuje w resources.
 * @returns Mapę nazwa pliku → ścieżka lokalna
 */
export async function loadDocs(): Promise<Map<string, string>> {
  const results = new Map<string, string>();

  for (const filename of DOC_FILES) {
    const filePath = await fetchAndSave(filename);
    results.set(filename, filePath);
  }

  return results;
}
