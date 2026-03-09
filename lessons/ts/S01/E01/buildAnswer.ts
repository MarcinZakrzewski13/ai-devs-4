import type { PersonRecord, JobTag, PersonAnswer } from "./types.ts";

/**
 * Combines candidate records with their classified tags.
 * Returns only persons tagged with "transport".
 */
export function buildAnswer(
  candidates: PersonRecord[],
  tagsByIndex: Map<number, JobTag[]>
): PersonAnswer[] {
  return candidates
    .map((person, i) => ({
      person,
      tags: tagsByIndex.get(i) ?? [],
    }))
    .filter(({ tags }) => tags.includes("transport"))
    .map(({ person, tags }) => ({
      name: person.name,
      surname: person.surname,
      gender: person.gender,
      born: parseInt(person.birthDate.slice(0, 4), 10),
      city: person.birthPlace,
      tags,
    }));
}
