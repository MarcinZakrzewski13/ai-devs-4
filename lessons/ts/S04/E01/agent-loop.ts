import chalk from "chalk";
import { createDefaultProvider, type AiTool } from "@ai-devs/ai-core";
import type { AgentResult } from "./types";

const DEFAULT_MODEL = "gpt-5-mini";
const DEFAULT_MAX_ITERATIONS = 20;

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
    console.log(chalk.blue(`\n[agent] iteration ${i + 1}/${maxIterations}`));

    const turn = await provider.callTools({
      messages: rawMessages as any,
      tools: toolDefs,
      model,
    });

    if (turn.toolCalls.length === 0) {
      console.log(
        chalk.yellow("[agent] No tool calls — model response:"),
        turn.text?.slice(0, 200)
      );
      return { finished: false, summary: turn.text ?? "No tool calls returned" };
    }

    console.log(
      chalk.yellow(
        `[agent] tools: ${turn.toolCalls.map((tc) => tc.name).join(", ")}`
      )
    );

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
      } else {
        const result = await tool.execute(tc.args as any);
        content = result.ok
          ? JSON.stringify(result.data)
          : JSON.stringify({ error: result.error });

        if (tc.name === "finish") {
          console.log(
            chalk.green("[agent] Finished:"),
            (result as any).data?.summary
          );
          rawMessages.push({ role: "tool", tool_call_id: tc.id, content });
          return {
            finished: true,
            summary: (result as any).data?.summary ?? "",
          };
        }

        if ((tc.name === "submit_done" || tc.name === "batch_update_and_done") && result.ok) {
          const data = (result as any).data;
          const doneResult = data?.doneResult ?? data;
          if (doneResult?.code === 0 || doneResult?.message?.includes("{FLG:")) {
            console.log(chalk.bgGreen.black(`\n FLAG: ${doneResult.message} \n`));
          }
        }
      }

      const preview =
        content.length > 500 ? content.slice(0, 500) + "..." : content;
      console.log(chalk.gray(`[agent] ${tc.name} →`), preview);

      rawMessages.push({ role: "tool", tool_call_id: tc.id, content });
    }
  }

  console.log(chalk.red("[agent] Max iterations reached"));
  return { finished: false, summary: "Max iterations reached" };
};
