import chalk from "chalk";
import { createDefaultProvider, type AiTool } from "@ai-devs/ai-core";

const MAX_ITERATIONS = 30;
const MODEL = "anthropic/claude-sonnet-4-6";

type AgentResult = {
  finished: boolean;
  summary: string;
};

export const runFirmwareAgent = async (
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
        "Debug and run the firmware at /opt/firmware/cooler/cooler.bin. Start by running 'help' to learn the available shell commands.",
    },
  ];

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    console.log(chalk.blue(`\n[agent] iteration ${i + 1}/${MAX_ITERATIONS}`));

    const turn = await provider.callTools({
      messages: rawMessages as any,
      tools: toolDefs,
      model: MODEL,
    });

    if (turn.toolCalls.length === 0) {
      console.log(chalk.yellow("[agent] No tool calls — model response:"), turn.text);
      return { finished: false, summary: turn.text ?? "No tool calls returned" };
    }

    console.log(
      chalk.yellow(`[agent] tools: ${turn.toolCalls.map((tc) => tc.name).join(", ")}`)
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
          console.log(chalk.green("[agent] Finished:"), (result as any).data?.summary);
          rawMessages.push({ role: "tool", tool_call_id: tc.id, content });
          return { finished: true, summary: (result as any).data?.summary ?? "" };
        }

        if (tc.name === "submit_answer" && result.ok) {
          const data = (result as any).data;
          if (data?.code === 0 || data?.message?.includes("{FLG:")) {
            console.log(chalk.bgGreen.black(`\n FLAG: ${data.message} \n`));
          }
        }
      }

      const preview = content.length > 500 ? content.slice(0, 500) + "..." : content;
      console.log(chalk.gray(`[agent] ${tc.name} →`), preview);

      rawMessages.push({ role: "tool", tool_call_id: tc.id, content });
    }
  }

  console.log(chalk.red("[agent] Max iterations reached"));
  return { finished: false, summary: "Max iterations reached" };
};
