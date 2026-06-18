/** Référentiel des types de journaux — données fixes (pas de table). */
export interface JournalType { code: string; libelle: string; }

export const JOURNAL_TYPES: JournalType[] = [
  { code: 'ACHT', libelle: 'Journal des achats' },
  { code: 'VTE', libelle: 'Journal des ventes' },
  { code: 'CAI', libelle: 'Journal de caisse' },
  { code: 'BANQ', libelle: 'Journal de banque' },
  { code: 'TVA', libelle: 'Journal de TVA' },
  { code: 'PAIE', libelle: 'Journal de paie' },
  { code: 'OD', libelle: 'Opérations diverses' },
];

export const JOURNAL_TYPE_CODES = JOURNAL_TYPES.map((t) => t.code);

export function isJournalType(code: string): boolean {
  return JOURNAL_TYPE_CODES.includes(code);
}

/** Jeu standard de journaux seedé à la création d'un magasin. */
export const DEFAULT_JOURNAUX: { code: string; libelle: string; type: string }[] = [
  { code: 'AN', libelle: 'A-nouveaux', type: 'OD' },
  { code: 'VTE', libelle: 'Journal des ventes', type: 'VTE' },
  { code: 'ACHT', libelle: 'Journal des achats', type: 'ACHT' },
  { code: 'BANQ', libelle: 'Journal de banque', type: 'BANQ' },
  { code: 'CAI', libelle: 'Journal de caisse', type: 'CAI' },
  { code: 'OD', libelle: 'Operations diverses', type: 'OD' },
];
