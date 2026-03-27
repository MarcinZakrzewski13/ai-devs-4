import { toolOk, type AiTool } from "@ai-devs/ai-core";
import chalk from "chalk";
import { addKnowledge } from "../knowledge-base";
import type { KnowledgeBase, KnowledgeCategory } from "../types";

export function createSaveKnowledgeTool(kb: KnowledgeBase): AiTool {
  return {
    name: "save_knowledge",
    description:
      "Save a discovered fact to the knowledge base. " +
      "Use this to record information you learn from API responses. " +
      "Be precise — include exact numbers, grid data, and constraints.",
    inputSchema: {
      type: "object",
      properties: {
        category: {
          type: "string",
          enum: ["endpoints", "map", "vehicles", "terrain_rules", "other"],
          description: "Knowledge category",
        },
        key: {
          type: "string",
          description: "Short identifier for this fact (e.g. 'rocket_consumption', 'water_rules')",
        },
        value: {
          type: "string",
          description: "The discovered information — be precise, include numbers and details",
        },
      },
      required: ["category", "key", "value"],
      additionalProperties: false,
    },
    async execute(args: {
      category: KnowledgeCategory;
      key: string;
      value: string;
    }) {
      addKnowledge(kb, args.category, args.key, args.value);
      console.log(
        chalk.green(`  [knowledge] +${args.category}/${args.key}`)
      );
      return toolOk({ saved: true, category: args.category, key: args.key });
    },
  };
}
