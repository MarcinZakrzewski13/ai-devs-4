import type { BoardState } from "./types.ts";

/**
 * Hardcoded target board state (solved_electricity.png).
 * Detected by pixel analysis, verified to form a valid closed circuit.
 *
 *   BR  | BLR | LR
 *   BT  | BRT | BLR
 *   LRT | LT  | RT
 *
 * External connections:
 *   3x1 LEFT  -> emergency power source
 *   1x3 RIGHT -> PWR6132PL
 *   2x3 RIGHT -> PWR1593PL
 *   3x3 RIGHT -> PWR7264PL
 */
export const TARGET_STATE: BoardState = {
  "1x1": "BR",
  "1x2": "BLR",
  "1x3": "LR",
  "2x1": "BT",
  "2x2": "BRT",
  "2x3": "BLR",
  "3x1": "LRT",
  "3x2": "LT",
  "3x3": "RT",
};
