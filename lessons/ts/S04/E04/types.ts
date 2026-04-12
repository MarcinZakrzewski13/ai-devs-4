// Typy domenowe dla zadania filesystem (S04E04).

export type CityNeed = {
  /** Nazwa towaru w mianowniku liczby pojedynczej, lowercase, bez polskich znaków. */
  towar: string;
  /** Ilość (bez jednostek) — po ekstrakcji z fraz typu "45 chlebow", "120 butelek wody". */
  ilosc: number;
};

export type City = {
  /** Nazwa miasta w mianowniku, lowercase, bez polskich znaków (np. "domatowo"). */
  nazwa: string;
  potrzeby: CityNeed[];
};

export type Person = {
  /** Imię, lowercase, bez polskich znaków. */
  imie: string;
  /** Nazwisko, lowercase, bez polskich znaków. */
  nazwisko: string;
  /** Nazwa miasta zarządzanego przez tę osobę (lowercase). */
  miasto: string;
};

export type Good = {
  /** Nazwa towaru w mianowniku l. poj., lowercase (np. "chleb", "ryz"). */
  nazwa: string;
  /** Miasta, które sprzedają ten towar (lewa strona strzałki w transakcje.txt). */
  sprzedawcy: string[];
};

export type ExtractedData = {
  miasta: City[];
  osoby: Person[];
  towary: Good[];
};

// Operacje filesystem API (patrz api-help.json).
export type FsOp =
  | { action: "reset" }
  | { action: "createDirectory"; path: string }
  | { action: "createFile"; path: string; content: string }
  | { action: "done" };

export type ApiResponse = {
  code: number;
  message?: string;
  flag?: string;
  [key: string]: unknown;
};
