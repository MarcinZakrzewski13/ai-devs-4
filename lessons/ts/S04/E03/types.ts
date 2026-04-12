export type TileType =
  | "road"
  | "tree"
  | "house"
  | "empty"
  | "block1"
  | "block2"
  | "block3"
  | "church"
  | "school"
  | "parking"
  | "field";

export type ParsedMap = {
  size: number;
  grid: TileType[][];
  b3Tiles: string[];
  asciiMap: string;
};

export type AgentResult = {
  finished: boolean;
  summary: string;
};
