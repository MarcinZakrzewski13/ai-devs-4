import { toolOk, toolErr, type AiTool } from "@ai-devs/ai-core";
import {
  sendAnswer,
  saveTmpAnswer,
  saveFinalAnswer,
} from "@ai-devs/ai-devs-hub";
import chalk from "chalk";

const EPISODE_ID = "S03E05";
const TASK_NAME = "savethem";

export const submitAnswerTool: AiTool = {
  name: "submit_answer",
  description:
    "Submit a route to the hub for verification. " +
    'The answer must be an array like ["rocket","up","right","dismount","right"]. ' +
    "First element is vehicle name, then directions, with optional 'dismount' to switch to walk. " +
    "Returns the hub response — look for {FLG:...} in the message.",
  inputSchema: {
    type: "object",
    properties: {
      route: {
        type: "array",
        items: { type: "string" },
        description:
          'Route commands array, e.g. ["rocket","up","right","dismount","right"]',
      },
      label: {
        type: "string",
        description:
          "Label for this submission (e.g. 'main_route', 'beaver_route')",
      },
    },
    required: ["route", "label"],
    additionalProperties: false,
  },
  async execute(args: { route: string[]; label: string }) {
    try {
      console.log(
        chalk.cyan(
          `  [submit] ${args.label}: ${JSON.stringify(args.route)}`
        )
      );

      await saveTmpAnswer(EPISODE_ID, TASK_NAME, args.route);
      const result = await sendAnswer(TASK_NAME, args.route);

      if (result.code === 0 || result.message?.includes("{FLG:")) {
        const flag =
          result.flag ?? result.message?.match(/\{FLG:[^}]+\}/)?.[0];
        console.log(chalk.bgGreen.black(`\n FLAG (${args.label}): ${flag} `));

        const taskSuffix =
          args.label === "main_route" ? "" : `-${args.label}`;
        await saveFinalAnswer(
          EPISODE_ID,
          `${TASK_NAME}${taskSuffix}`,
          args.route,
          result
        );
      }

      return toolOk({
        code: result.code,
        message: result.message,
        flag: result.flag,
      });
    } catch (e) {
      return toolErr(`Submit failed: ${e}`);
    }
  },
};
