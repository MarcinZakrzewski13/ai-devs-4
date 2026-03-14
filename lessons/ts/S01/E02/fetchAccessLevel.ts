import chalk from "chalk";

const ACCESS_LEVEL_URL = "https://hub.ag3nts.org/api/accesslevel";

/**
 * Fetches access level for a person.
 * @param birthYear - Year of birth (integer, e.g. 1987)
 */
export async function fetchAccessLevel(
  name: string,
  surname: string,
  birthYear: number
): Promise<number> {
  const apikey = process.env.API_KEY_AI_DEVS4;
  if (!apikey) {
    throw new Error("API_KEY_AI_DEVS4 is not set in .env");
  }

  const body = { apikey, name, surname, birthYear };
  const res = await fetch(ACCESS_LEVEL_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = (await res.json()) as { accessLevel?: number; access_level?: number };
  const level = data.accessLevel ?? data.access_level ?? 0;

  console.log(chalk.gray(`  [fetchAccessLevel] ${name} ${surname} → ${level}`));
  return level;
}
