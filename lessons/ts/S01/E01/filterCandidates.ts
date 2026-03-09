import type { PersonRecord } from "./types.ts";

const CURRENT_YEAR = 2026;
const MIN_AGE = 20;
const MAX_AGE = 40;

/**
 * Filters persons to candidates matching all criteria:
 * - male
 * - born in Grudziądz
 * - aged 20–40 in 2026 (birth year 1986–2006)
 */
export function filterCandidates(persons: PersonRecord[]): PersonRecord[] {
  return persons.filter((p) => {
    if (p.gender !== "M") return false;
    if (p.birthPlace !== "Grudziądz") return false;
    const year = parseInt(p.birthDate.slice(0, 4), 10);
    const age = CURRENT_YEAR - year;
    return age >= MIN_AGE && age <= MAX_AGE;
  });
}
