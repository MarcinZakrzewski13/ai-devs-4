import type { SessionMessage } from "./types.ts";

export type SessionStore = {
  getHistory(sessionID: string): SessionMessage[];
  append(sessionID: string, messages: SessionMessage[]): void;
};

export const createSessionStore = (): SessionStore => {
  const store = new Map<string, SessionMessage[]>();

  return {
    getHistory(sessionID) {
      return store.get(sessionID) ?? [];
    },
    append(sessionID, messages) {
      const existing = store.get(sessionID) ?? [];
      store.set(sessionID, [...existing, ...messages]);
    },
  };
};
