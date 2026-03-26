import chalk from "chalk";
import type { ModelProvider } from "@ai-devs/ai-core";
import { objectSchema, arraySchema } from "@ai-devs/ai-core";
import type { SearchNormResult, CitiesNormResult } from "./types.ts";

const NORM_MODEL = "gpt-5-mini";

// ── Search Items normalizer ──

const SEARCH_SYSTEM_PROMPT = `Extract search keywords from a natural language product query.
Normalize:
- Units: "10 metrów" → "10m", "sto omów" → "100", "kiloomów" → "kohm"
- Remove filler words: "potrzebuję", "szukam", "chciałbym kupić", "I need"
- Keep technical specs: resistance values, capacitance, voltage, length, wattage
- Keep material types: "miedziany", "stalowy", "metalizowany"
- Keep component types: "rezystor", "kondensator", "kabel", "dioda", "tranzystor"
Return an array of normalized keywords that will be matched against product names.`;

const searchNormSchema = objectSchema({
  keywords: arraySchema(
    { type: "string", description: "Normalized search keyword" },
    "Search keywords extracted from the query",
  ),
});

export async function normalizeSearchQuery(
  provider: ModelProvider,
  query: string,
): Promise<SearchNormResult> {
  const result = await provider.generateStructured<SearchNormResult>({
    messages: [
      { role: "system", content: SEARCH_SYSTEM_PROMPT },
      { role: "user", content: query },
    ],
    schema: searchNormSchema,
    schemaName: "SearchNormResult",
    model: NORM_MODEL,
  });

  console.log(
    chalk.blue(`[norm:search] query="${query}" → keywords=${JSON.stringify(result.data.keywords)}`),
  );
  return result.data;
}

// ── Find Cities normalizer ──

const CITIES_SYSTEM_PROMPT = `Extract a product code or product name from the user's query.
Product codes are short alphanumeric strings (4-8 chars) like "BWST28", "XK2R91", "8R5ENT".
If the user provides a product code, set itemCode to that code and itemName to empty string.
If the user provides a product name or description instead, set itemName to the key phrase and itemCode to empty string.
If both are present, prefer the code.`;

const citiesNormSchema = objectSchema({
  itemCode: { type: "string", description: "Product code (alphanumeric, e.g. BWST28)" },
  itemName: { type: "string", description: "Product name or description if no code given" },
});

export async function normalizeCitiesQuery(
  provider: ModelProvider,
  query: string,
): Promise<CitiesNormResult> {
  const result = await provider.generateStructured<CitiesNormResult>({
    messages: [
      { role: "system", content: CITIES_SYSTEM_PROMPT },
      { role: "user", content: query },
    ],
    schema: citiesNormSchema,
    schemaName: "CitiesNormResult",
    model: NORM_MODEL,
  });

  console.log(
    chalk.blue(
      `[norm:cities] query="${query}" → code="${result.data.itemCode}" name="${result.data.itemName}"`,
    ),
  );
  return result.data;
}
