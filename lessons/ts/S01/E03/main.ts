// Modele użyte w zadaniu:
//   - gpt-5-mini → Function Calling agent loop (agentLoop.ts)

import chalk from "chalk";
import { config } from "dotenv";
import { createSessionStore } from "./sessionStore.ts";
import { createSessionLogger } from "./sessionLogger.ts";
import { handleProxyRequest } from "./handleRequest.ts";
import type { ProxyRequest } from "./types.ts";

config();

const PORT = 3000;
const sessionStore = createSessionStore();
const sessionLogger = await createSessionLogger("S01E03");

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    if (req.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    let body: ProxyRequest;
    try {
      body = (await req.json()) as ProxyRequest;
    } catch {
      return new Response("Bad Request: invalid JSON", { status: 400 });
    }

    if (!body.sessionID || !body.msg) {
      return new Response("Bad Request: missing sessionID or msg", { status: 400 });
    }

    const result = await handleProxyRequest(body, sessionStore, sessionLogger);
    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
    });
  },
});

console.log(chalk.green(`[main] Server running on http://localhost:${PORT}`));

import { sendAnswer } from "@ai-devs/ai-devs-hub";

const publicUrl = process.env.PUBLIC_URL;
if (!publicUrl) {
  console.error(chalk.red("[main] PUBLIC_URL not set — skipping registration"));
} else {
  const endpointUrl = publicUrl.replace(/\/$/, "") + "/";
  console.log(chalk.cyan(`[main] Registering endpoint: ${publicUrl}`));
  await sendAnswer("proxy", { url: endpointUrl, sessionID: "s01e03" });
}
