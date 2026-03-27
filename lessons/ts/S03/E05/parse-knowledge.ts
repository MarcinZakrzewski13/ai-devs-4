import chalk from "chalk";
import type { Cell, GameMap, KnowledgeBase, Vehicle, VehicleName } from "./types";

/**
 * Extract the GameMap from knowledge base entries.
 * Looks for grid text data saved by the discovery agent.
 */
export function parseMapFromKnowledge(kb: KnowledgeBase): GameMap {
  // Find the grid entry — discovery agent should have saved the full grid
  // Try all map entries, looking for one that contains grid data
  const gridEntry = kb.map.find(
    (e) =>
      e.value.includes("W") &&
      e.value.includes("S") &&
      (e.value.includes("\n") || e.value.includes("\\n"))
  );

  if (!gridEntry) {
    throw new Error(
      "Map grid not found in knowledge base. " +
        `Map entries: ${JSON.stringify(kb.map.map((e) => ({ key: e.key, preview: e.value.slice(0, 80) })))}`
    );
  }

  // Parse the grid text — handle various formats the LLM might use
  const gridText = gridEntry.value
    .replace(/\\n/g, "\n")
    .trim();

  const lines = gridText
    .split("\n")
    .map((l) => l.trim())
    // Strip "Row1: ", "0: ", "row 0:", etc. prefixes
    .map((l) => l.replace(/^(Row\s*\d+\s*:\s*)/i, ""))
    .map((l) => l.replace(/^\d+\s*:\s*/, ""))
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && /^[.TWRSG]+$/.test(l));

  if (lines.length === 0) {
    throw new Error(`Could not parse grid lines from: ${gridText.slice(0, 300)}`);
  }

  const grid: Cell[][] = lines.map((line) =>
    [...line].map((ch) => ch as Cell)
  );

  let start = { row: 0, col: 0 };
  let goal = { row: 0, col: 0 };

  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      if (grid[r][c] === "S") start = { row: r, col: c };
      if (grid[r][c] === "G") goal = { row: r, col: c };
    }
  }

  // Try to find city name
  const cityEntry = kb.map.find(
    (e) => e.key.toLowerCase().includes("city") || e.key.toLowerCase().includes("name")
  );
  const cityName = cityEntry?.value ?? "Skolwin";

  console.log(
    chalk.cyan(
      `[parse] Map: ${grid.length}x${grid[0]?.length ?? 0}, ` +
        `S=(${start.row},${start.col}), G=(${goal.row},${goal.col})`
    )
  );

  return { cityName, grid, start, goal };
}

/**
 * Extract vehicle specs from knowledge base entries.
 */
export function parseVehiclesFromKnowledge(kb: KnowledgeBase): Vehicle[] {
  const vehicles: Vehicle[] = [];
  const vehicleNames: VehicleName[] = ["rocket", "car", "horse", "walk"];

  for (const name of vehicleNames) {
    const entry = kb.vehicles.find(
      (e) => e.key.toLowerCase().includes(name)
    );

    if (entry) {
      // Parse fuel and food from the value text
      const fuelMatch = entry.value.match(/fuel[:\s=]*(\d+\.?\d*)/i);
      const foodMatch = entry.value.match(/food[:\s=]*(\d+\.?\d*)/i);

      const fuel = fuelMatch ? parseFloat(fuelMatch[1]) : getDefaultFuel(name);
      const food = foodMatch ? parseFloat(foodMatch[1]) : getDefaultFood(name);

      vehicles.push({
        name,
        fuel,
        food,
        canCrossWater: name === "horse" || name === "walk",
      });
    } else {
      // Fallback to known defaults if discovery missed this vehicle
      console.log(
        chalk.yellow(`[parse] Vehicle ${name} not in knowledge base, using defaults`)
      );
      vehicles.push({
        name,
        fuel: getDefaultFuel(name),
        food: getDefaultFood(name),
        canCrossWater: name === "horse" || name === "walk",
      });
    }
  }

  console.log(chalk.cyan("[parse] Vehicles:"));
  for (const v of vehicles) {
    console.log(
      chalk.gray(
        `  ${v.name}: fuel=${v.fuel}, food=${v.food}, water=${v.canCrossWater}`
      )
    );
  }

  return vehicles;
}

function getDefaultFuel(name: VehicleName): number {
  const defaults: Record<VehicleName, number> = {
    rocket: 1.0,
    car: 0.7,
    horse: 0.0,
    walk: 0.0,
  };
  return defaults[name];
}

function getDefaultFood(name: VehicleName): number {
  const defaults: Record<VehicleName, number> = {
    rocket: 0.1,
    car: 1.0,
    horse: 1.6,
    walk: 2.5,
  };
  return defaults[name];
}
