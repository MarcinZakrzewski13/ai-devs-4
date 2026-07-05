export type ShellResult = {
  output: string;
  flag?: string;
  raw: unknown;
};

export type RafalAnswer = {
  date: string;
  city: string;
  longitude: number;
  latitude: number;
};

export type AgentResult = {
  finished: boolean;
  flag?: string;
  summary: string;
};
