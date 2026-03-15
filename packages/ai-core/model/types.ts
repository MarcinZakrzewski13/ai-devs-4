/** Single text part in a multimodal message. */
export type TextContentPart = {
  type: "text";
  text: string;
};

/** Image passed as base64 data URL or remote URL. */
export type ImageContentPart = {
  type: "image_url";
  image_url: { url: string; detail?: "auto" | "low" | "high" };
};

/** Content can be plain string (text-only) or array of parts (multimodal). */
export type MessageContent = string | Array<TextContentPart | ImageContentPart>;

export type Message = {
  role: "system" | "user" | "assistant";
  content: MessageContent;
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
