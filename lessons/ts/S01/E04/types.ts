/**
 * Typy dla zadania S01E04 — sendit (deklaracja transportu SPK).
 */

/** Dane przesyłki do wypełnienia deklaracji. */
export type ShipmentData = {
  senderId: string;
  origin: string;
  destination: string;
  weightKg: number;
  category: "A" | "B" | "C" | "D" | "E";
  contentDescription: string;
  wdp: number;
  specialNotes: string;
  amountPp: number;
};

/** Kontekst do budowy deklaracji — dane + kod trasy + data. */
export type DeclarationContext = ShipmentData & {
  routeCode: string;
  date: string; // YYYY-MM-DD
};
