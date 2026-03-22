import chalk from "chalk";
import type { BoardState, CellEdge, RotationPlan } from "./types.ts";
import { ALL_POSITIONS } from "./types.ts";

const ROTATION_MAP: Record<CellEdge, CellEdge> = {
  T: "R",
  R: "B",
  B: "L",
  L: "T",
};

/** Rotate connections string 90 degrees clockwise, N times. */
export function rotateConnections(connections: string, times: number): string {
  let edges = connections.split("") as CellEdge[];

  for (let i = 0; i < times % 4; i++) {
    edges = edges.map((e) => ROTATION_MAP[e]);
  }

  return edges.sort().join("");
}

/**
 * Compare current and target board states.
 * Returns the number of 90-degree CW rotations needed per cell (0-3).
 * Throws if any cell cannot be matched (Vision error).
 */
export function computeRotations(
  current: BoardState,
  target: BoardState
): RotationPlan {
  const plan: RotationPlan = [];
  const errors: string[] = [];

  for (const pos of ALL_POSITIONS) {
    const cur = current[pos] ?? "";
    const tgt = target[pos] ?? "";

    // Cross (BLRT) and empty are rotation-invariant
    if (cur === tgt) continue;

    let found = false;
    for (let n = 1; n <= 3; n++) {
      if (rotateConnections(cur, n) === tgt) {
        plan.push({ cell: pos, rotations: n });
        found = true;
        break;
      }
    }

    if (!found) {
      errors.push(`${pos}: current="${cur}" cannot match target="${tgt}" with any rotation`);
    }
  }

  if (errors.length > 0) {
    console.log(chalk.red("[computeRotations] Mismatches (likely Vision errors):"));
    for (const err of errors) console.log(chalk.red(`  ${err}`));
    throw new Error(`Vision mismatch on ${errors.length} cell(s): ${errors.join("; ")}`);
  }

  console.log(chalk.cyan("[computeRotations] Rotation plan:"));
  if (plan.length === 0) {
    console.log(chalk.green("  Board already matches target!"));
  } else {
    for (const { cell, rotations } of plan) {
      console.log(chalk.white(`  ${cell}: ${rotations}x 90° CW`));
    }
    const totalCalls = plan.reduce((sum, s) => sum + s.rotations, 0);
    console.log(chalk.gray(`  Total API calls: ${totalCalls}`));
  }

  return plan;
}
