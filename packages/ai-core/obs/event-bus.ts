export type AgentEvent =
  | { type: "run.started"; runId: string }
  | { type: "tool.selected"; tool: string }
  | { type: "tool.completed"; tool: string; ok: boolean }
  | { type: "run.completed" }
  | { type: "run.failed"; error: string };

type Handler<T extends AgentEvent> = (e: T) => void;
type AnyHandler = (e: AgentEvent) => void;

export interface EventBus {
  emit(event: AgentEvent): void;
  on<T extends AgentEvent["type"]>(
    type: T,
    handler: Handler<Extract<AgentEvent, { type: T }>>
  ): void;
  off<T extends AgentEvent["type"]>(
    type: T,
    handler: Handler<Extract<AgentEvent, { type: T }>>
  ): void;
}

export const createEventBus = (): EventBus => {
  const listeners = new Map<string, Set<AnyHandler>>();

  const getSet = (type: string): Set<AnyHandler> => {
    if (!listeners.has(type)) listeners.set(type, new Set());
    return listeners.get(type)!;
  };

  return {
    emit(event: AgentEvent): void {
      const set = listeners.get(event.type);
      if (set) {
        for (const handler of set) handler(event);
      }
    },
    on<T extends AgentEvent["type"]>(
      type: T,
      handler: Handler<Extract<AgentEvent, { type: T }>>
    ): void {
      getSet(type).add(handler as AnyHandler);
    },
    off<T extends AgentEvent["type"]>(
      type: T,
      handler: Handler<Extract<AgentEvent, { type: T }>>
    ): void {
      listeners.get(type)?.delete(handler as AnyHandler);
    },
  };
};
