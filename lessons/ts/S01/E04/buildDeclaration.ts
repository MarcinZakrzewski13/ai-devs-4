/**
 * Buduje pełny tekst deklaracji SPK zgodnie ze wzorem z załącznika E.
 * Czysta funkcja — zero efektów ubocznych.
 */

import type { DeclarationContext } from "./types.ts";

/**
 * Buduje deklarację zawartości w formacie SPK.
 * Formatowanie musi być zachowane dokładnie jak we wzorze — Hub weryfikuje wartości i format.
 */
export function buildDeclaration(ctx: DeclarationContext): string {
  const lines: string[] = [
    "SYSTEM PRZESYŁEK KONDUKTORSKICH - DEKLARACJA ZAWARTOŚCI",
    "======================================================",
    `DATA: ${ctx.date}`,
    `PUNKT NADAWCZY: ${ctx.origin}`,
    "------------------------------------------------------",
    `NADAWCA: ${ctx.senderId}`,
    `PUNKT DOCELOWY: ${ctx.destination}`,
    `TRASA: ${ctx.routeCode}`,
    "------------------------------------------------------",
    `KATEGORIA PRZESYŁKI: ${ctx.category}`,
    "------------------------------------------------------",
    `OPIS ZAWARTOŚCI (max 200 znaków): ${ctx.contentDescription}`,
    "------------------------------------------------------",
    `DEKLAROWANA MASA (kg): ${ctx.weightKg}`,
    "------------------------------------------------------",
    `WDP: ${ctx.wdp}`,
    "------------------------------------------------------",
    `UWAGI SPECJALNE: ${ctx.specialNotes}`,
    "------------------------------------------------------",
    `KWOTA DO ZAPŁATY: ${ctx.amountPp}`,
    "------------------------------------------------------",
    "OŚWIADCZAM, ŻE PODANE INFORMACJE SĄ PRAWDZIWE.",
    "BIORĘ NA SIEBIE KONSEKWENCJĘ ZA FAŁSZYWE OŚWIADCZENIE.",
    "======================================================",
  ];

  return lines.join("\n");
}
