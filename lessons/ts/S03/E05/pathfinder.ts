import chalk from "chalk";
import type {
  Cell,
  Direction,
  GameMap,
  PathResult,
  Position,
  Vehicle,
} from "./types";

const DIRECTIONS: { dir: Direction; dr: number; dc: number }[] = [
  { dir: "up", dr: -1, dc: 0 },
  { dir: "down", dr: 1, dc: 0 },
  { dir: "left", dr: 0, dc: -1 },
  { dir: "right", dr: 0, dc: 1 },
];

const MAX_FUEL = 100; // 10.0 × 10
const MAX_FOOD = 100;
const TREE_FUEL_PENALTY = 2; // 0.2 × 10

type State = {
  row: number;
  col: number;
  walking: boolean;
  fuel: number; // integer, ×10
  food: number; // integer, ×10
  commands: string[];
};

function stateKey(s: State): string {
  return `${s.row},${s.col},${s.walking ? 1 : 0},${s.fuel},${s.food}`;
}

function isPassable(cell: Cell): boolean {
  return cell !== "R";
}

function isWater(cell: Cell): boolean {
  return cell === "W";
}

function isTree(cell: Cell): boolean {
  return cell === "T";
}

function isEngine(vehicle: Vehicle): boolean {
  return vehicle.name === "rocket" || vehicle.name === "car";
}

/**
 * BFS pathfinder with resource constraints.
 * Finds shortest path (fewest moves) from start to target that stays within
 * fuel and food budgets. Supports vehicle choice + mid-route dismount.
 */
export function findPath(
  map: GameMap,
  vehicle: Vehicle,
  target?: Position
): PathResult | null {
  const goalPos = target ?? map.goal;
  const rows = map.grid.length;
  const cols = map.grid[0].length;

  const vFuel = Math.round(vehicle.fuel * 10);
  const vFood = Math.round(vehicle.food * 10);
  const walkFood = 25; // 2.5 × 10
  const engineVehicle = isEngine(vehicle);
  const treePenalty = engineVehicle ? TREE_FUEL_PENALTY : 0;

  const initial: State = {
    row: map.start.row,
    col: map.start.col,
    walking: vehicle.name === "walk",
    fuel: MAX_FUEL,
    food: MAX_FOOD,
    commands: [vehicle.name],
  };

  // BFS — optimize for fewest moves
  const visited = new Set<string>();
  const queue: State[] = [initial];
  visited.add(stateKey(initial));

  let explored = 0;

  while (queue.length > 0) {
    const current = queue.shift()!;
    explored++;

    // Check if reached goal
    if (current.row === goalPos.row && current.col === goalPos.col) {
      console.log(
        chalk.green(
          `[pathfinder] Found path with ${vehicle.name}: ${current.commands.length - 1} moves, ` +
            `fuel=${(MAX_FUEL - current.fuel) / 10}, food=${(MAX_FOOD - current.food) / 10} ` +
            `(explored ${explored} states)`
        )
      );
      return {
        vehicle: vehicle.name,
        commands: current.commands,
        fuelUsed: (MAX_FUEL - current.fuel) / 10,
        foodUsed: (MAX_FOOD - current.food) / 10,
        steps: current.commands.length - 1,
      };
    }

    // Try dismount (if not already walking and not walk vehicle)
    if (!current.walking && vehicle.name !== "walk") {
      const dismountState: State = {
        ...current,
        walking: true,
        commands: [...current.commands, "dismount"],
      };
      const dk = stateKey(dismountState);
      if (!visited.has(dk)) {
        visited.add(dk);
        queue.push(dismountState);
      }
    }

    // Try each direction
    for (const { dir, dr, dc } of DIRECTIONS) {
      const nr = current.row + dr;
      const nc = current.col + dc;

      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;

      const cell = map.grid[nr][nc];
      if (!isPassable(cell) && cell !== "S" && cell !== "G" && cell !== "W") continue;

      // Water check
      if (isWater(cell)) {
        if (current.walking) {
          // walk can cross water
        } else if (vehicle.canCrossWater && !current.walking) {
          // horse can cross water
        } else {
          continue; // rocket/car can't cross water
        }
      }

      // Compute resource cost
      let fuelCost: number;
      let foodCost: number;

      if (current.walking) {
        fuelCost = 0;
        foodCost = walkFood;
      } else {
        fuelCost = vFuel;
        foodCost = vFood;
        // Tree penalty for engine vehicles
        if (isTree(cell) && engineVehicle) {
          fuelCost += treePenalty;
        }
      }

      const newFuel = current.fuel - fuelCost;
      const newFood = current.food - foodCost;

      if (newFuel < 0 || newFood < 0) continue;

      const next: State = {
        row: nr,
        col: nc,
        walking: current.walking,
        fuel: newFuel,
        food: newFood,
        commands: [...current.commands, dir],
      };

      const nk = stateKey(next);
      if (!visited.has(nk)) {
        visited.add(nk);
        queue.push(next);
      }
    }
  }

  console.log(
    chalk.yellow(
      `[pathfinder] No path found with ${vehicle.name} (explored ${explored} states)`
    )
  );
  return null;
}

/**
 * Find best path across all vehicles — shortest feasible route.
 */
export function findBestPath(
  map: GameMap,
  vehicles: Vehicle[],
  target?: Position
): PathResult | null {
  let best: PathResult | null = null;

  for (const vehicle of vehicles) {
    const result = findPath(map, vehicle, target);
    if (result && (!best || result.steps < best.steps)) {
      best = result;
    }
  }

  if (best) {
    console.log(
      chalk.bgGreen.black(
        `[pathfinder] Best: ${best.vehicle}, ${best.steps} moves, ` +
          `fuel=${best.fuelUsed}, food=${best.foodUsed}`
      )
    );
  }

  return best;
}
