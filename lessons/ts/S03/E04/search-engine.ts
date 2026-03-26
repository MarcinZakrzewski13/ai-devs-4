import type { CsvData, SearchNormResult, CitiesNormResult } from "./types.ts";

function removeDiacritics(text: string): string {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function normalize(text: string): string {
  return removeDiacritics(text).toLowerCase();
}

const MAX_ITEMS_RESULT = 10;
const MAX_RESPONSE_BYTES = 490; // leave margin for JSON wrapper

/**
 * Search items by keywords (AND logic, OR fallback).
 * Returns formatted string: "ItemName (CODE), ItemName2 (CODE2)"
 */
export function searchItems(data: CsvData, norm: SearchNormResult): string {
  const keywords = norm.keywords.map(normalize);

  if (keywords.length === 0) {
    return "No keywords provided. Please describe the product you are looking for.";
  }

  // AND match: all keywords must appear
  let matches = data.items.filter((item) =>
    keywords.every((kw) => item.nameNormalized.includes(kw)),
  );

  // OR fallback if AND yields nothing
  if (matches.length === 0) {
    matches = data.items.filter((item) =>
      keywords.some((kw) => item.nameNormalized.includes(kw)),
    );
  }

  if (matches.length === 0) {
    return "No products found matching your query. Try different keywords or be more specific.";
  }

  // Limit results to fit in 500B
  const limited = matches.slice(0, MAX_ITEMS_RESULT);
  let result = limited.map((m) => `${m.name} (${m.code})`).join(", ");

  // Truncate if over byte limit
  while (Buffer.byteLength(result, "utf-8") > MAX_RESPONSE_BYTES && limited.length > 1) {
    limited.pop();
    result = limited.map((m) => `${m.name} (${m.code})`).join(", ");
  }

  if (matches.length > limited.length) {
    result += ` [+${matches.length - limited.length} more]`;
  }

  return result;
}

/**
 * Find cities for a given item code or name.
 * Returns formatted string: "CityA, CityB, CityC"
 */
export function findCities(data: CsvData, norm: CitiesNormResult): string {
  let itemCode = norm.itemCode?.trim();

  // If no code, try to find by name
  if (!itemCode && norm.itemName) {
    const nameLower = normalize(norm.itemName);
    const found = data.items.find(
      (i) => i.nameNormalized.includes(nameLower) || i.code === norm.itemName,
    );
    if (found) {
      itemCode = found.code;
    } else {
      return `Product "${norm.itemName}" not found. Use /search-items first to get the product code.`;
    }
  }

  if (!itemCode) {
    return "No product code or name provided. Send a product code like 'BWST28'.";
  }

  const cityCodes = data.connectionsByItem.get(itemCode);
  if (!cityCodes || cityCodes.length === 0) {
    return `No cities found selling product ${itemCode}. Check the code and try again.`;
  }

  const cityNames = cityCodes
    .map((cc) => data.cityByCode.get(cc))
    .filter(Boolean) as string[];

  if (cityNames.length === 0) {
    return `Product ${itemCode} has connections but cities not found in database.`;
  }

  let result = cityNames.join(", ");

  // Truncate if needed
  if (Buffer.byteLength(result, "utf-8") > MAX_RESPONSE_BYTES) {
    const trimmed: string[] = [];
    for (const name of cityNames) {
      trimmed.push(name);
      const candidate = trimmed.join(", ");
      if (Buffer.byteLength(candidate, "utf-8") > MAX_RESPONSE_BYTES) {
        trimmed.pop();
        break;
      }
    }
    result = trimmed.join(", ") + ` [+${cityNames.length - trimmed.length} more]`;
  }

  return result;
}
