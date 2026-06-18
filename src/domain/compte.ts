/**
 * Règles de domaine — Plan comptable SYSCOHADA (logique pure, sans accès base).
 */

/** Comptes collectifs « ancres » des tiers (clients/fournisseurs). */
export const COMPTES_COLLECTIFS = ['4011', '4111'] as const;

/** Numéro valide : uniquement des chiffres, longueur 2 à 8. */
export function isNumeroValide(numero: string): boolean {
  return /^[0-9]{2,8}$/.test(numero);
}

/** Classe SYSCOHADA = premier chiffre (1–9), ou null si invalide. */
export function classeFromNumero(numero: string): number | null {
  if (!/^[1-9]/.test(numero)) return null;
  return Number(numero[0]);
}

/** Vrai si le numéro est un compte collectif ancre (non supprimable). */
export function estAncreCollectif(numero: string): boolean {
  return (COMPTES_COLLECTIFS as readonly string[]).includes(numero);
}
