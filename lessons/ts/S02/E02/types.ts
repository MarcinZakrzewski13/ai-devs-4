export type CellEdge = "T" | "R" | "B" | "L";

/** Sorted string of connected edges, e.g. "BL", "LR", "BLRT" */
export type CellConnections = string;

/** Board state: cell position "AxB" -> connections string */
export type BoardState = Record<string, CellConnections>;

export type RotationStep = {
  cell: string;
  rotations: number;
};

export type RotationPlan = RotationStep[];

export const ALL_POSITIONS = [
  "1x1", "1x2", "1x3",
  "2x1", "2x2", "2x3",
  "3x1", "3x2", "3x3",
] as const;

export type CellPosition = (typeof ALL_POSITIONS)[number];
