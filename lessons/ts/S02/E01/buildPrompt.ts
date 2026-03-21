import { readFileSync, existsSync } from "fs";
import type { Product } from "./types.ts";

const PROMPT_FILE = "lessons/ts/resources/S02E01/current-prompt.txt";

const DEFAULT_PROMPT = `DNG=weapon/explosive. NEU=everything else. Reactor/nuclear=ALWAYS NEU. Reply one word.
{code}: {description}`;

export function loadPromptTemplate(): string {
  if (existsSync(PROMPT_FILE)) {
    return readFileSync(PROMPT_FILE, "utf-8").trim();
  }
  return DEFAULT_PROMPT;
}

export function buildPrompt(template: string, product: Product): string {
  return template
    .replace("{code}", product.code)
    .replace("{description}", product.description);
}
