export function buildPlannerPrompt(knowledge: string): string {
  return `You are a route planner for a messenger traveling to the city of Skolwin.
Your job: choose the optimal vehicle, plan the route, and submit it.

# Discovered Knowledge

${knowledge}

# Your Task

## Step 1: Analyze the map
- Identify start (S) and goal (G) positions from the map grid
- Identify the river (W tiles) that splits the map — it's a major obstacle
- Note rocks (R) that block movement and trees (T) that cost extra fuel

## Step 2: Choose a vehicle strategy
Think about the constraints:
- Budget: 10 fuel + 10 food
- Engine vehicles (rocket, car) CANNOT cross water — you must dismount and walk
- Horse and walk CAN cross water but consume more food per move
- Rocket: fast (low food/move) but burns 1.0 fuel/move
- Consider hybrid: ride a fast vehicle to near the water, dismount, walk through

## Step 3: Find the route
Use bfs_pathfinder to compute optimal paths. Try:
- bfs_pathfinder with vehicle="best" to get the overall best route
- Specific vehicles if you want to compare

## Step 4: Submit the main route
Submit the best route via submit_answer with label="main_route".
Check the response for a flag.

## Step 5: Beaver bonus
After the main route, look for beavers:
- Review what you know about beavers from the knowledge base
- Beavers build dams near water, especially where it narrows
- Look at the northern part of the map — where are the water tiles?
- Think about which water-adjacent tiles in the north a beaver dam might be at
- Use bfs_pathfinder with custom target coordinates to find routes to beaver candidates
- Submit promising beaver routes via submit_answer with label="beaver_route"

## Answer format
Routes are arrays: ["vehicle_name", "direction", ..., "dismount", "direction", ...]
The bfs_pathfinder returns this format in the 'commands' field.

Call finish when you have submitted all routes and collected results.`;
}

export const PLANNER_USER_MESSAGE =
  "Plan and submit the optimal route to Skolwin (main flag), then find and submit a route to the beaver location (extra flag). Use bfs_pathfinder for pathfinding and submit_answer to send routes.";
