import type { JsonSchema } from "../model/types.ts";

export type ToolResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export type AiTool<TArgs = unknown, TResult = unknown> = {
  name: string;
  description: string;
  inputSchema: JsonSchema;
  execute(args: TArgs): Promise<ToolResult<TResult>>;
};

export const toolOk = <T>(data: T): ToolResult<T> => ({ ok: true, data });
export const toolErr = (error: string): ToolResult<never> => ({ ok: false, error });
