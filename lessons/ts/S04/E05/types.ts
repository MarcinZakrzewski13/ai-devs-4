export type CityEntry = {
  city: string;
  items: Record<string, number>;
};

export type HubResponse = {
  code: number;
  message?: string;
  flag?: string;
  [key: string]: unknown;
};

export type AgentResult = {
  finished: boolean;
  flag?: string;
  summary: string;
};
