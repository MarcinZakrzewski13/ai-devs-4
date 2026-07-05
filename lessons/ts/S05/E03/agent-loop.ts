import chalk from "chalk";
import { createDefaultProvider, type AiTool } from "@ai-devs/ai-core";
import { saveFinalAnswer } from "@ai-devs/ai-devs-hub";
import type { AgentResult, ShellResult } from "./types.ts";

const MAX_ITERATIONS = 20;
const MODEL = "anthropic/claude-sonnet-4-6";
const OUTPUT_PREVIEW = 700;

export const runShellAgent = async (
  tools: AiTool[],
  systemPrompt: string
): Promise<AgentResult> => {
  const provider = createDefaultProvider();

  const toolDefs = tools.map((t) => ({
    name: t.name,
    description: t.description,
    inputSchema: t.inputSchema,
  }));

  const rawMessages: any[] = [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content:
        "Start the investigation. Run \"ls -la /data\" to see what has been prepared for you.",
    },
  ];

  let capturedFlag: string | undefined;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    console.log(chalk.cyan(`\n┄ iter ${i + 1}/${MAX_ITERATIONS}`));

    const turn = await provider.callTools({
      messages: rawMessages as any,
      tools: toolDefs,
      model: MODEL,
    });

    if (turn.text) console.log(chalk.hex("#FF8C00")(`  🔍 ${turn.text}`));

    if (turn.toolCalls.length === 0) {
      return { finished: false, summary: turn.text ?? "No tool calls returned" };
    }

    rawMessages.push({
      role: "assistant",
      content: turn.text,
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
        content = JSON.stringify({ error: `Unknown tool: ${tc.name}` });
        rawMessages.push({ role: "tool", tool_call_id: tc.id, content });
        continue;
      }

      const result = await tool.execute(tc.args as any);
      content = result.ok
        ? JSON.stringify(result.data)
        : JSON.stringify({ error: result.error });

      if (tc.name === "shell_exec" && result.ok) {
        const data = result.data as ShellResult;
        const preview =
          data.output.length > OUTPUT_PREVIEW
            ? data.output.slice(0, OUTPUT_PREVIEW) + "…"
            : data.output;
        console.log(chalk.gray(`  ← ${preview}`));
        if (data.flag) {
          capturedFlag = data.flag;
          console.log(chalk.bgGreen.black.bold(`\n 🏁 FLAG: ${data.flag} \n`));
        }
      }

      if (tc.name === "finish" && result.ok) {
        const data = result.data as {
          summary: string;
          flag?: string;
          answer?: unknown;
        };
        const flag = capturedFlag ?? data.flag;
        console.log(chalk.green(`  ✓ finish: ${data.summary}`));
        rawMessages.push({ role: "tool", tool_call_id: tc.id, content });
        if (flag && data.answer) {
          await saveFinalAnswer("S05E03", "shellaccess", data.answer, {
            code: 0,
            message: flag,
          });
        }
        return { finished: true, flag, summary: data.summary };
      }

      rawMessages.push({ role: "tool", tool_call_id: tc.id, content });
    }
  }

  return {
    finished: false,
    flag: capturedFlag,
    summary: "Max iterations reached",
  };
};
