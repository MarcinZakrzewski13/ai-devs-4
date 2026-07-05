import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import chalk from "chalk";
import type { Phase } from "./types.ts";

const STORE_PATH = path.resolve(
  "lessons/ts/resources/S05E02/successful-phrases.json"
);

type Store = Partial<Record<Phase, string[]>>;

const load = (): Store => {
  if (!existsSync(STORE_PATH)) return {};
  try {
    return JSON.parse(readFileSync(STORE_PATH, "utf8")) as Store;
  } catch {
    return {};
  }
};

const save = (data: Store): void => {
  mkdirSync(path.dirname(STORE_PATH), { recursive: true });
  writeFileSync(STORE_PATH, JSON.stringify(data, null, 2));
};

export const getSuccessfulPhrase = (phase: Phase): string | null => {
  const store = load();
  const arr = store[phase];
  if (!arr || arr.length === 0) return null;
  const chosen = arr[arr.length - 1]!;
  console.log(
    chalk.green(`  [phrases] reuse ${phase}: "${chosen.slice(0, 80)}..."`)
  );
  return chosen;
};

export const recordSuccessfulPhrase = (phase: Phase, phrase: string): void => {
  const store = load();
  const arr = store[phase] ?? [];
  if (!arr.includes(phrase)) {
    arr.push(phrase);
    store[phase] = arr;
    save(store);
    console.log(
      chalk.green.bold(`  [phrases] SAVED ${phase}: "${phrase.slice(0, 80)}..."`)
    );
  }
};

export const listPhrases = (): void => {
  const store = load();
  console.log(chalk.gray(`  [phrases] store: ${JSON.stringify(Object.keys(store))}`));
};
