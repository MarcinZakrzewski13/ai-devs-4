// === Map & pathfinding types ===

export type Cell = "." | "T" | "W" | "R" | "S" | "G";

export type Direction = "up" | "down" | "left" | "right";
export type Command = Direction | "dismount";
export type VehicleName = "rocket" | "car" | "horse" | "walk";

export type Position = { row: number; col: number };

export type Vehicle = {
  name: VehicleName;
  fuel: number;
  food: number;
  canCrossWater: boolean;
};

export type GameMap = {
  cityName: string;
  grid: Cell[][];
  start: Position;
  goal: Position;
};

export type PathResult = {
  vehicle: VehicleName;
  commands: string[];
  fuelUsed: number;
  foodUsed: number;
  steps: number;
};

// === Knowledge base types ===

export type KnowledgeCategory =
  | "endpoints"
  | "map"
  | "vehicles"
  | "terrain_rules"
  | "other";

export type KnowledgeEntry = {
  key: string;
  value: string;
};

export type KnowledgeBase = {
  endpoints: KnowledgeEntry[];
  map: KnowledgeEntry[];
  vehicles: KnowledgeEntry[];
  terrainRules: KnowledgeEntry[];
  other: KnowledgeEntry[];
};

// === Agent types ===

export type AgentResult = {
  finished: boolean;
  summary: string;
};
