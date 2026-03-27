import { toolOk, toolErr, type AiTool } from "@ai-devs/ai-core";
import chalk from "chalk";
import { findPath, findBestPath } from "../pathfinder";
import type { GameMap, Vehicle, VehicleName } from "../types";

export function createBfsPathfinderTool(
  map: GameMap,
  vehicles: Vehicle[]
): AiTool {
  return {
    name: "bfs_pathfinder",
    description:
      "Run BFS pathfinding on the map with fuel/food resource constraints. " +
      "Finds the shortest feasible route for a given vehicle (or 'best' to compare all). " +
      "Supports dismount — the algorithm will try switching to walk mode mid-route. " +
      "Optionally specify a custom target position instead of the default goal (G).",
    inputSchema: {
      type: "object",
      properties: {
        vehicle: {
          type: "string",
          enum: ["rocket", "car", "horse", "walk", "best"],
          description:
            "Vehicle to pathfind with, or 'best' to try all and pick shortest",
        },
        targetRow: {
          type: "number",
          description:
            "Optional: target row (0-9). If omitted, uses the goal (G) position.",
        },
        targetCol: {
          type: "number",
          description:
            "Optional: target column (0-9). If omitted, uses the goal (G) position.",
        },
      },
      required: ["vehicle"],
      additionalProperties: false,
    },
    async execute(args: {
      vehicle: string;
      targetRow?: number;
      targetCol?: number;
    }) {
      const target =
        args.targetRow !== undefined && args.targetCol !== undefined
          ? { row: args.targetRow, col: args.targetCol }
          : undefined;

      const label = target
        ? `(${target.row},${target.col})`
        : `goal(${map.goal.row},${map.goal.col})`;

      console.log(
        chalk.gray(`  [bfs] vehicle=${args.vehicle}, target=${label}`)
      );

      if (args.vehicle === "best") {
        const result = findBestPath(map, vehicles, target);
        if (!result)
          return toolErr("No feasible path found for any vehicle.");
        return toolOk(result);
      }

      const vehicle = vehicles.find(
        (v) => v.name === (args.vehicle as VehicleName)
      );
      if (!vehicle) return toolErr(`Unknown vehicle: ${args.vehicle}`);

      const result = findPath(map, vehicle, target);
      if (!result)
        return toolErr(`No feasible path for ${args.vehicle} to ${label}.`);
      return toolOk(result);
    },
  };
}
