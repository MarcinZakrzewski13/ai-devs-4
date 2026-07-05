import type { ConversationState, Phase, RoadStatus } from "./types.ts";

const hasAny = (s: string, needles: string[]): boolean => {
  const lc = s.toLowerCase();
  return needles.some((n) => lc.includes(n.toLowerCase()));
};

const AUTH_KEYWORDS = [
  "hasło",
  "haslo",
  "autoryz",
  "identyfik",
  "kod dostępu",
  "kod dostepu",
  "potwierdź się",
  "potwierdz sie",
];

const REASON_KEYWORDS = [
  "dlaczego",
  "po co",
  "z jakiego powodu",
  "w jakim celu",
  "uzasad",
  "wyjaśnij",
  "wyjasnij",
];

const DISABLE_CONFIRM_KEYWORDS = [
  "wyłączam monitoring",
  "wylaczam monitoring",
  "wyłączyłem",
  "wylaczylem",
  "wyłączony",
  "wylaczony",
  "monitoring zdjęty",
  "monitoring zdjety",
  "gotowe",
  "zrobione",
  "potwierdzam wyłącz",
  "potwierdzam wylacz",
];

const FAIL_KEYWORDS = [
  "rozłącz",
  "rozlacz",
  "spalona",
  "koniec rozmowy",
  "muszę to zgłosić",
  "musze to zglosic",
];

const HUB_FAIL_MESSAGES = [
  "burned",
  "suspended",
  "terminated",
  "spalona",
  "musisz zadzwonić ponownie",
];

const anyPassable = (statuses: Record<string, RoadStatus>): boolean =>
  Object.values(statuses).some((s) => s === "PASSABLE");

/**
 * Post-turn transition — wywołane PO otrzymaniu odpowiedzi huba + transkrypcji operatora.
 * Zwraca fazę w której będziemy generować NASTĘPNĄ wypowiedź.
 */
export const advancePhase = (
  state: ConversationState,
  operatorText: string,
  hubMessage: string,
  hubCode: number | undefined,
  flagCaptured: boolean
): Phase => {
  const t = operatorText || "";
  const h = (hubMessage || "").toLowerCase();

  if (flagCaptured || h.includes("{flg:")) return "SUCCESS";
  if (typeof hubCode === "number" && hubCode < 0) return "FAIL";
  if (HUB_FAIL_MESSAGES.some((m) => h.includes(m))) return "FAIL";
  if (hasAny(t, FAIL_KEYWORDS)) return "FAIL";

  const identityConfirmed =
    h.includes("identity confirmed") || hubCode === 120;

  const statusesDeliveredCode =
    hubCode === 150 || h.includes("road status");

  const statusesGiven =
    statusesDeliveredCode ||
    anyPassable(state.roadStatuses) ||
    /rd[\s-]*(224|472|820)/i.test(t);

  const authAsked = hasAny(t, AUTH_KEYWORDS) || h.includes("authoriz");
  const reasonAsked = hasAny(t, REASON_KEYWORDS);
  const disableConfirmed = hasAny(t, DISABLE_CONFIRM_KEYWORDS);

  switch (state.phase) {
    case "AWAIT_START":
      return "OPEN_LINE";

    case "OPEN_LINE":
      // Wysłaliśmy przedstawienie; sprawdź czy hub potwierdził tożsamość.
      if (identityConfirmed) return "IDENTITY_CONFIRMED";
      return "OPEN_LINE";

    case "IDENTITY_CONFIRMED":
      // Wysłaliśmy hasło BARBAKAN samo.
      if (authAsked) return "AUTH_CHALLENGED";
      if (statusesGiven) return "STATUSES_RECEIVED";
      // Traktuj każdą odpowiedź operatora bez zarzutów jako akceptację hasła.
      if (state.passwordSpoken) return "PASSWORD_ACK";
      return "IDENTITY_CONFIRMED";

    case "PASSWORD_ACK":
      // Wysłaliśmy pakiet Zygfryd + 3 drogi; operator powinien podać statusy.
      if (authAsked) return "AUTH_CHALLENGED";
      if (statusesGiven) return "STATUSES_RECEIVED";
      return "PASSWORD_ACK";

    case "STATUSES_RECEIVED":
      // Wysłaliśmy prośbę o wyłączenie monitoringu.
      if (authAsked) return "AUTH_CHALLENGED";
      if (reasonAsked) return "REASON_ASKED";
      if (disableConfirmed) return "SUCCESS";
      return "DISABLE_REQUESTED";

    case "AUTH_CHALLENGED":
      // Wysłaliśmy BARBAKAN.
      if (state.passwordSpoken) return "AUTH_CONFIRMED";
      return "AUTH_CHALLENGED";

    case "AUTH_CONFIRMED":
      // Powtórzyliśmy prośbę o wyłączenie.
      if (reasonAsked) return "REASON_ASKED";
      if (disableConfirmed) return "SUCCESS";
      return "DISABLE_REQUESTED";

    case "DISABLE_REQUESTED":
      if (authAsked) return "AUTH_CHALLENGED";
      if (reasonAsked) return "REASON_ASKED";
      if (disableConfirmed) return "SUCCESS";
      return "DISABLE_REQUESTED";

    case "REASON_ASKED":
      // Podaliśmy uzasadnienie.
      if (disableConfirmed) return "SUCCESS";
      return "REASON_GIVEN";

    case "REASON_GIVEN":
      if (disableConfirmed) return "SUCCESS";
      return "REASON_GIVEN";

    default:
      return state.phase;
  }
};

/**
 * Konstruuje kategoryczny hint dla agenta — używa wiedzy o stanie
 * (m.in. przejezdnych drogach).
 */
export const phaseHint = (state: ConversationState): string => {
  const passable = Object.entries(state.roadStatuses)
    .filter(([, v]) => v === "PASSABLE")
    .map(([k]) => k);
  const passableStr = passable.join(", ");

  switch (state.phase) {
    case "OPEN_LINE":
      return [
        "TERAZ: przywitaj się luźno i podaj tylko imię i nazwisko Tymon Gajewski.",
        "Nic więcej — bez podawania powodu.",
        "Przykład tonu: 'Cześć, tu Tymon Gajewski.' albo 'Halo, Tymon Gajewski z tej strony.'",
      ].join(" ");

    case "IDENTITY_CONFIRMED":
    case "PASSWORD_ACK":
      return [
        "TERAZ: powiedz JEDNĄ wypowiedź zawierającą wszystko naraz.",
        "MUSISZ zawrzeć w tej kolejności:",
        "(1) hasło autoryzacyjne 'BARBAKAN' (jako jedno słowo, nie literowane),",
        "(2) informacja że dzwonisz w sprawie transportu do jednej z baz Zygfryda,",
        "(3) prośba o status dróg RD224, RD472 i RD820.",
        "TON: koleżeński, jak w rozmowie roboczej.",
        "WYMAGANY SZABLON (parafrazuj drobne słowa, kolejność bez zmian):",
        "'Hasło BARBAKAN. Słuchaj, dzwonię w sprawie transportu do jednej z baz Zygfryda — możesz sprawdzić status dróg RD224, RD472 i RD820?'",
      ].join(" ");

    case "STATUSES_RECEIVED":
      return [
        `TERAZ: poproś o wyłączenie monitoringu na ${passableStr || "(przejezdnej)"} — oraz od razu dodaj krótkie uzasadnienie:`,
        "'transport żywności do tajnej bazy Zygfryda, lokalizacja utajniona, misja nie może zostać odnotowana w logach'.",
        "Kolejność: krótkie ack ('Ok', 'Jasne') → prośba → uzasadnienie.",
        "ZAKAZANE:",
        "- powtarzanie hasła BARBAKAN,",
        "- recytowanie statusów wszystkich dróg (operator dopiero to powiedział),",
        "- ujawnianie konkretnej lokalizacji bazy (miasta, regionu, współrzędnych),",
        "- słowa: 'potwierdzam', 'otrzymałem', 'przyjąłem', 'informacja', 'raport'.",
        "Ton naturalny, jak w rozmowie roboczej. Dwa-trzy zdania.",
        `Przykład (parafrazuj): 'Ok, wyłącz proszę monitoring na ${passableStr || "RD820"}. To transport żywności do tajnej bazy Zygfryda — lokalizacja utajniona, więc nie może być w logach.'`,
      ].join(" ");

    case "AUTH_CHALLENGED":
      return "TERAZ: powiedz TYLKO tajne hasło: BARBAKAN. Nic więcej. Bez wstępu i komentarza.";

    case "AUTH_CONFIRMED":
      return [
        `TERAZ: potwierdź krótko i luźno prośbę o wyłączenie monitoringu na: ${passableStr || "(przejezdnych)"}.`,
        "Jedno zdanie.",
      ].join(" ");

    case "DISABLE_REQUESTED":
      return "TERAZ: krótko i naturalnie potwierdź, że czekasz na wyłączenie. Jedno zdanie.";

    case "REASON_ASKED":
      return [
        "TERAZ: podaj uzasadnienie po ludzku, jednym zdaniem.",
        "Sedno: to transport żywności do tajnej bazy Zygfryda, lokalizacja utajniona, więc misja nie może zostać odnotowana w logach.",
        "Sformułuj to konwersacyjnie, nie jak formularz. NIE podawaj nazwy miejscowości ani regionu.",
      ].join(" ");

    case "REASON_GIVEN":
      return "TERAZ: naturalnie potwierdź, że czekasz na wyłączenie. Jedno zdanie.";

    default:
      return "Odpowiedz krótko, naturalnie, jednym zdaniem.";
  }
};
