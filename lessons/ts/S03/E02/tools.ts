import { toolOk, toolErr, type AiTool } from "@ai-devs/ai-core";
import { sendAnswer, saveTmpAnswer, saveFinalAnswer } from "@ai-devs/ai-devs-hub";
import { execShell } from "./shell-api.ts";
import type { FirmwareAnswer } from "./types.ts";

const shellExecTool: AiTool = {
  name: "shell_exec",
  description:
    "Execute a command on the remote Linux VM. The VM has a non-standard shell — start with 'help' to discover available commands. Returns the command output or error.",
  inputSchema: {
    type: "object",
    properties: {
      cmd: {
        type: "string",
        description: "The shell command to execute on the VM",
      },
    },
    required: ["cmd"],
    additionalProperties: false,
  },
  async execute(args: { cmd: string }) {
    try {
      const result = await execShell(args.cmd);
      return toolOk(result);
    } catch (e) {
      return toolErr(String(e));
    }
  },
};

const submitAnswerTool: AiTool = {
  name: "submit_answer",
  description:
    "Submit the ECCS confirmation code to the hub. The code format is ECCS-xxxx (40+ chars).",
  inputSchema: {
    type: "object",
    properties: {
      confirmation: {
        type: "string",
        description: "The ECCS-xxx confirmation code obtained from running the firmware",
      },
    },
    required: ["confirmation"],
    additionalProperties: false,
  },
  async execute(args: { confirmation: string }) {
    try {
      const answer: FirmwareAnswer = { confirmation: args.confirmation };
      await saveTmpAnswer("S03E02", "firmware", answer);
      const result = await sendAnswer("firmware", answer);
      if (result.code === 0) {
        await saveFinalAnswer("S03E02", "firmware", answer, result);
      }
      return toolOk(result);
    } catch (e) {
      return toolErr(String(e));
    }
  },
};

const finishTool: AiTool = {
  name: "finish",
  description: "Call this when done — after receiving the flag or after exhausting all options.",
  inputSchema: {
    type: "object",
    properties: {
      summary: { type: "string", description: "Brief summary of what happened" },
    },
    required: ["summary"],
    additionalProperties: false,
  },
  async execute(args: { summary: string }) {
    return toolOk({ finished: true, summary: args.summary });
  },
};

export const allTools: AiTool[] = [shellExecTool, submitAnswerTool, finishTool];
