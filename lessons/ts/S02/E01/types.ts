export type Product = {
  code: string;
  description: string;
};

export type Classification = "DNG" | "NEU";

export type ItemResult = {
  code: string;
  description: string;
  output: Classification | string;
  expected?: Classification;
  correct: boolean;
  tokens: number;
  cachedTokens: number;
  inputCost: number;
  balanceAfter: number;
};

export type CycleResult = {
  attempt: number;
  promptTemplate: string;
  promptTokens: number;
  items: ItemResult[];
  totalTested: number;
  totalCorrect: number;
  budgetExceeded: boolean;
  cacheHitRate: number;
  flag?: string;
};
