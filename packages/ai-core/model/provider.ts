import type {
  GenerateTextInput,
  GenerateTextResult,
  GenerateStructuredInput,
  StructuredResult,
  ToolCallInput,
  ToolCallTurnResult,
} from "./types.ts";

export interface ModelProvider {
  generateText(input: GenerateTextInput): Promise<GenerateTextResult>;
  generateStructured<T>(
    input: GenerateStructuredInput<T>
  ): Promise<StructuredResult<T>>;
  callTools(input: ToolCallInput): Promise<ToolCallTurnResult>;
}
