import chalk from "chalk";
import type { ApiBlock, Command, ReactorState } from "./types";

type Direction = "forward" | "backward";

export function decideCommand(state: ReactorState, direction: Direction = "forward"): Command {
  const { playerCol, blocks } = state;
  const predicted = predictBlocks(blocks);

  const primaryCmd: Command = direction === "forward" ? "right" : "left";
  const escapeCmd: Command = direction === "forward" ? "left" : "right";
  const targetCol = direction === "forward" ? playerCol + 1 : playerCol - 1;
  const escapeCol = direction === "forward" ? playerCol - 1 : playerCol + 1;

  const targetSafe = !isBlockedAt(predicted, targetCol, 5);
  const staySafe = !isBlockedAt(predicted, playerCol, 5);
  const escapeSafe = !isBlockedAt(predicted, escapeCol, 5);

  console.log(chalk.gray(
    `  [predict] target(col${targetCol}):${targetSafe ? "OK" : "XX"} ` +
    `stay(col${playerCol}):${staySafe ? "OK" : "XX"} ` +
    `escape(col${escapeCol}):${escapeSafe ? "OK" : "XX"}`
  ));

  if (targetSafe) return primaryCmd;
  if (staySafe) return "wait";
  if (escapeSafe) return escapeCmd;

  console.log(chalk.red("  [predict] All directions blocked! Waiting..."));
  return "wait";
}

export function predictBlocks(blocks: ApiBlock[]): ApiBlock[] {
  return blocks.map((b) => {
    if (b.direction === "down") {
      const newTop = b.top_row + 1;
      const newBottom = newTop + 1;
      return {
        col: b.col,
        top_row: newTop,
        bottom_row: newBottom,
        direction: newBottom >= 5 ? "up" as const : "down" as const,
      };
    } else {
      const newTop = b.top_row - 1;
      const newBottom = newTop + 1;
      return {
        col: b.col,
        top_row: newTop,
        bottom_row: newBottom,
        direction: newTop <= 1 ? "down" as const : "up" as const,
      };
    }
  });
}

export function isBlockedAt(blocks: ApiBlock[], col: number, row: number): boolean {
  return blocks.some(
    (b) => b.col === col && row >= b.top_row && row <= b.bottom_row
  );
}

// Simulate 5x right + 5x left and check if all moves are safe
export function canDoCleanRoundTrip(blocks: ApiBlock[]): boolean {
  let simBlocks = blocks;
  let col = 1;

  // 5x right: col 1→2→3→4→5→6
  for (let i = 0; i < 5; i++) {
    const predicted = predictBlocks(simBlocks);
    if (isBlockedAt(predicted, col + 1, 5)) return false;
    col++;
    simBlocks = predicted;
  }

  // 5x left: col 6→5→4→3→2→1
  for (let i = 0; i < 5; i++) {
    const predicted = predictBlocks(simBlocks);
    if (isBlockedAt(predicted, col - 1, 5)) return false;
    col--;
    simBlocks = predicted;
  }

  return true;
}
