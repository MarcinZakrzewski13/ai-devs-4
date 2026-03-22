export type ZmailRequest = {
  apikey: string;
  action: string;
  page?: number;
  query?: string;
  messageId?: string;
};

export type ZmailResponse = {
  code: number;
  message: string;
  data?: unknown;
};

export type MailboxAnswer = {
  date: string;
  password: string;
  confirmation_code: string;
};
