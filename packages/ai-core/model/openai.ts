import OpenAI from "openai";
import type { ModelProvider } from "./provider.ts";
import type {
  GenerateTextInput,
  GenerateTextResult,
  GenerateStructuredInput,
  StructuredResult,
  ToolCallInput,
  ToolCallTurnResult,
  ToolCall,
} from "./types.ts";

const DEFAULT_MODEL = "gpt-4o-mini";

export const createOpenAIProvider = (apiKey?: string): ModelProvider => {
  const client = new OpenAI({ apiKey: apiKey ?? process.env.OPENAI_API_KEY });

  return {
    async generateText(input: GenerateTextInput): Promise<GenerateTextResult> {
      const model = input.model ?? DEFAULT_MODEL;
      const res = await client.chat.completions.create({
        model,
        messages: input.messages,
        temperature: input.temperature,
      });

      return {
        text: res.choices[0].message.content ?? "",
        model,
        usage: {
          promptTokens: res.usage?.prompt_tokens ?? 0,
          completionTokens: res.usage?.completion_tokens ?? 0,
        },
      };
    },

    async generateStructured<T>(
      input: GenerateStructuredInput<T>
    ): Promise<StructuredResult<T>> {
      const model = input.model ?? DEFAULT_MODEL;
      const res = await client.chat.completions.create({
        model,
        messages: input.messages,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: input.schemaName,
            strict: true,
            schema: input.schema,
          },
        },
      });

      const raw = res.choices[0].message.content ?? "{}";
      const data = JSON.parse(raw) as T;

      return {
        data,
        model,
        usage: {
          promptTokens: res.usage?.prompt_tokens ?? 0,
          completionTokens: res.usage?.completion_tokens ?? 0,
        },
      };
    },

    async callTools(input: ToolCallInput): Promise<ToolCallTurnResult> {
      const model = input.model ?? DEFAULT_MODEL;
      const tools: OpenAI.Chat.ChatCompletionTool[] = input.tools.map((t) => ({
        type: "function",
        function: {
          name: t.name,
          description: t.description,
          parameters: t.inputSchema as Record<string, unknown>,
        },
      }));

      const res = await client.chat.completions.create({
        model,
        messages: input.messages,
        tools,
      });

      const msg = res.choices[0].message;
      const toolCalls: ToolCall[] = (msg.tool_calls ?? []).map((tc) => ({
        id: tc.id,
        name: tc.function.name,
        args: JSON.parse(tc.function.arguments),
      }));

      return {
        toolCalls,
        text: msg.content ?? null,
        model,
      };
    },
  };
};
