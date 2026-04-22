import chalk from "chalk";
import type { Fact, FactKind, FactCandidate } from "./types.ts";

const store: Fact[] = [];

export const appendFact = (fact: Fact): void => {
  store.push(fact);
  console.log(
    chalk.magenta(
      `  ◈ FACT [${fact.kind}] "${fact.value.slice(0, 50)}" confidence=${fact.confidence.toFixed(2)}`
    )
  );
};

export const appendFacts = (facts: Fact[]): void => {
  facts.forEach(appendFact);
};

export const dump = (): Fact[] => [...store];

export const aggregate = (): Record<FactKind, FactCandidate[]> => {
  const byKind: Record<string, Map<string, FactCandidate>> = {};

  for (const fact of store) {
    if (fact.kind === "other") continue;
    if (!byKind[fact.kind]) byKind[fact.kind] = new Map();

    const key = fact.value.trim().toLowerCase();
    const existing = byKind[fact.kind].get(key);
    if (existing) {
      existing.votes++;
      existing.totalConfidence += fact.confidence;
    } else {
      byKind[fact.kind].set(key, {
        value: fact.value.trim(),
        votes: 1,
        totalConfidence: fact.confidence,
      });
    }
  }

  const result: Record<string, FactCandidate[]> = {};
  for (const [kind, map] of Object.entries(byKind)) {
    result[kind] = [...map.values()].sort(
      (a, b) =>
        b.totalConfidence / b.votes - a.totalConfidence / a.votes ||
        b.votes - a.votes
    );
  }

  return result as Record<FactKind, FactCandidate[]>;
};

export const getCount = () => store.length;
