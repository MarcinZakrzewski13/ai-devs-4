import chalk from "chalk";
import { toolOk, toolErr, type AiTool } from "@ai-devs/ai-core";
import { execCmd } from "./shell-client.ts";

const shellExecTool: AiTool = {
  name: "shell_exec",
  description:
    "Execute a single shell command on the remote server and return its stdout. " +
    "The server has standard Linux tools plus 'jq'. Prepared data lives in /data/. " +
    "Output is size-limited, so prefer targeted 'grep -A/-B', 'jq', 'head' over dumping whole files. " +
    "Running an 'echo' of the final answer JSON is how the answer is submitted: the server " +
    "validates the printed JSON automatically and returns a flag in the output when correct.",
  inputSchema: {
    type: "object",
    properties: {
      cmd: {
        type: "string",
        description: "The shell command to execute (e.g. \"ls -la /data\").",
      },
    },
    required: ["cmd"],
    additionalProperties: false,
  },
  async execute(args: { cmd: string }) {
    try {
      console.log(chalk.magenta(`  ▶ cmd: ${chalk.yellow(args.cmd)}`));
      const result = await execCmd(args.cmd);
      return toolOk(result);
    } catch (e) {
      return toolErr(String(e));
    }
  },
};

const finishTool: AiTool = {
  name: "finish",
  description:
    "Call this once the flag ({FLG:...}) has been returned by the server, or after " +
    "exhausting all reasonable options.",
  inputSchema: {
    type: "object",
    properties: {
      flag: {
        type: "string",
        description: "The captured {FLG:...} flag, if any.",
      },
      answer: {
        type: "object",
        description: "The final validated answer object (date is the DAY BEFORE the body was found).",
        properties: {
          date: { type: "string" },
          city: { type: "string" },
          longitude: { type: "number" },
          latitude: { type: "number" },
        },
        required: ["date", "city", "longitude", "latitude"],
        additionalProperties: false,
      },
      summary: {
        type: "string",
        description: "Brief summary of what was found and done.",
      },
    },
    required: ["summary"],
    additionalProperties: false,
  },
  async execute(args: {
    flag?: string;
    answer?: Record<string, unknown>;
    summary: string;
  }) {
    return toolOk({
      finished: true,
      flag: args.flag,
      answer: args.answer,
      summary: args.summary,
    });
  },
};

export const allTools: AiTool[] = [shellExecTool, finishTool];
