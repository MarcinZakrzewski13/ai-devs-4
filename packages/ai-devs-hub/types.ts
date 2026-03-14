export type AiDevsResponse = {
  code: number;
  message: string;
  error?: string;
  flag?: string;
};

export type FinalAnswerFile = {
  episodeId: string;
  task: string;
  computedAt: string;
  confirmedAt: string;
  flag: string | null;
  answer: unknown;
  hubResponse: AiDevsResponse;
};
