import type { Suspect, FindhimAnswer } from "./types.ts";

/**
 * Builds the final answer payload for /verify (task: findhim).
 */
export function buildAnswer(
  suspect: Suspect,
  accessLevel: number,
  powerPlant: string
): FindhimAnswer {
  return {
    name: suspect.name,
    surname: suspect.surname,
    accessLevel,
    powerPlant,
  };
}
