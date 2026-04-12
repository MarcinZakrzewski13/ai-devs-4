import chalk from "chalk";
import { createDefaultProvider, type AiTool } from "@ai-devs/ai-core";
import type { AgentResult } from "./types.ts";

const MODEL = "anthropic/claude-sonnet-4-6";
const MAX_ITERATIONS = 40;

export const runAgentLoop = async (
  tools: AiTool[],
  systemPrompt: string,
  userMessage: string
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

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    console.log(chalk.gray(`  ┄ iter ${i + 1}/${MAX_ITERATIONS}`));

    const turn = await provider.callTools({
      messages: rawMessages as any,
      tools: toolDefs,
      model: MODEL,
    });

    if (turn.toolCalls.length === 0) {
      const text = turn.text?.slice(0, 300) ?? "(no text)";
      console.log(chalk.yellow(`  ⚠ Agent stopped without tool call: ${text}`));
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
        console.log(chalk.red(`  ✗ ${err}`));
        content = JSON.stringify({ error: err });
      } else {
        const result = await tool.execute(tc.args as any);
        content = result.ok
          ? JSON.stringify(result.data)
          : JSON.stringify({ error: result.error });

        if (!result.ok) {
          console.log(chalk.red(`  ✗ Tool error [${tc.name}]: ${result.error}`));
        }

        if (tc.name === "finish") {
          const data = result.ok ? (result.data as { flag?: string; summary?: string }) : {};
          const flag = data?.flag ?? "";
          const summary = data?.summary ?? "";
          console.log(chalk.bgGreen.black.bold(`\n  ✓ MISJA ZAKOŃCZONA`));
          console.log(chalk.bgYellow.black.bold(`  🏁 FLAGA: ${flag}`));
          rawMessages.push({ role: "tool", tool_call_id: tc.id, content });
          return { finished: true, flag, summary };
        }
      }

      rawMessages.push({ role: "tool", tool_call_id: tc.id, content });
    }
  }

  console.log(chalk.red(`  ✗ Limit ${MAX_ITERATIONS} iteracji wyczerpany`));
  return { finished: false, summary: "Max iterations reached" };
};
