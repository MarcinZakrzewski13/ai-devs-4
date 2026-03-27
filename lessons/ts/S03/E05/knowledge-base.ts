import type {
  KnowledgeBase,
  KnowledgeCategory,
  KnowledgeEntry,
} from "./types";

export function createKnowledgeBase(): KnowledgeBase {
  return {
    endpoints: [],
    map: [],
    vehicles: [],
    terrainRules: [],
    other: [],
  };
}

const CATEGORY_MAP: Record<KnowledgeCategory, keyof KnowledgeBase> = {
  endpoints: "endpoints",
  map: "map",
  vehicles: "vehicles",
  terrain_rules: "terrainRules",
  other: "other",
};

export function addKnowledge(
  kb: KnowledgeBase,
  category: KnowledgeCategory,
  key: string,
  value: string
): void {
  const bucket = CATEGORY_MAP[category];
  kb[bucket].push({ key, value });
}

function renderEntries(entries: KnowledgeEntry[]): string {
  return entries.map((e) => `- **${e.key}:** ${e.value}`).join("\n");
}

export function formatKnowledge(kb: KnowledgeBase): string {
  const sections: string[] = [];

  if (kb.endpoints.length > 0) {
    sections.push(`## Discovered API Endpoints\n${renderEntries(kb.endpoints)}`);
  }
  if (kb.map.length > 0) {
    sections.push(`## Map Data\n${renderEntries(kb.map)}`);
  }
  if (kb.vehicles.length > 0) {
    sections.push(`## Vehicles\n${renderEntries(kb.vehicles)}`);
  }
  if (kb.terrainRules.length > 0) {
    sections.push(`## Terrain & Movement Rules\n${renderEntries(kb.terrainRules)}`);
  }
  if (kb.other.length > 0) {
    sections.push(`## Other Notes\n${renderEntries(kb.other)}`);
  }

  return sections.join("\n\n");
}
