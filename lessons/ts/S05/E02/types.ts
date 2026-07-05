export type Phase =
  | "AWAIT_START"
  | "OPEN_LINE"            // sesja otwarta, mamy powiedzieć przedstawienie
  | "IDENTITY_CONFIRMED"   // hub potwierdził tożsamość, operator pyta w jakiej sprawie → mamy wypowiedzieć BARBAKAN (samo)
  | "PASSWORD_ACK"         // hub przyjął hasło → mamy powiedzieć pakiet Zygfryd + 3 drogi
  | "STATUSES_RECEIVED"    // operator podał statusy dróg → mamy poprosić o wyłączenie monitoringu na PASSABLE
  | "AUTH_CHALLENGED"      // operator żąda hasła ponownie → BARBAKAN
  | "AUTH_CONFIRMED"       // hasło przyjęte → ponawiamy prośbę
  | "DISABLE_REQUESTED"    // wysłaliśmy prośbę o wyłączenie → czekamy na potwierdzenie lub pytanie
  | "REASON_ASKED"         // operator pyta o powód → podajemy uzasadnienie
  | "REASON_GIVEN"         // uzasadnienie podane → czekamy na potwierdzenie
  | "SUCCESS"
  | "FAIL";

export type RoadId = "RD224" | "RD472" | "RD820";
export type RoadStatus = "PASSABLE" | "BLOCKED" | "UNKNOWN";

export type TurnRole = "operator" | "tymon" | "hub";

export type ConversationTurn = {
  role: TurnRole;
  seq: number;
  text: string;
  audioPath?: string;
  hubCode?: number;
  hubMessage?: string;
};

export type ConversationState = {
  phase: Phase;
  turns: ConversationTurn[];
  roadStatuses: Record<RoadId, RoadStatus>;
  passwordSpoken: boolean;
  reasonSpoken: boolean;
  attemptId: number;
  flag: string | null;
};

export type HubResponse = {
  code?: number;
  message?: string;
  msg?: string;
  action?: string;
  audio?: string;
  flag?: string;
  error?: string;
};
