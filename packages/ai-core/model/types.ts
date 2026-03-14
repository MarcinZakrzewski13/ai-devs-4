export type Message = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type GenerateTextInput = {
  messages: Message[];
  model?: string;
  temperature?: number;
};

export type GenerateTextResult = {
  text: string;
  model: string;
  usage: { promptTokens: number; completionTokens: number };
};

export type JsonSchema = Record<string, unknown>;

export type GenerateStructuredInput<T> = {
  messages: Message[];
  schema: JsonSchema;
  schemaName: string;
  model?: string;
};

export type StructuredResult<T> = {
  data: T;
  model: string;
  usage: { promptTokens: number; completionTokens: number };
};

export type ToolDefinition = {
  name: string;
  description: string;
  inputSchema: JsonSchema;
};

export type ToolCallInput = {
  messages: Message[];
  tools: ToolDefinition[];
  model?: string;
};

export type ToolCall = {
  id: string;
  name: string;
  args: unknown;
};

export type ToolCallTurnResult = {
  toolCalls: ToolCall[];
  text: string | null;
  model: string;
};
