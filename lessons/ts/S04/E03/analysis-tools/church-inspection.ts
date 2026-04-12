// Eksploracja: "Take Me to Church"
// Inspekcja wszystkich pól kościoła (KS) na mapie Domatowa
// w poszukiwaniu ukrytej flagi dodatkowej.
//
// Pola KS: F7, G7, H7, F8, G8, H8
// Trasa: spawn A6 → move scout do F7 → inspekcja kolejnych KS pól

import "dotenv/config";
import chalk from "chalk";
import { saveFinalAnswer } from "@ai-devs/ai-devs-hub";

const API_KEY = process.env.API_KEY_AI_DEVS4!;
const HUB_URL = "https://hub.ag3nts.org/verify";
const TASK = "domatowo";

const CHURCH_TILES = ["F7", "G7", "H7", "H8", "G8", "F8"];

const W = 52;
const BORDER = chalk.cyan("═".repeat(W));

const api = async (answer: Record<string, unknown>) => {
  const res = await fetch(HUB_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apikey: API_KEY, task: TASK, answer }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  return res.json() as Promise<Record<string, unknown>>;
};

const step = (msg: string) =>
  console.log(chalk.cyan("  ◆ ") + chalk.white(msg) + chalk.gray("..."));
const done = (msg: string) =>
  console.log(chalk.green("  ✓ ") + chalk.gray(msg));
const report = (field: string, msg: string) => {
  console.log("\n" + chalk.gray("─".repeat(W)));
  console.log(chalk.cyan("  📡 KS @ ") + chalk.white.bold(field));
  console.log(chalk.yellow(`     "${msg}"`));
};

const main = async () => {
  console.log("\n" + BORDER);
  console.log(chalk.cyan.bold("  TAKE ME TO CHURCH — eksploracja KS".padEnd(W - 2)));
  console.log(chalk.gray("  Pola: " + CHURCH_TILES.join(", ")));
  console.log(BORDER + "\n");

  step("Reset planszy");
  await api({ action: "reset" });
  done("Plansza zresetowana");

  step("Tworzenie zwiadowcy");
  const createRes = await api({ action: "create", type: "scout" });
  const scoutHash = createRes.object as string;
  done(`Scout ${scoutHash.slice(0, 8)}... · spawn A6`);

  const processedKeys = new Set<string>();
  let flagFound: string | null = null;

  for (const tile of CHURCH_TILES) {
    step(`Przemieszczanie do ${tile}`);
    const moveRes = await api({ action: "move", object: scoutHash, where: tile });
    const steps = moveRes.path_steps as number;
    const pts = moveRes.action_points_left as number;
    done(`${steps} kroków · pkt: ${pts}/300`);

    step(`Inspekcja ${tile}`);
    await api({ action: "inspect", object: scoutHash });

    const logsRes = await api({ action: "getLogs" });
    const logs = (logsRes.logs as Array<{ scout: string; msg: string; field: string }>) ?? [];

    for (const entry of logs) {
      const key = `${entry.field}|${entry.msg}`;
      if (processedKeys.has(key)) continue;
      processedKeys.add(key);

      report(entry.field, entry.msg);

      const flag = entry.msg.match(/\{FLG:[^}]+\}/)?.[0];
      if (flag) {
        flagFound = flag;
        console.log(chalk.bgYellow.black.bold(`\n  🏁 FLAGA ZNALEZIONA: ${flag}\n`));
      }
    }
  }

  console.log("\n" + BORDER);

  if (flagFound) {
    console.log(chalk.bgGreen.black.bold(`  SUKCES — ${flagFound}`.padEnd(W)));
    await saveFinalAnswer("S04E03", "domatowo-church", { tiles: CHURCH_TILES }, {
      code: 0,
      message: flagFound,
    });
  } else {
    console.log(chalk.hex("#FF8C00").bold("  Brak flagi w logach kościoła.".padEnd(W)));
    console.log(chalk.gray("  Sprawdź pełne logi wyżej — może flaga w treści meldunku?"));
  }

  console.log(BORDER + "\n");
};

main().catch((err) => {
  console.error(chalk.red("\n  BŁĄD:"), err);
  process.exit(1);
});
