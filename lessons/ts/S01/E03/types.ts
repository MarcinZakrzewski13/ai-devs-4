export type ProxyRequest = {
  sessionID: string;
  msg: string;
};

export type ProxyResponse = {
  msg: string;
};

export type SessionMessage = {
  role: "user" | "assistant";
  content: string;
};

export type ProxyAnswer = {
  sessionID: string;
  answer: string;
};
