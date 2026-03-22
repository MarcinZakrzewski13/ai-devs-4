import { toolOk, toolErr, type AiTool } from "@ai-devs/ai-core";
import { sendAnswer, saveTmpAnswer, saveFinalAnswer } from "@ai-devs/ai-devs-hub";
import { callZmail } from "./zmail-api.ts";
import type { MailboxAnswer } from "./types.ts";

const zmailHelpTool: AiTool = {
  name: "zmail_help",
  description: "Get available API actions and their parameters.",
  inputSchema: {
    type: "object",
    properties: {},
    required: [],
    additionalProperties: false,
  },
  async execute() {
    try {
      const result = await callZmail("help");
      return toolOk(result);
    } catch (e) {
      return toolErr(String(e));
    }
  },
};

const zmailInboxTool: AiTool = {
  name: "zmail_inbox",
  description: "Get list of emails in the inbox (metadata only, no message body). Use page parameter for pagination.",
  inputSchema: {
    type: "object",
    properties: {
      page: { type: "number", description: "Page number (starts at 1)" },
    },
    required: ["page"],
    additionalProperties: false,
  },
  async execute(args: any) {
    try {
      const result = await callZmail("getInbox", { page: args.page });
      return toolOk(result);
    } catch (e) {
      return toolErr(String(e));
    }
  },
};

const zmailSearchTool: AiTool = {
  name: "zmail_search",
  description:
    "Search emails using Gmail-like query operators (from:, to:, subject:, OR, AND). Returns metadata only — use zmail_get_message to read full content.",
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: 'Search query with Gmail operators, e.g. "from:proton.me" or "subject:password"',
      },
      page: { type: "number", description: "Page number (default 1)" },
    },
    required: ["query"],
    additionalProperties: false,
  },
  async execute(args: any) {
    try {
      const params: Record<string, unknown> = { query: args.query };
      if (args.page) params.page = args.page;
      const result = await callZmail("search", params);
      return toolOk(result);
    } catch (e) {
      return toolErr(String(e));
    }
  },
};

const zmailGetMessageTool: AiTool = {
  name: "zmail_get_message",
  description: "Get the full content of one or more emails by rowID or messageID (32-char hash). Returns message body.",
  inputSchema: {
    type: "object",
    properties: {
      ids: {
        description: "A rowID (number), messageID (32-char hash string), or an array of them",
        oneOf: [
          { type: "number" },
          { type: "string" },
          { type: "array", items: { oneOf: [{ type: "number" }, { type: "string" }] } },
        ],
      },
    },
    required: ["ids"],
    additionalProperties: false,
  },
  async execute(args: any) {
    try {
      const result = await callZmail("getMessages", { ids: args.ids });
      return toolOk(result);
    } catch (e) {
      return toolErr(String(e));
    }
  },
};

const submitAnswerTool: AiTool = {
  name: "submit_answer",
  description:
    "Submit the three found values to the hub. Returns success with flag or error with feedback about which values are wrong.",
  inputSchema: {
    type: "object",
    properties: {
      date: { type: "string", description: "Attack date in YYYY-MM-DD format" },
      password: { type: "string", description: "Password to the employee system" },
      confirmation_code: { type: "string", description: "Confirmation code (SEC-... format, 36 chars)" },
    },
    required: ["date", "password", "confirmation_code"],
    additionalProperties: false,
  },
  async execute(args: any) {
    try {
      const answer: MailboxAnswer = {
        date: args.date,
        password: args.password,
        confirmation_code: args.confirmation_code,
      };
      await saveTmpAnswer("S02E04", "mailbox", answer);
      const result = await sendAnswer("mailbox", answer);
      if (result.code === 0) {
        await saveFinalAnswer("S02E04", "mailbox", answer, result);
      }
      return toolOk(result);
    } catch (e) {
      return toolErr(String(e));
    }
  },
};

const finishTool: AiTool = {
  name: "finish",
  description: "Call this when you are done — either after receiving the flag or after exhausting all search options.",
  inputSchema: {
    type: "object",
    properties: {
      summary: { type: "string", description: "Brief summary of what was found" },
    },
    required: ["summary"],
    additionalProperties: false,
  },
  async execute(args: any) {
    return toolOk({ finished: true, summary: args.summary });
  },
};

export const allTools: AiTool[] = [
  zmailHelpTool,
  zmailInboxTool,
  zmailSearchTool,
  zmailGetMessageTool,
  submitAnswerTool,
  finishTool,
];
