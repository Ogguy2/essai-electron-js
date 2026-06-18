/**
 * Domaine reporting SicoCompte.
 * Lecture de signe : solde = débit − crédit (SYSCOHADA).
 */

export interface Mouvement {
  compte: string; classe: number; compte_libelle: string; tiers: string | null;
  date: string; journal: string; ref: string; ligne_libelle: string;
  debit: number; credit: number; echeance: string | null; lettrage: string | null;
}

export interface LigneBalance {
  numero: string; libelle: string; classe: number;
  debit: number; credit: number; solde_debiteur: number; solde_crediteur: number;
}

export interface SoldeCompte { debit: number; credit: number; solde: number; }

export interface MouvementGL extends Mouvement { solde_progressif: number; }

export interface Resultat {
  charges: number; produits: number; resultat: number;
  charges_detail: LigneBalance[]; produits_detail: LigneBalance[];
}

/** Balance : agrégat par compte (numero). solde_debiteur/crediteur selon le signe. */
export function balance(mvts: readonly Mouvement[]): LigneBalance[] {
  const map = new Map<string, LigneBalance>();
  for (const m of mvts) {
    let b = map.get(m.compte);
    if (!b) { b = { numero: m.compte, libelle: m.compte_libelle, classe: m.classe, debit: 0, credit: 0, solde_debiteur: 0, solde_crediteur: 0 }; map.set(m.compte, b); }
    b.debit += m.debit; b.credit += m.credit;
  }
  const rows = [...map.values()].sort((a, b) => a.numero.localeCompare(b.numero));
  for (const b of rows) { const s = b.debit - b.credit; b.solde_debiteur = s > 0 ? s : 0; b.solde_crediteur = s < 0 ? -s : 0; }
  return rows;
}

export function soldeCompte(mvts: readonly Mouvement[], numero: string): SoldeCompte {
  let debit = 0, credit = 0;
  for (const m of mvts) if (m.compte === numero) { debit += m.debit; credit += m.credit; }
  return { debit, credit, solde: debit - credit };
}

export function soldeComptes(mvts: readonly Mouvement[], numeros: string[]): number {
  return numeros.reduce((s, n) => s + soldeCompte(mvts, n).solde, 0);
}

/** Grand livre : mouvements filtrés (par compte OU tiers) triés par date, solde progressif signé. */
export function grandLivre(mvts: readonly Mouvement[], filtre: { compte?: string; tiers?: string }): MouvementGL[] {
  const f = mvts.filter((m) => (filtre.compte ? m.compte === filtre.compte : true) && (filtre.tiers ? m.tiers === filtre.tiers : true));
  const sorted = [...f].sort((a, b) => a.date.localeCompare(b.date) || a.ref.localeCompare(b.ref));
  let cum = 0;
  return sorted.map((m) => { cum += m.debit - m.credit; return { ...m, solde_progressif: cum }; });
}

/** Compte de résultat : charges (classe 6, sens débiteur) vs produits (classe 7, sens créditeur). */
export function resultat(mvts: readonly Mouvement[]): Resultat {
  const b = balance(mvts);
  const charges_detail = b.filter((l) => l.classe === 6);
  const produits_detail = b.filter((l) => l.classe === 7);
  const charges = charges_detail.reduce((s, l) => s + (l.debit - l.credit), 0);
  const produits = produits_detail.reduce((s, l) => s + (l.credit - l.debit), 0);
  return { charges, produits, resultat: produits - charges, charges_detail, produits_detail };
}

/** Prochain code de lettrage alphabétique (A, B, …, Z, AA, …). */
export function nextLettrageCode(existants: readonly string[]): string {
  const toNum = (s: string) => [...s].reduce((n, ch) => n * 26 + (ch.charCodeAt(0) - 64), 0);
  const toCode = (n: number) => { let s = ''; while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); } return s; };
  const max = existants.filter(Boolean).reduce((mx, c) => Math.max(mx, toNum(c)), 0);
  return toCode(max + 1);
}
