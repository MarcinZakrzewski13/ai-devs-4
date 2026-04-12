import chalk from "chalk";
import { toolOk, toolErr, type AiTool } from "@ai-devs/ai-core";
import { saveTmpAnswer } from "@ai-devs/ai-devs-hub";
import { callTool } from "./hubClient.ts";

const EPISODE_ID = "S04E05";
const TASK = "foodwarehouse";

// ─── helpers ─────────────────────────────────────────────────────────────────

const printCall = (toolName: string, params?: Record<string, unknown>) =>
  console.log(
    chalk.magenta(`  ▶ TOOL `) +
      chalk.yellow(toolName) +
      (params ? chalk.gray("  " + JSON.stringify(params)) : "")
  );

const printResult = (toolName: string, code: number, msg?: string) =>
  code >= 0
    ? console.log(chalk.green(`  ✓ ${toolName}`) + chalk.gray(` [${code}] ${msg ?? ""}`))
    : console.log(chalk.red(`  ✗ ${toolName}`) + chalk.gray(` [${code}] ${msg ?? ""}`));

// ─── help ─────────────────────────────────────────────────────────────────────

export const helpTool: AiTool = {
  name: "help",
  description: "Fetch API documentation for the foodwarehouse task. Call this first to understand available actions.",
  inputSchema: {
    type: "object",
    properties: {},
    additionalProperties: false,
  },
  async execute() {
    printCall("help");
    try {
      const data = await callTool({ tool: "help" });
      printResult("help", data.code ?? 0, String(data.message ?? "").slice(0, 80));
      await saveTmpAnswer(EPISODE_ID, TASK, { tool: "help", response: data });
      return toolOk(data);
    } catch (e) {
      return toolErr(`help failed: ${e}`);
    }
  },
};

// ─── database ─────────────────────────────────────────────────────────────────

export const databaseTool: AiTool = {
  name: "database",
  description: `Query the read-only SQLite database.
Use "show tables" to list tables.
Use "PRAGMA table_info(tableName)" to inspect columns.
Use SELECT to read data.
The database contains user/creator info and city destination codes needed for orders.`,
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "SQL query or 'show tables'",
      },
    },
    required: ["query"],
    additionalProperties: false,
  },
  async execute(args: { query: string }) {
    printCall("database", { query: args.query });
    try {
      const data = await callTool({ tool: "database", query: args.query });
      printResult("database", data.code ?? 0, `rows: ${JSON.stringify(data).length} chars`);
      await saveTmpAnswer(EPISODE_ID, TASK, { tool: "database", query: args.query, response: data });
      return toolOk(data);
    } catch (e) {
      return toolErr(`database failed: ${e}`);
    }
  },
};

// ─── signatureGenerator ───────────────────────────────────────────────────────

export const signatureGeneratorTool: AiTool = {
  name: "signatureGenerator",
  description: `Generate a SHA1 security signature required when creating orders.
You need to pass user data from the SQLite database. Call the help tool first to learn exact parameters.
NEVER compute SHA1 yourself — always call this tool.`,
  inputSchema: {
    type: "object",
    properties: {
      secret: {
        type: "string",
        description: "User secret/password field from the database",
      },
    },
    required: ["secret"],
    additionalProperties: true,
  },
  async execute(args: Record<string, unknown>) {
    printCall("signatureGenerator", args);
    try {
      const data = await callTool({ tool: "signatureGenerator", ...args });
      printResult("signatureGenerator", data.code ?? 0, String(data.message ?? "").slice(0, 60));
      await saveTmpAnswer(EPISODE_ID, TASK, { tool: "signatureGenerator", args, response: data });
      return toolOk(data);
    } catch (e) {
      return toolErr(`signatureGenerator failed: ${e}`);
    }
  },
};

// ─── orders ───────────────────────────────────────────────────────────────────

export const ordersTool: AiTool = {
  name: "orders",
  description: `Manage warehouse orders. Actions:
- get: List all existing orders (no extra params)
- create: Create a new order. Params: title (string), creatorID (number), destination (string), signature (string)
- append: Add items to an order. Params: id (order id), items (object mapping item name to quantity, e.g. {"chleb": 45, "woda": 120})
  If an item already exists, its quantity is summed — no duplicates created.`,
  inputSchema: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["get", "create", "append"],
        description: "Action to perform",
      },
      title: { type: "string", description: "Order title (for create)" },
      creatorID: { type: "number", description: "Creator user ID (for create)" },
      destination: { type: "string", description: "Destination code (for create)" },
      signature: { type: "string", description: "SHA1 signature (for create)" },
      id: { type: "string", description: "Order ID (for append)" },
      items: {
        description: "Items to append: { itemName: quantity } (for append)",
        oneOf: [
          { type: "object", additionalProperties: { type: "number" } },
        ],
      },
    },
    required: ["action"],
    additionalProperties: false,
  },
  async execute(args: Record<string, unknown>) {
    const { action, ...rest } = args;
    printCall(`orders.${action}`, Object.keys(rest).length ? rest : undefined);
    try {
      const data = await callTool({ tool: "orders", action, ...rest });
      printResult(`orders.${action}`, data.code ?? 0, String(data.message ?? "").slice(0, 80));
      await saveTmpAnswer(EPISODE_ID, TASK, { tool: "orders", action, ...rest, response: data });
      return toolOk(data);
    } catch (e) {
      return toolErr(`orders.${action} failed: ${e}`);
    }
  },
};

// ─── reset ────────────────────────────────────────────────────────────────────

export const resetTool: AiTool = {
  name: "reset",
  description: "Reset all orders to the initial state. Use this if something went wrong.",
  inputSchema: {
    type: "object",
    properties: {},
    additionalProperties: false,
  },
  async execute() {
    printCall("reset");
    try {
      const data = await callTool({ tool: "reset" });
      printResult("reset", data.code ?? 0, String(data.message ?? ""));
      return toolOk(data);
    } catch (e) {
      return toolErr(`reset failed: ${e}`);
    }
  },
};

// ─── done ─────────────────────────────────────────────────────────────────────

export const doneTool: AiTool = {
  name: "done",
  description: "Submit all orders for final verification. Call ONLY when all orders are complete and correct.",
  inputSchema: {
    type: "object",
    properties: {},
    additionalProperties: false,
  },
  async execute() {
    printCall("done");
    try {
      const data = await callTool({ tool: "done" });
      const flag = String(data.message ?? data.flag ?? "").match(/\{FLG:[^}]+\}/)?.[0];
      printResult("done", data.code ?? 0, flag ?? String(data.message ?? "").slice(0, 80));
      if (flag) {
        console.log(chalk.bgYellow.black.bold(`\n  🏁 FLAGA: ${flag}\n`));
      }
      await saveTmpAnswer(EPISODE_ID, TASK, { tool: "done", response: data });
      return toolOk({ ...data, flag: flag ?? data.flag });
    } catch (e) {
      return toolErr(`done failed: ${e}`);
    }
  },
};

// ─── finish ───────────────────────────────────────────────────────────────────

export const finishTool: AiTool = {
  name: "finish",
  description: "Signal task complete after receiving the flag from 'done'. Pass the flag value.",
  inputSchema: {
    type: "object",
    properties: {
      flag: { type: "string", description: "Flag received from done tool, e.g. {FLG:...}" },
      summary: { type: "string", description: "Brief summary of what was ordered" },
    },
    required: ["flag", "summary"],
    additionalProperties: false,
  },
  async execute(args: { flag: string; summary: string }) {
    return toolOk({ flag: args.flag, summary: args.summary });
  },
};

export const allTools: AiTool[] = [
  helpTool,
  databaseTool,
  signatureGeneratorTool,
  ordersTool,
  resetTool,
  doneTool,
  finishTool,
];
