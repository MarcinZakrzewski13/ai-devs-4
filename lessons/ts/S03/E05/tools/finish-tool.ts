import { toolOk, type AiTool } from "@ai-devs/ai-core";

export const finishTool: AiTool = {
  name: "finish",
  description:
    "Signal that your task is complete. Provide a brief summary of what was accomplished.",
  inputSchema: {
    type: "object",
    properties: {
      summary: {
        type: "string",
        description: "Brief summary of what was accomplished",
      },
    },
    required: ["summary"],
    additionalProperties: false,
  },
  async execute(args: { summary: string }) {
    return toolOk({ summary: args.summary });
  },
};
