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

/** Solde signé d'une ligne (débit − crédit). */
export function soldeLigne(l: { debit: number; credit: number }): number {
  return l.debit - l.credit;
}

/** Ligne valide : montants ≥ 0, débit XOR crédit, non nulle. */
export function ligneValide(l: { debit: number; credit: number }): boolean {
  if (l.debit < 0 || l.credit < 0) return false;
  if (l.debit > 0 && l.credit > 0) return false;
  return l.debit > 0 || l.credit > 0;
}

/** Référence : JOURNAL-EXERCICE-0001. */
export function numeroRef(journal: string, exerciceLibelle: string, seq: number): string {
  return `${journal}-${exerciceLibelle}-${String(seq).padStart(4, '0')}`;
}

/** Extourne : inverse débit/crédit de chaque ligne. */
export function inverseLignes<T extends { debit: number; credit: number }>(lignes: readonly T[]): T[] {
  return lignes.map((l) => ({ ...l, debit: l.credit, credit: l.debit }));
}

/** Date ISO dans la période [debut, fin]. */
export function dateDansPeriode(date: string, debut: string, fin: string): boolean {
  return date >= debut && date <= fin;
}
