import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const BASE = "lessons/ts/resources/S05E02/tmp";

export const attemptDir = (attemptId: number): string => {
  const dir = path.resolve(BASE, `attempt-${attemptId}`);
  mkdirSync(dir, { recursive: true });
  return dir;
};

export const paths = (attemptId: number, seq: number, role: "in" | "out") => {
  const dir = attemptDir(attemptId);
  return {
    mp3: path.join(dir, `turn-${seq}-${role}.mp3`),
    txt: path.join(dir, `turn-${seq}-${role}.txt`),
  };
};

export const writeText = (filePath: string, text: string): void => {
  writeFileSync(filePath, text);
};

export const dumpState = (attemptId: number, filename: string, data: unknown): void => {
  const dir = attemptDir(attemptId);
  writeFileSync(path.join(dir, filename), JSON.stringify(data, null, 2));
};
