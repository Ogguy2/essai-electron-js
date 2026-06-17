/**
 * Règles de domaine — Écritures comptables (partie double).
 * Logique pure, sans accès base : testable isolément (cf. CDC §3.3).
 */

export interface LigneEcriture {
  debit: number;
  credit: number;
}

/** Somme des débits d'une écriture. */
export function totalDebit(lignes: readonly LigneEcriture[]): number {
  return lignes.reduce((acc, l) => acc + l.debit, 0);
}

/** Somme des crédits d'une écriture. */
export function totalCredit(lignes: readonly LigneEcriture[]): number {
  return lignes.reduce((acc, l) => acc + l.credit, 0);
}

/**
 * Une écriture est équilibrée si elle a au moins 2 lignes et que
 * la somme des débits égale la somme des crédits. Règle bloquante
 * à la validation (CDC §3.3).
 */
export function estEquilibree(lignes: readonly LigneEcriture[]): boolean {
  if (lignes.length < 2) return false;
  return totalDebit(lignes) === totalCredit(lignes);
}
