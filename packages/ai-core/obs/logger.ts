import chalk from "chalk";

export type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

let currentLevel: LogLevel = "info";

export const setLogLevel = (level: LogLevel): void => {
  currentLevel = level;
};

const shouldLog = (level: LogLevel): boolean =>
  LEVEL_ORDER[level] >= LEVEL_ORDER[currentLevel];

const prefix = (level: LogLevel, tag?: string): string => {
  const tagPart = tag ? chalk.gray(`[${tag}] `) : "";
  switch (level) {
    case "debug": return tagPart + chalk.gray("[debug]");
    case "info":  return tagPart + chalk.blue("[info]");
    case "warn":  return tagPart + chalk.yellow("[warn]");
    case "error": return tagPart + chalk.red("[error]");
  }
};

export const logger = {
  debug: (msg: string, tag?: string): void => {
    if (shouldLog("debug")) console.log(prefix("debug", tag), msg);
  },
  info: (msg: string, tag?: string): void => {
    if (shouldLog("info")) console.log(prefix("info", tag), msg);
  },
  warn: (msg: string, tag?: string): void => {
    if (shouldLog("warn")) console.warn(prefix("warn", tag), msg);
  },
  error: (msg: string, tag?: string): void => {
    if (shouldLog("error")) console.error(prefix("error", tag), msg);
  },
};
