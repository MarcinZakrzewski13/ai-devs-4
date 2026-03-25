import type { ReactorResponse, ReactorState } from "./types";

export function parseState(response: ReactorResponse): ReactorState {
  return {
    board: response.board ?? [],
    playerCol: response.player?.col ?? 0,
    goalReached: response.reached_goal ?? false,
    blocks: response.blocks ?? [],
  };
}
