// Modele uzyte w zadaniu:
//   - brak (zadanie deterministyczne, zero LLM)

import "dotenv/config";
import chalk from "chalk";
import { sendCommand } from "./reactor-api";
import { parseState } from "./parse-state";
import { predictBlocks, isBlockedAt } from "./decide-command";
import { saveFinalAnswer } from "@ai-devs/ai-devs-hub";
import type { Command, ReactorState } from "./types";

const EPISODE_ID = "S03E03";
const TASK = "reactor";
const STEP_DELAY_MS = 1000;
const MAX_WAITS = 20;

function renderBoard(board: string[][]) {
  if (!board.length) return;
  for (const row of board) {
    console.log(chalk.gray("  " + row.join(" ")));
  }
}

// Move in one direction N times, using wait when the path is blocked
async function moveN(
  state: ReactorState,
  direction: Command, // "right" or "left"
  count: number,
  label: string,
): Promise<ReactorState | null> {
  let moved = 0;
  let waits = 0;

  while (moved < count) {
    await Bun.sleep(STEP_DELAY_MS);

    const predicted = predictBlocks(state.blocks);
    const targetCol = direction === "right" ? state.playerCol + 1 : state.playerCol - 1;
    const safe = !isBlockedAt(predicted, targetCol, 5);

    let cmd: Command;
    if (safe) {
      cmd = direction;
      moved++;
    } else {
      cmd = "wait";
      waits++;
      if (waits > MAX_WAITS) {
        console.log(chalk.red(`  Too many waits (${waits}), stuck!`));
        return null;
      }
    }

    console.log(chalk.yellow(`  [${label} ${moved}/${count}] ${cmd}${cmd === "wait" ? ` (wait #${waits})` : ""}`));
    const resp = await sendCommand(cmd);

    if (resp.code === -920) {
      console.log(chalk.bgRed.white(`  SMASHED!`));
      return null;
    }

    const flagMatch = resp.message?.match(/\{FLG:[^}]+\}/);
    if (flagMatch) {
      console.log(chalk.bgGreen.black(`  Flag: ${flagMatch[0]}`));
      await saveFinalAnswer(EPISODE_ID, TASK, `extra-${label}`, {
        code: resp.code ?? 0,
        message: resp.message ?? "",
      });
    }

    if (resp.board) {
      state = parseState(resp);
      renderBoard(state.board);
    }
  }

  console.log(chalk.green(`  ${label} done: ${count} moves + ${waits} waits`));
  return state;
}

async function main() {
  console.log(chalk.bold("=== S03E03: Reactor — Extra Flag (5R + 5L with waits) ===\n"));

  const startResp = await sendCommand("start");
  let state = parseState(startResp);
  renderBoard(state.board);

  // Phase 1: 5x right (with safety waits)
  const afterRight = await moveN(state, "right", 5, "RIGHT");
  if (!afterRight) return;

  // Phase 2: 5x left (with safety waits)
  const afterLeft = await moveN(afterRight, "left", 5, "LEFT");
  if (!afterLeft) return;

  console.log(chalk.bgGreen.black(`\n  5R + 5L complete! Player back at col ${afterLeft.playerCol}`));
  console.log(chalk.bold("  Check reactor_preview for extra flag."));
}

main().catch(console.error);
