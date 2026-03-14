import type { AiTool } from "./tool.ts";

export type ToolRegistry = {
  register(tool: AiTool): void;
  get(name: string): AiTool | undefined;
  getAll(): AiTool[];
  has(name: string): boolean;
};

export const createToolRegistry = (
  initialTools: AiTool[] = []
): ToolRegistry => {
  const tools = new Map<string, AiTool>();

  for (const tool of initialTools) {
    tools.set(tool.name, tool);
  }

  return {
    register(tool: AiTool): void {
      tools.set(tool.name, tool);
    },
    get(name: string): AiTool | undefined {
      return tools.get(name);
    },
    getAll(): AiTool[] {
      return [...tools.values()];
    },
    has(name: string): boolean {
      return tools.has(name);
    },
  };
};
