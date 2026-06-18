/**
 * Normalisation de texte — logique pure (sans dépendance).
 *
 * Contexte : HFSQL/ODBC corrompt les caractères non‑ASCII (node-odbc relit en
 * UTF‑8 des octets ANSI → « � »), et on ne peut pas passer les colonnes en
 * Unicode. On stocke donc le texte en **ASCII** (sans accents), et les champs
 * de texte humain en **MAJUSCULES** (convention plan comptable SYSCOHADA).
 */

// Marques de combinaison (accents) issues de la décomposition NFD.
const COMBINING = /[̀-ͯ]/g;
// Filet : tout caractère hors ASCII restant (code >= 0x80).
const NON_ASCII = /[\u{80}-\u{10FFFF}]/gu;

/** Retire les accents/diacritiques et garantit un résultat ASCII pur. */
export function deaccent(s: string): string {
  return s
    .normalize('NFD')
    .replace(COMBINING, '')
    .replace(/œ/g, 'oe')
    .replace(/Œ/g, 'OE')
    .replace(/æ/g, 'ae')
    .replace(/Æ/g, 'AE')
    .replace(NON_ASCII, '');
}

/** De-accent + MAJUSCULES (pour les libellés / texte humain stocké). */
export function toAsciiUpper(s: string): string {
  return deaccent(s).toUpperCase();
}
