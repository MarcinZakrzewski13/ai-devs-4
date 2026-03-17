/**
 * @file line-reader.ts
 * @description Czytanie strumienia bajtów z podziałem na linie.
 *
 * ## Po co ten moduł?
 *
 * Protokół MCP w trybie stdio używa prostego formatu: każda wiadomość JSON-RPC
 * to jedna linia tekstu (zakończona znakiem nowej linii `\n`).
 *
 * Problem: strumień danych (stdin, stdout procesu) dostarcza surowe bajty
 * w nierównych porcjach (chunks). Jeden chunk może zawierać:
 *   - niekompletną wiadomość (koniec linii przyjdzie w następnym chunku)
 *   - kilka kompletnych wiadomości naraz
 *   - kompletną wiadomość + początek następnej
 *
 * LineReader buforuje bajty i wydziela kompletne linie dopiero gdy
 * znajdzie znak `\n`.
 *
 * ## Użycie
 *
 * ```typescript
 * // Serwer: czyta stdin
 * const reader = createLineReader(Bun.stdin.stream());
 *
 * // Klient: czyta stdout subprocess
 * const proc = Bun.spawn([...]);
 * const reader = createLineReader(proc.stdout);
 *
 * // Iteracja przez wszystkie linie
 * for await (const line of reader.lines()) {
 *   const message = JSON.parse(line);
 *   // ...
 * }
 * ```
 */

export type LineReader = {
  /**
   * Zwraca następną kompletną linię (bez znaku \n).
   * Zwraca null gdy strumień się zakończył i nie ma więcej danych.
   */
  readLine(): Promise<string | null>;

  /**
   * AsyncIterable po wszystkich liniach aż do zamknięcia strumienia.
   * Pomija puste linie.
   */
  lines(): AsyncIterable<string>;
};

/**
 * Tworzy LineReader z ReadableStream<Uint8Array> (Web Streams API).
 *
 * Kompatybilny z:
 *   - `Bun.stdin.stream()` — standard input serwera
 *   - `proc.stdout` — standard output subprocess (zwracany przez Bun.spawn)
 *
 * @param stream - ReadableStream z bajtami (Uint8Array)
 */
export const createLineReader = (stream: ReadableStream<Uint8Array>): LineReader => {
  const reader = stream.getReader();
  const decoder = new TextDecoder("utf-8");

  // Bufor: bajty odczytane ze strumienia, jeszcze nie zwrócone jako linia
  let buffer = "";

  // Czy strumień dobiegł końca? (reader zwrócił done: true)
  let streamDone = false;

  const readLine = async (): Promise<string | null> => {
    while (true) {
      // Sprawdź czy w buforze jest już kompletna linia (z \n)
      const newlineIdx = buffer.indexOf("\n");
      if (newlineIdx >= 0) {
        // Wytnij linię z bufora (bez \n); obsługuje \r\n (Windows)
        const line = buffer.slice(0, newlineIdx).replace(/\r$/, "");
        // Reszta bufora (po \n) zostaje na następne wywołanie
        buffer = buffer.slice(newlineIdx + 1);
        return line;
      }

      // Brak \n w buforze — potrzebujemy więcej danych ze strumienia
      if (streamDone) {
        // Strumień zamknięty. Zwróć co zostało w buforze jako ostatnią linię
        // (dane bez \n na końcu — niepełna lub ostatnia linia bez nowej linii)
        if (buffer.length > 0) {
          const remaining = buffer.replace(/\r$/, "");
          buffer = "";
          return remaining.length > 0 ? remaining : null;
        }
        return null; // bufor pusty i strumień zamknięty — koniec
      }

      // Czytaj kolejny chunk ze strumienia
      const { value, done } = await reader.read();

      if (done) {
        streamDone = true;
        // Nie przerywamy pętli — sprawdzimy bufor w następnej iteracji
        continue;
      }

      // Dodaj zdekodowany chunk do bufora
      // `stream: true` — informuje decoder że mogą przyjść kolejne chunki
      // (ważne dla wielobajtowych znaków Unicode rozbitych między chunki)
      buffer += decoder.decode(value, { stream: true });
    }
  };

  // AsyncGenerator iterujący po wszystkich liniach do zamknięcia strumienia
  const lines = async function* (): AsyncIterable<string> {
    while (true) {
      const line = await readLine();
      if (line === null) break;         // strumień zakończony
      if (line.trim().length > 0) {     // pomijaj puste linie (np. podwójne \n)
        yield line;
      }
    }
  };

  return { readLine, lines };
};
