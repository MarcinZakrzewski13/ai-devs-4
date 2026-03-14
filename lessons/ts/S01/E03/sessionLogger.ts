import { mkdir, appendFile } from "fs/promises";
import path from "path";
import chalk from "chalk";

export type SessionLogger = {
  runDir: string;
  logExchange(sessionID: string, userMsg: string, assistantMsg: string): Promise<void>;
};

const formatRunDir = (taskId: string): string => {
  const now = new Date();
  const pad = (n: number, len = 2) => String(n).padStart(len, "0");
  const date =
    now.getFullYear().toString() +
    pad(now.getMonth() + 1) +
    pad(now.getDate());
  const time = pad(now.getHours()) + pad(now.getMinutes());
  return `${taskId}-${date}-${time}`;
};

export const createSessionLogger = async (taskId: string): Promise<SessionLogger> => {
  const dirName = formatRunDir(taskId);
  const runDir = path.join(import.meta.dir, "sessions", dirName);

  await mkdir(runDir, { recursive: true });
  console.log(chalk.gray(`[sessionLogger] Logging sessions to: sessions/${dirName}/`));

  return {
    runDir: dirName,
    async logExchange(sessionID, userMsg, assistantMsg) {
      const entry =
        JSON.stringify({
          timestamp: new Date().toISOString(),
          sessionID,
          user: userMsg,
          assistant: assistantMsg,
        }) + "\n";
      await appendFile(path.join(runDir, `${sessionID}.jsonl`), entry);
    },
  };
};
