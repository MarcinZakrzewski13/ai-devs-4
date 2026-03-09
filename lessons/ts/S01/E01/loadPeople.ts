import fs from "fs";
import path from "path";
import type { PersonRecord } from "./types.ts";

const CSV_PATH = path.join(import.meta.dir, "../../resources/people.csv");

/** Parses a single CSV line, handling quoted fields with commas inside. */
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let inQuotes = false;
  let current = "";
  for (const ch of line) {
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      fields.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

/** Reads and parses people.csv into an array of PersonRecord. */
export function loadPeople(): PersonRecord[] {
  const text = fs.readFileSync(CSV_PATH, "utf-8");
  const lines = text.trim().split("\n");
  const headers = parseCsvLine(lines[0]) as (keyof PersonRecord)[];

  return lines.slice(1).map((line) => {
    const fields = parseCsvLine(line);
    return Object.fromEntries(
      headers.map((h, i) => [h, fields[i] ?? ""])
    ) as PersonRecord;
  });
}
