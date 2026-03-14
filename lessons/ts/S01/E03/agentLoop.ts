import chalk from "chalk";
import { createOpenAIProvider } from "../../../../packages/ai-core/model/openai.ts";
import type { AiTool } from "../../../../packages/ai-core/tools/tool.ts";
import type { SessionMessage } from "./types.ts";

const MAX_ITERATIONS = 5;
const MODEL = "gpt-5-mini";

type AgentLoopInput = {
  history: SessionMessage[];
  userMessage: string;
  tools: AiTool[];
  systemPrompt: string;
};

export const runAgentLoop = async ({
  history,
  userMessage,
  tools,
  systemPrompt,
}: AgentLoopInput): Promise<string> => {
  const provider = createOpenAIProvider();

  const toolDefs = tools.map((t) => ({
    name: t.name,
    description: t.description,
    inputSchema: t.inputSchema,
  }));

  // rawMessages holds the full conversation including tool_calls / tool results
  const rawMessages: any[] = [
    { role: "system", content: systemPrompt },
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: userMessage },
  ];

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    console.log(chalk.blue(`[agentLoop] iteration ${i + 1}`));

    const turn = await provider.callTools({
      messages: rawMessages as any,
      tools: toolDefs,
      model: MODEL,
    });

    if (turn.toolCalls.length === 0) {
      // No more tool calls — return the final text
      return turn.text ?? "";
    }

    console.log(
      chalk.yellow(`[agentLoop] tool calls: ${turn.toolCalls.map((tc) => tc.name).join(", ")}`)
    );

    // Append assistant message with tool_calls
    rawMessages.push({
      role: "assistant",
      content: null,
      tool_calls: turn.toolCalls.map((tc) => ({
        id: tc.id,
        type: "function",
        function: { name: tc.name, arguments: JSON.stringify(tc.args) },
      })),
    });

    // Execute each tool and append results
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
      }

      console.log(chalk.gray(`[agentLoop] tool result for ${tc.name}:`), content);

      rawMessages.push({
        role: "tool",
        tool_call_id: tc.id,
        content,
      });
    }
  }

  console.log(chalk.red("[agentLoop] Max iterations reached"));
  return "Przepraszam, nie udało mi się obsłużyć tego żądania.";
};
