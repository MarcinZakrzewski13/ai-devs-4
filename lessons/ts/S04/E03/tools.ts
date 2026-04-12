import { toolOk, toolErr, type AiTool } from "@ai-devs/ai-core";
import { saveFinalAnswer, saveTmpAnswer } from "@ai-devs/ai-devs-hub";
import { callDomatowo } from "./domatowo-api";
import { classifyReport } from "./classify-report";
import {
  printUnitsCreated,
  printOrder,
  printDismountResult,
  printActionPoints,
  printMovePath,
  printFieldReport,
  printHelicopterCall,
  printApiError,
} from "./display";

const EPISODE_ID = "S04E03";
const TASK = "domatowo";

// ─── Unit registry ───────────────────────────────────────────────────────────

type UnitInfo = { name: string; type: "transporter" | "scout" };

const unitRegistry = new Map<string, UnitInfo>();
const unitPositions = new Map<string, string>(); // hash → coord
const processedLogKeys = new Set<string>(); // "field|msg" already displayed
let transporterCount = 0;
let scoutCount = 0;

let humanFound = false;

export const isHumanFound = () => humanFound;

const unitName = (hash: string): string =>
  unitRegistry.get(hash)?.name ?? hash.slice(0, 6);

const unitType = (hash: string): "transporter" | "scout" =>
  unitRegistry.get(hash)?.type ?? "scout";

// ─── Tool ─────────────────────────────────────────────────────────────────────

const domatowoActionTool: AiTool = {
  name: "domatowo_action",
  description: `Send an action to the Domatowo evacuation API.

AVAILABLE ACTIONS:
- getObjects: Returns all units with type, position, hash. Call this after create/move to get hashes.
- create: Create a unit. Params: type="transporter"|"scout", passengers=1-4 (transporter only)
- move: Move a unit. Params: object=<hash>, where=<coord e.g. "D6">
- dismount: Drop scouts from transporter. Params: object=<transporter-hash>, passengers=<count>
- inspect: Scout inspects their current tile. Params: object=<scout-hash>
- getLogs: Get all inspection logs (no params). Read this after inspect to check if human found.
- callHelicopter: Call rescue helicopter. Params: destination=<coord where human was found>
- expenses: Check action points spent so far (no params)

COORDINATE FORMAT: column A-K + row 1-11 (e.g. "A6", "D9", "F1")
SPAWN POINT: units appear at A6 (then B6, C6, D6 as slots fill)`,
  inputSchema: {
    type: "object",
    properties: {
      action: {
        type: "string",
        description:
          "Action name: getObjects | create | move | dismount | inspect | getLogs | callHelicopter | expenses",
      },
      params: {
        type: "object",
        description:
          "Action parameters (object, where, type, passengers, destination — per action docs above)",
        additionalProperties: true,
      },
    },
    required: ["action"],
    additionalProperties: false,
  },

  async execute(args: { action: string; params?: Record<string, unknown> }) {
    const { action, params = {} } = args;
    const answer: Record<string, unknown> = { action, ...params };

    // ── Pre-call: display order ─────────────────────────────────────────────
    const objectHash = params.object as string | undefined;
    const uName = objectHash ? unitName(objectHash) : "?";
    const uType = objectHash ? unitType(objectHash) : "scout";

    switch (action) {
      case "move":
        printOrder(uName, uType, "przemieść się", params.where as string);
        break;
      case "dismount":
        printOrder(uName, "transporter", `wysadź ${params.passengers} zwiadowcę/ów`);
        break;
      case "inspect": {
        const pos = objectHash ? (unitPositions.get(objectHash) ?? "?") : "?";
        printOrder(uName, "scout", `inspekcja pola ${pos}`);
        break;
      }
      case "callHelicopter":
        printOrder("BAZA", "transporter", `wezwij helikopter`, params.destination as string);
        break;
      // getObjects, getLogs, expenses, create — silent or handled after
    }

    // ── API call ────────────────────────────────────────────────────────────
    let data: Record<string, unknown>;
    try {
      data = (await callDomatowo(answer)) as Record<string, unknown>;
    } catch (e) {
      printApiError(String(e));
      return toolErr(`API call failed: ${e}`);
    }

    const code = data.code as number;
    const msg = String(data.message ?? "");

    // ── Post-call: handle response ──────────────────────────────────────────

    if (action === "create" && code === 10) {
      const tHash = data.object as string;
      transporterCount++;
      const tName = `T${transporterCount}`;
      unitRegistry.set(tHash, { name: tName, type: "transporter" });
      unitPositions.set(tHash, data.spawn as string);

      const scoutIds: string[] = [];
      const scoutNames: string[] = [];
      const crew = (data.crew as Array<{ id: string }>) ?? [];
      for (const c of crew) {
        scoutCount++;
        const sName = `S${scoutCount}`;
        unitRegistry.set(c.id, { name: sName, type: "scout" });
        scoutIds.push(c.id);
        scoutNames.push(sName);
        // Scouts start inside transporter — position set on dismount
      }

      printUnitsCreated(tName, scoutNames, data.spawn as string);
    }

    if (action === "move" && code === 20) {
      const movedHash = params.object as string;
      const to = data.where as string;
      const from = data.from as string;
      const steps = data.path_steps as number;
      unitPositions.set(movedHash, to);
      printMovePath(from, to, steps);
      printActionPoints(data.action_points_left as number);
    }

    if (action === "dismount" && code === 40) {
      const spawned = (data.spawned as Array<{ scout: string; where: string }>) ?? [];
      for (const s of spawned) {
        unitPositions.set(s.scout, s.where);
        const sName = unitName(s.scout);
        printDismountResult(sName, s.where);
      }
      printActionPoints(data.action_points_left as number);
    }

    if (action === "inspect" && code === 30) {
      printActionPoints(data.action_points_left as number);
    }

    if (action === "getObjects" && code === 70) {
      // Update position registry silently
      const objects = (data.objects as Array<{ id: string; position: string }>) ?? [];
      for (const obj of objects) {
        unitPositions.set(obj.id, obj.position);
      }
    }

    if (action === "getLogs" && code === 60) {
      const logs =
        (data.logs as Array<{ scout: string; msg: string; field: string }>) ?? [];

      for (const entry of logs) {
        const key = `${entry.field}|${entry.msg}`;
        if (processedLogKeys.has(key)) continue;
        processedLogKeys.add(key);

        // ── LLM classifies the field report ──────────────────────────────
        const analysis = await classifyReport(entry.field, entry.msg);
        const sName = unitName(entry.scout);
        printFieldReport(sName, entry.field, entry.msg, analysis);

        if (analysis.humanFound) {
          humanFound = true;
        }
      }
    }

    if (action === "callHelicopter") {
      const flag = msg.match(/\{FLG:[^}]+\}/)?.[0];
      const destination = params.destination as string;

      if (flag || code === 0) {
        humanFound = true;
        printHelicopterCall(destination, flag ?? msg);
        await saveFinalAnswer(
          EPISODE_ID,
          TASK,
          { destination },
          data
        );
      } else {
        printApiError(msg);
      }
    }

    if (code < 0) {
      printApiError(msg);
    }

    await saveTmpAnswer(EPISODE_ID, TASK, { answer, response: data });

    return toolOk(data);
  },
};

// ─── Finish tool ──────────────────────────────────────────────────────────────

const finishTool: AiTool = {
  name: "finish",
  description:
    "Signal mission complete. Call this after receiving the flag from callHelicopter.",
  inputSchema: {
    type: "object",
    properties: {
      summary: {
        type: "string",
        description: "Brief summary: where partisan was found, total points spent",
      },
    },
    required: ["summary"],
    additionalProperties: false,
  },
  async execute(args: { summary: string }) {
    return toolOk({ summary: args.summary });
  },
};

export const allTools: AiTool[] = [domatowoActionTool, finishTool];
