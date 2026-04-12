import chalk from "chalk";
import { createDefaultProvider, type AiTool } from "@ai-devs/ai-core";
import { printIteration, printError } from "./display";
import type { AgentResult } from "./types";

const DEFAULT_MODEL = "gpt-5-mini";
const DEFAULT_MAX_ITERATIONS = 100;

export const runAgentLoop = async (
  tools: AiTool[],
  systemPrompt: string,
  userMessage: string,
  model = DEFAULT_MODEL,
  maxIterations = DEFAULT_MAX_ITERATIONS
): Promise<AgentResult> => {
  const provider = createDefaultProvider();

  const toolDefs = tools.map((t) => ({
    name: t.name,
    description: t.description,
    inputSchema: t.inputSchema,
  }));

  const rawMessages: any[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userMessage },
  ];

  for (let i = 0; i < maxIterations; i++) {
    printIteration(i + 1, maxIterations);

    const turn = await provider.callTools({
      messages: rawMessages as any,
      tools: toolDefs,
      model,
    });

    if (turn.toolCalls.length === 0) {
      const text = turn.text?.slice(0, 200) ?? "(brak tekstu)";
      console.log(chalk.yellow(`  ⚠ Agent nie wywołał narzędzia: ${text}`));
      return { finished: false, summary: turn.text ?? "No tool calls" };
    }

    rawMessages.push({
      role: "assistant",
      content: turn.text ?? null,
      tool_calls: turn.toolCalls.map((tc) => ({
        id: tc.id,
        type: "function",
        function: { name: tc.name, arguments: JSON.stringify(tc.args) },
      })),
    });

    for (const tc of turn.toolCalls) {
      const tool = tools.find((t) => t.name === tc.name);
      let content: string;

      if (!tool) {
        const err = `Unknown tool: ${tc.name}`;
        printError(tc.name, err);
        content = JSON.stringify({ error: err });
      } else {
        const result = await tool.execute(tc.args as any);
        content = result.ok
          ? JSON.stringify(result.data)
          : JSON.stringify({ error: result.error });

        if (!result.ok) {
          printError(tc.name, result.error ?? "unknown error");
        }

        if (tc.name === "finish") {
          const summary = (result as any).data?.summary ?? "";
          console.log(chalk.green.bold(`\n  ✓ MISJA ZAKOŃCZONA: ${summary}`));
          rawMessages.push({ role: "tool", tool_call_id: tc.id, content });
          return { finished: true, summary };
        }
      }

      rawMessages.push({ role: "tool", tool_call_id: tc.id, content });
    }
  }

  console.log(chalk.red(`  ✗ Limit iteracji (${maxIterations}) wyczerpany`));
  return { finished: false, summary: "Max iterations reached" };
};
