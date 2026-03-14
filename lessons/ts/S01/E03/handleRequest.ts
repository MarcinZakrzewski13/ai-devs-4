import chalk from "chalk";
import type { SessionStore } from "./sessionStore.ts";
import type { SessionLogger } from "./sessionLogger.ts";
import type { ProxyRequest, ProxyResponse } from "./types.ts";
import { runAgentLoop } from "./agentLoop.ts";
import { allTools } from "./tools.ts";
import { buildSystemPrompt } from "./systemPrompt.ts";

const FLAG_PATTERN = /\{FLG:[^}]+\}/g;

const detectFlags = (text: string): void => {
  const flags = text.match(FLAG_PATTERN);
  if (flags) {
    for (const flag of flags) {
      console.log(chalk.bgGreen.black(`\n🚩 FLAG DETECTED IN MESSAGE: ${flag}\n`));
    }
  }
};

export const handleProxyRequest = async (
  req: ProxyRequest,
  sessionStore: SessionStore,
  sessionLogger: SessionLogger
): Promise<ProxyResponse> => {
  const { sessionID, msg } = req;
  console.log(chalk.cyan(`[handleRequest] sessionID=${sessionID} msg="${msg}"`));

  // Check if the incoming message contains a flag
  detectFlags(msg);

  const history = sessionStore.getHistory(sessionID);

  const assistantText = await runAgentLoop({
    history,
    userMessage: msg,
    tools: allTools,
    systemPrompt: buildSystemPrompt(),
  });

  sessionStore.append(sessionID, [
    { role: "user", content: msg },
    { role: "assistant", content: assistantText },
  ]);

  await sessionLogger.logExchange(sessionID, msg, assistantText);

  console.log(chalk.green(`[handleRequest] response: "${assistantText}"`));
  return { msg: assistantText };
};
