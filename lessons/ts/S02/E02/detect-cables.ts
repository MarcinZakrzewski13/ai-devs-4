import sharp from "sharp";
import chalk from "chalk";
import type { BoardState, CellEdge } from "./types.ts";

const BLACK_THRESHOLD = 80;
const EDGE_RATIO_THRESHOLD = 0.3;

type GridBounds = {
  vLines: number[]; // 4 vertical grid lines
  hLines: number[]; // 4 horizontal grid lines
};

/**
 * Detect grid boundaries by finding vertical grid lines (reliable)
 * and computing horizontal lines from grid geometry (square grid).
 */
async function detectGrid(pngBuffer: Buffer): Promise<{
  bounds: GridBounds;
  data: Buffer;
  width: number;
  height: number;
  channels: number;
}> {
  const { data, info } = await sharp(pngBuffer).raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, CH = info.channels;

  function isBlackAt(x: number, y: number): boolean {
    if (x < 0 || x >= W || y < 0 || y >= H) return false;
    const idx = (y * W + x) * CH;
    return data[idx] < BLACK_THRESHOLD && data[idx + 1] < BLACK_THRESHOLD && data[idx + 2] < BLACK_THRESHOLD;
  }

  // Step 1: Find vertical grid lines (columns with >50% black pixels)
  const vCandidates: number[] = [];
  for (let x = Math.floor(W * 0.15); x < W; x++) {
    let black = 0;
    for (let y = 0; y < H; y++) {
      if (isBlackAt(x, y)) black++;
    }
    if (black / H > 0.5) vCandidates.push(x);
  }

  const vLines = clusterLines(vCandidates);

  if (vLines.length < 4) {
    throw new Error(`Grid detection failed: found only ${vLines.length} vertical lines`);
  }

  // Take last 4 vertical lines (skip any spurious early detections)
  const v4 = vLines.slice(-4);
  const cellWidth = Math.round((v4[3] - v4[0]) / 3);

  // Step 2: Find grid top by scanning for first horizontal line
  // that spans the grid width (from v4[0] to v4[3])
  let gridTop = -1;
  for (let y = 0; y < H; y++) {
    let black = 0;
    const gridW = v4[3] - v4[0];
    for (let x = v4[0]; x <= v4[3]; x++) {
      if (isBlackAt(x, y)) black++;
    }
    if (black / gridW > 0.6) {
      gridTop = y;
      break;
    }
  }

  if (gridTop < 0) {
    throw new Error("Could not find grid top border");
  }

  // Grid is approximately square (same cell width and height)
  const cellHeight = cellWidth;
  const h4 = [
    gridTop,
    gridTop + cellHeight,
    gridTop + 2 * cellHeight,
    gridTop + 3 * cellHeight,
  ];

  console.log(chalk.gray(`  [detectGrid] vLines: ${v4.join(", ")} | hLines: ${h4.join(", ")} | cell: ${cellWidth}x${cellHeight}px`));

  return {
    bounds: { vLines: v4, hLines: h4 },
    data,
    width: W,
    height: H,
    channels: CH,
  };
}

function clusterLines(candidates: number[], gap = 10): number[] {
  if (candidates.length === 0) return [];
  const clusters: number[][] = [[candidates[0]]];
  for (let i = 1; i < candidates.length; i++) {
    if (candidates[i] - candidates[i - 1] <= gap) {
      clusters[clusters.length - 1].push(candidates[i]);
    } else {
      clusters.push([candidates[i]]);
    }
  }
  return clusters.map((c) => c[Math.floor(c.length / 2)]);
}

/**
 * Detect cable connections for all 9 cells by scanning pixel values
 * at cell edges.
 */
export async function detectCables(pngBuffer: Buffer): Promise<BoardState> {
  const { bounds, data, width: W, height: H, channels: CH } = await detectGrid(pngBuffer);
  const { vLines, hLines } = bounds;

  function isBlack(x: number, y: number): boolean {
    if (x < 0 || x >= W || y < 0 || y >= H) return false;
    const idx = (y * W + x) * CH;
    return data[idx] < BLACK_THRESHOLD && data[idx + 1] < BLACK_THRESHOLD && data[idx + 2] < BLACK_THRESHOLD;
  }

  const MARGIN = 8; // skip grid line pixels (grid lines are ~3-4px wide)

  function scanEdge(row: number, col: number, edge: CellEdge): number {
    const x1 = vLines[col] + MARGIN;
    const x2 = vLines[col + 1] - MARGIN;
    const y1 = hLines[row] + MARGIN;
    const y2 = hLines[row + 1] - MARGIN;

    const cellW = x2 - x1;
    const cellH = y2 - y1;

    // Scan middle 50% of edge to avoid corners
    const sf = 0.25, ef = 0.75;
    let blackCount = 0, total = 0;

    if (edge === "T") {
      for (let x = x1 + Math.floor(cellW * sf); x <= x1 + Math.floor(cellW * ef); x++) {
        for (let dy = 0; dy < 4; dy++) { if (isBlack(x, y1 + dy)) blackCount++; total++; }
      }
    } else if (edge === "B") {
      for (let x = x1 + Math.floor(cellW * sf); x <= x1 + Math.floor(cellW * ef); x++) {
        for (let dy = 0; dy < 4; dy++) { if (isBlack(x, y2 - dy)) blackCount++; total++; }
      }
    } else if (edge === "L") {
      for (let y = y1 + Math.floor(cellH * sf); y <= y1 + Math.floor(cellH * ef); y++) {
        for (let dx = 0; dx < 4; dx++) { if (isBlack(x1 + dx, y)) blackCount++; total++; }
      }
    } else if (edge === "R") {
      for (let y = y1 + Math.floor(cellH * sf); y <= y1 + Math.floor(cellH * ef); y++) {
        for (let dx = 0; dx < 4; dx++) { if (isBlack(x2 - dx, y)) blackCount++; total++; }
      }
    }

    return total > 0 ? blackCount / total : 0;
  }

  const state: BoardState = {};

  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const pos = `${r + 1}x${c + 1}`;
      const edges: CellEdge[] = [];
      const ratios: Record<string, number> = {};

      for (const edge of ["T", "R", "B", "L"] as CellEdge[]) {
        const ratio = scanEdge(r, c, edge);
        ratios[edge] = ratio;
        if (ratio > EDGE_RATIO_THRESHOLD) {
          edges.push(edge);
        }
      }

      state[pos] = edges.sort().join("");
      console.log(chalk.gray(`    ${pos}: ${state[pos].padEnd(5)} T=${ratios.T.toFixed(2)} R=${ratios.R.toFixed(2)} B=${ratios.B.toFixed(2)} L=${ratios.L.toFixed(2)}`));
    }
  }

  console.log(chalk.cyan("[detectCables] Board state:"));
  for (let r = 1; r <= 3; r++) {
    const row = [1, 2, 3].map((c) => (state[`${r}x${c}`] ?? "???").padEnd(5)).join(" | ");
    console.log(chalk.white(`  ${row}`));
  }

  return state;
}
