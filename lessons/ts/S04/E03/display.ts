import chalk from "chalk";

const W = 58;
const LINE = chalk.gray("─".repeat(W));
const LINE_THICK = chalk.cyan("━".repeat(W));
const LINE_DOUBLE = "═".repeat(W);

export const printIteration = (i: number, max: number) =>
  process.stdout.write(chalk.gray(`  ┄ iter ${i}/${max}\n`));

export const printUnitsCreated = (
  transporterName: string,
  scoutNames: string[],
  position: string
) => {
  console.log("\n" + LINE_THICK);
  console.log(
    chalk.cyan.bold("  🚛 JEDNOSTKI WYSTAWIONE") +
      chalk.gray(` [spawn: ${position}]`)
  );
  console.log(chalk.white(`     ▸ Transporter ${chalk.bold(transporterName)}`));
  for (const s of scoutNames) {
    console.log(chalk.white(`     ▸ Zwiadowca ${chalk.bold(s)}`));
  }
  console.log(LINE_THICK);
};

export const printOrder = (
  unitName: string,
  unitType: "transporter" | "scout",
  action: string,
  detail?: string
) => {
  const icon = unitType === "transporter" ? "🚛" : "🪖";
  const d = detail ? chalk.white(` → ${detail}`) : "";
  console.log(
    chalk.magenta(`  ▶ ROZKAZ`) +
      chalk.gray(` [${icon} ${unitName}]: `) +
      chalk.yellow(action) +
      d
  );
};

export const printDismountResult = (
  scoutName: string,
  position: string
) => {
  console.log(
    chalk.gray(`       ↳ ${chalk.white(scoutName)} wylądował na `) +
      chalk.cyan(position)
  );
};

export const printActionPoints = (left: number) => {
  const bar = left > 150 ? chalk.green : left > 50 ? chalk.yellow : chalk.red;
  console.log(chalk.gray(`       [pkt: `) + bar(`${left}`) + chalk.gray(`/300]`));
};

export const printMovePath = (from: string, to: string, steps: number) => {
  console.log(
    chalk.gray(`       ${from} ──[${steps} kroków]──▶ `) + chalk.cyan(to)
  );
};

export const printFieldReport = (
  unitName: string,
  field: string,
  msg: string,
  analysis: { humanFound: boolean; interpretation: string }
) => {
  console.log("\n" + (analysis.humanFound ? LINE_THICK : LINE));

  if (analysis.humanFound) {
    console.log(
      chalk.bgRed.white.bold(`  🎯 CEL ZLOKALIZOWANY!`) +
        chalk.bgRed.white(`  Zwiadowca ${unitName} @ ${chalk.bold(field)}`)
    );
  } else {
    console.log(
      chalk.cyan(`  📡 MELDUNEK  `) +
        chalk.white.bold(unitName) +
        chalk.gray(` @ ${field}`)
    );
  }

  console.log(chalk.yellow(`     "${msg}"`));

  const icon = analysis.humanFound ? "🎯" : "🔍";
  const interpret = `  ${icon} ANALIZA: ${analysis.interpretation}`;
  console.log(
    analysis.humanFound
      ? chalk.bgGreen.black.bold(interpret)
      : chalk.hex("#FF8C00")(interpret)
  );

  console.log(analysis.humanFound ? LINE_THICK : LINE);
};

export const printHelicopterCall = (destination: string, flag?: string) => {
  console.log("\n" + chalk.green(LINE_DOUBLE));
  console.log(
    chalk.bgGreen.black.bold(
      `  🚁 HELIKOPTER RATUNKOWY WEZWANY → ${destination}  `.padEnd(W)
    )
  );
  if (flag) {
    console.log(
      chalk.bgYellow.black.bold(`  🏁 FLAGA: ${flag}  `.padEnd(W))
    );
  }
  console.log(chalk.green(LINE_DOUBLE));
};

export const printError = (action: string, err: string) => {
  console.log(chalk.red(`  ✗ BŁĄD [${action}]: ${err.slice(0, 120)}`));
};

export const printApiError = (msg: string) => {
  console.log(chalk.red(`  ✗ API: ${msg}`));
};
