/** Types for the Railway API (hub.ag3nts.org/verify with task "railway"). */

export type RailwayAction = { action: string; [key: string]: unknown };

export type RailwayRequest = {
  apikey: string;
  task: "railway";
  answer: RailwayAction;
};

export type RailwayResponse = {
  code: number;
  message: string;
  error?: string;
  flag?: string;
  [key: string]: unknown;
};
