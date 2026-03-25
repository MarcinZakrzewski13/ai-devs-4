export type Command = "start" | "right" | "left" | "wait" | "reset";

export type BlockDirection = "up" | "down";

export type ApiBlock = {
  col: number;
  top_row: number;
  bottom_row: number;
  direction: BlockDirection;
};

export type ReactorState = {
  board: string[][];
  playerCol: number;
  goalReached: boolean;
  blocks: ApiBlock[];
};

export type ReactorResponse = {
  code: number;
  message: string;
  flag?: string;
  board?: string[][];
  player?: { col: number; row: number };
  goal?: { col: number; row: number };
  blocks?: ApiBlock[];
  reached_goal?: boolean;
};
