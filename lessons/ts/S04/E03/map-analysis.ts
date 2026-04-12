import type { TileType, ParsedMap } from "./types";

const SYMBOL: Record<TileType, string> = {
  road: "UL",
  tree: "DR",
  house: "DM",
  empty: "  ",
  block1: "B1",
  block2: "B2",
  block3: "B3",
  church: "KS",
  school: "SZ",
  parking: "PK",
  field: "BS",
};

const COLS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K"];

const coordOf = (col: number, row: number): string =>
  `${COLS[col]}${row + 1}`;

export const analyzeMap = (grid: TileType[][], size: number): ParsedMap => {
  const b3Tiles: string[] = [];

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (grid[row][col] === "block3") {
        b3Tiles.push(coordOf(col, row));
      }
    }
  }

  const header = "     " + COLS.map((c) => ` ${c} `).join("");
  const rows = grid.map((row, ri) => {
    const rowNum = String(ri + 1).padStart(2, " ");
    const cells = row.map((t) => SYMBOL[t]).join(" ");
    return `${rowNum}: ${cells}`;
  });

  const asciiMap = [header, ...rows].join("\n");

  return { size, grid, b3Tiles, asciiMap };
};
