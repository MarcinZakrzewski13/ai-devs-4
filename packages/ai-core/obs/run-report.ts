import type { AgentEvent, EventBus } from "./event-bus.ts";

export type ToolUsage = { tool: string; ok: boolean };

export type RunReport = {
  runId: string;
  startedAt: Date | null;
  completedAt: Date | null;
  failed: boolean;
  failureReason: string | null;
  toolUsages: ToolUsage[];
};

/**
 * Aggregates events from a single run into a RunReport.
 * Attaches listeners to the given EventBus and returns a getter for the report.
 */
export const createRunReporter = (
  bus: EventBus
): { getReport: () => RunReport } => {
  const report: RunReport = {
    runId: "",
    startedAt: null,
    completedAt: null,
    failed: false,
    failureReason: null,
    toolUsages: [],
  };

  bus.on("run.started", (e: Extract<AgentEvent, { type: "run.started" }>) => {
    report.runId = e.runId;
    report.startedAt = new Date();
  });

  bus.on("tool.completed", (e: Extract<AgentEvent, { type: "tool.completed" }>) => {
    report.toolUsages.push({ tool: e.tool, ok: e.ok });
  });

  bus.on("run.completed", () => {
    report.completedAt = new Date();
  });

  bus.on("run.failed", (e: Extract<AgentEvent, { type: "run.failed" }>) => {
    report.failed = true;
    report.failureReason = e.error;
    report.completedAt = new Date();
  });

  return { getReport: () => ({ ...report, toolUsages: [...report.toolUsages] }) };
};
