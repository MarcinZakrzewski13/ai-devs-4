export type LogEntry = {
  date: string;
  time: string;
  level: string;
  subsystem: string;
  message: string;
  raw: string;
};

export type IterationResult = {
  flag?: string;
  feedback?: string;
  missingSubsystems?: string[];
};
