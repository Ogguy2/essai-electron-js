/**
 * Données de démonstration (SYSCOHADA) — provisoires.
 * Remplaceront les appels au processus principal (preload/IPC) quand l'accès
 * HFSQL sera branché. Repris de docs/design/data.js.
 */

export interface Societe {
  id: number;
  raison_sociale: string;
  rccm: string;
  adresse: string;
  telephone: string;
}

export interface Magasin {
  id: number;
  libelle: string;
  societe_id: number;
}

export interface Exercice {
  id: number;
  libelle: string;
  date_debut: string;
  date_fin: string;
  statut: 'ouvert' | 'cloture';
}

export interface Utilisateur {
  name: string;
  username: string;
  email: string;
  role: 'Admin' | 'Comptable';
}

export type StatutEcriture = 'brouillon' | 'validee' | 'invalidee';

export interface LigneEcriture {
  compte: string;
  tiers: string | null;
  libelle: string;
  debit: number;
  credit: number;
  echeance: string | null;
  lettrage: string | null;
}

export interface Ecriture {
  id: number;
  magasin: number;
  ref: string;
  journal: string;
  date: string;
  libelle: string;
  statut: StatutEcriture;
  lines: LigneEcriture[];
}

export const societes: Societe[] = [
  {
    id: 1,
    raison_sociale: 'SICONEX SARL',
    rccm: 'CI-ABJ-2019-B-12480',
    adresse: 'Bd VGE, Zone 4, Marcory — Abidjan',
    telephone: '+225 27 21 35 80 14',
  },
  {
    id: 2,
    raison_sociale: 'SICONEX DISTRIBUTION SARL',
    rccm: 'CI-ABJ-2024-B-04419',
    adresse: 'Rue du Commerce, Yopougon — Abidjan',
    telephone: '+225 27 23 50 12 00',
  },
];

export const societeById: Record<number, Societe> = Object.fromEntries(
  societes.map((s) => [s.id, s]),
);

export const magasins: Magasin[] = [
  { id: 1, libelle: 'Siconex - Marcory', societe_id: 1 },
  { id: 2, libelle: 'Siconex - Ena', societe_id: 1 },
];

export const exercices: Exercice[] = [
  { id: 1, libelle: '2025', date_debut: '2025-01-01', date_fin: '2025-12-31', statut: 'cloture' },
  { id: 2, libelle: '2026', date_debut: '2026-01-01', date_fin: '2026-12-31', statut: 'ouvert' },
];

export const user: Utilisateur = {
  name: 'Aïcha Koné',
  username: 'admin',
  email: 'a.kone@siconex.ci',
  role: 'Admin',
};

function line(
  compte: string,
  debit: number,
  credit: number,
  opts: Partial<Omit<LigneEcriture, 'compte' | 'debit' | 'credit'>> = {},
): LigneEcriture {
  return {
    compte,
    debit,
    credit,
    tiers: opts.tiers ?? null,
    libelle: opts.libelle ?? '',
    echeance: opts.echeance ?? null,
    lettrage: opts.lettrage ?? null,
  };
}

type RawEcriture = Omit<Ecriture, 'id' | 'magasin'>;

const marcory: RawEcriture[] = [
  { ref: 'AN-2026-0001', journal: 'AN', date: '2026-01-01', libelle: 'À-nouveaux — reports exercice 2025', statut: 'validee', lines: [
    line('521', 5000000, 0, { libelle: 'Solde banque au 31/12' }),
    line('571', 800000, 0, { libelle: 'Solde caisse au 31/12' }),
    line('311', 3200000, 0, { libelle: 'Stock marchandises' }),
    line('2411', 4000000, 0, { libelle: 'Matériel & agencement' }),
    line('101', 0, 10000000, { libelle: 'Capital social' }),
    line('106', 0, 2000000, { libelle: 'Réserves' }),
    line('162', 0, 1000000, { libelle: 'Emprunt bancaire' }),
  ] },
  { ref: 'VTE-2026-0001', journal: 'VTE', date: '2026-01-08', libelle: 'Facture FV-1042 — Pharmacie du Plateau', statut: 'validee', lines: [
    line('4111', 1180000, 0, { tiers: 'C001', libelle: 'Pharmacie du Plateau', echeance: '2026-02-07', lettrage: 'A' }),
    line('701', 0, 1000000, { libelle: 'Ventes marchandises' }),
    line('4431', 0, 180000, { libelle: 'TVA collectée 18%' }),
  ] },
  { ref: 'VTE-2026-0002', journal: 'VTE', date: '2026-01-15', libelle: 'Facture FV-1043 — Restaurant Le Baobab', statut: 'validee', lines: [
    line('4111', 590000, 0, { tiers: 'C002', libelle: 'Restaurant Le Baobab', echeance: '2026-02-14' }),
    line('701', 0, 500000, { libelle: 'Ventes marchandises' }),
    line('4431', 0, 90000, { libelle: 'TVA collectée 18%' }),
  ] },
  { ref: 'ACHT-2026-0001', journal: 'ACHT', date: '2026-01-10', libelle: 'Facture FA-7781 — Grossiste CDCI', statut: 'validee', lines: [
    line('601', 800000, 0, { libelle: 'Achat marchandises' }),
    line('4452', 144000, 0, { libelle: 'TVA récupérable 18%' }),
    line('4011', 0, 944000, { tiers: 'F001', libelle: 'Grossiste CDCI', echeance: '2026-02-09', lettrage: 'B' }),
  ] },
  { ref: 'BANQ-2026-0001', journal: 'BANQ', date: '2026-01-22', libelle: 'Règlement client Pharmacie (vir.)', statut: 'validee', lines: [
    line('521', 1180000, 0, { libelle: 'Virement reçu' }),
    line('4111', 0, 1180000, { tiers: 'C001', libelle: 'Pharmacie du Plateau', lettrage: 'A' }),
  ] },
  { ref: 'BANQ-2026-0002', journal: 'BANQ', date: '2026-01-25', libelle: 'Règlement fournisseur CDCI (vir.)', statut: 'validee', lines: [
    line('4011', 944000, 0, { tiers: 'F001', libelle: 'Grossiste CDCI', lettrage: 'B' }),
    line('521', 0, 944000, { libelle: 'Virement émis' }),
  ] },
  { ref: 'ACHT-2026-0002', journal: 'ACHT', date: '2026-02-03', libelle: 'Facture électricité CIE — janvier', statut: 'validee', lines: [
    line('6052', 85000, 0, { libelle: 'Électricité magasin' }),
    line('4452', 15300, 0, { libelle: 'TVA récupérable' }),
    line('4011', 0, 100300, { tiers: 'F003', libelle: 'CIE', echeance: '2026-02-20' }),
  ] },
  { ref: 'CAI-2026-0001', journal: 'CAI', date: '2026-02-05', libelle: 'Recette caisse — ventes comptant', statut: 'validee', lines: [
    line('571', 354000, 0, { libelle: 'Espèces encaissées' }),
    line('701', 0, 300000, { libelle: 'Ventes comptant' }),
    line('4431', 0, 54000, { libelle: 'TVA collectée 18%' }),
  ] },
  { ref: 'OD-2026-0001', journal: 'OD', date: '2026-02-28', libelle: 'Paie du personnel — février', statut: 'validee', lines: [
    line('661', 1200000, 0, { libelle: 'Salaires bruts' }),
    line('664', 240000, 0, { libelle: 'Charges sociales CNPS' }),
    line('421', 0, 1200000, { libelle: 'Net à payer personnel' }),
    line('447', 0, 240000, { libelle: 'Cotisations dues' }),
  ] },
  { ref: 'VTE-2026-0003', journal: 'VTE', date: '2026-03-08', libelle: 'Facture FV-1051 — Hôtel Ivoire Services', statut: 'validee', lines: [
    line('4111', 826000, 0, { tiers: 'C003', libelle: 'Hôtel Ivoire Services', echeance: '2026-04-07' }),
    line('701', 0, 700000, { libelle: 'Ventes marchandises' }),
    line('4431', 0, 126000, { libelle: 'TVA collectée 18%' }),
  ] },
  { ref: 'ACHT-2026-0003', journal: 'ACHT', date: '2026-03-12', libelle: 'Facture FA-2210 — Nestlé CI', statut: 'validee', lines: [
    line('601', 1500000, 0, { libelle: 'Achat marchandises' }),
    line('4452', 270000, 0, { libelle: 'TVA récupérable 18%' }),
    line('4011', 0, 1770000, { tiers: 'F002', libelle: 'Nestlé CI', echeance: '2026-04-11' }),
  ] },
  { ref: 'CAI-2026-0002', journal: 'CAI', date: '2026-04-12', libelle: 'Recette caisse — ventes comptant', statut: 'validee', lines: [
    line('571', 1770000, 0, { libelle: 'Espèces encaissées' }),
    line('701', 0, 1500000, { libelle: 'Ventes comptant' }),
    line('4431', 0, 270000, { libelle: 'TVA collectée 18%' }),
  ] },
  { ref: 'VTE-2026-0004', journal: 'VTE', date: '2026-06-09', libelle: 'Facture FV-1062 — Boutique Adjamé', statut: 'brouillon', lines: [
    line('4111', 472000, 0, { tiers: 'C004', libelle: 'Boutique Adjamé Centre', echeance: '2026-07-09' }),
    line('701', 0, 400000, { libelle: 'Ventes marchandises' }),
    line('4431', 0, 72000, { libelle: 'TVA collectée 18%' }),
  ] },
  { ref: '', journal: 'OD', date: '2026-03-12', libelle: 'Loyer magasin — mars (à saisir)', statut: 'brouillon', lines: [
    line('622', 350000, 0, { libelle: 'Loyer mensuel' }),
    line('521', 0, 350000, { libelle: 'à régler' }),
  ] },
  { ref: 'ACHT-2026-0004', journal: 'ACHT', date: '2026-06-05', libelle: 'Facture FA-3380 — Brasserie SOLIBRA', statut: 'brouillon', lines: [
    line('601', 900000, 0, { libelle: 'Achat boissons' }),
    line('4452', 162000, 0, { libelle: 'TVA récupérable 18%' }),
    line('4011', 0, 1052000, { tiers: 'F004', libelle: 'SOLIBRA', echeance: '2026-07-05' }),
  ] },
  { ref: 'VTE-2026-0005', journal: 'VTE', date: '2026-06-07', libelle: 'Facture FV-1063 — vente au comptoir', statut: 'brouillon', lines: [
    line('4111', 708000, 0, { libelle: 'Client divers (à affecter)' }),
    line('701', 0, 600000, { libelle: 'Ventes marchandises' }),
    line('4431', 0, 108000, { libelle: 'TVA collectée 18%' }),
  ] },
  { ref: 'OD-2026-0002', journal: 'OD', date: '2026-06-02', libelle: 'Campagne publicitaire — régularisation', statut: 'brouillon', lines: [
    line('627', 500000, 0, { libelle: 'Publicité & marketing' }),
    line('4452', 80000, 0, { libelle: 'TVA récupérable' }),
    line('4011', 0, 580000, { tiers: 'F002', libelle: 'Nestlé CI' }),
  ] },
];

const ena: RawEcriture[] = [
  { ref: 'AN-2026-0001', journal: 'AN', date: '2026-01-01', libelle: 'À-nouveaux — reports exercice 2025', statut: 'validee', lines: [
    line('521', 2600000, 0, { libelle: 'Solde banque au 31/12' }),
    line('571', 400000, 0, { libelle: 'Solde caisse au 31/12' }),
    line('311', 1500000, 0, { libelle: 'Stock marchandises' }),
    line('101', 0, 4000000, { libelle: 'Capital social' }),
    line('106', 0, 500000, { libelle: 'Réserves' }),
  ] },
  { ref: 'VTE-2026-0001', journal: 'VTE', date: '2026-01-12', libelle: 'Facture FV-2001 — Hôtel Ivoire Services', statut: 'validee', lines: [
    line('4111', 944000, 0, { tiers: 'C003', libelle: 'Hôtel Ivoire Services', echeance: '2026-02-11' }),
    line('701', 0, 800000, { libelle: 'Ventes marchandises' }),
    line('4431', 0, 144000, { libelle: 'TVA collectée 18%' }),
  ] },
  { ref: 'CAI-2026-0001', journal: 'CAI', date: '2026-02-10', libelle: 'Recette caisse — ventes comptant', statut: 'validee', lines: [
    line('571', 1062000, 0, { libelle: 'Espèces encaissées' }),
    line('701', 0, 900000, { libelle: 'Ventes comptant' }),
    line('4431', 0, 162000, { libelle: 'TVA collectée 18%' }),
  ] },
  { ref: 'ACHT-2026-0001', journal: 'ACHT', date: '2026-02-15', libelle: 'Facture FA-5500 — Nestlé CI', statut: 'validee', lines: [
    line('601', 700000, 0, { libelle: 'Achat marchandises' }),
    line('4452', 126000, 0, { libelle: 'TVA récupérable 18%' }),
    line('4011', 0, 826000, { tiers: 'F002', libelle: 'Nestlé CI', echeance: '2026-03-17' }),
  ] },
  { ref: 'OD-2026-0001', journal: 'OD', date: '2026-02-28', libelle: 'Paie du personnel — février', statut: 'validee', lines: [
    line('661', 600000, 0, { libelle: 'Salaires bruts' }),
    line('664', 120000, 0, { libelle: 'Charges sociales CNPS' }),
    line('421', 0, 600000, { libelle: 'Net à payer personnel' }),
    line('447', 0, 120000, { libelle: 'Cotisations dues' }),
  ] },
  { ref: 'BANQ-2026-0001', journal: 'BANQ', date: '2026-03-05', libelle: 'Frais de tenue de compte', statut: 'validee', lines: [
    line('631', 8000, 0, { libelle: 'Commissions bancaires' }),
    line('521', 0, 8000, { libelle: 'Prélèvement banque' }),
  ] },
];

export const entries: Ecriture[] = [
  ...marcory.map((e, i) => ({ ...e, id: i + 1, magasin: 1 })),
  ...ena.map((e, i) => ({ ...e, id: marcory.length + i + 1, magasin: 2 })),
];

/** Écritures rattachées à un magasin. */
export function entriesOfMagasin(magasinId: number): Ecriture[] {
  return entries.filter((e) => e.magasin === magasinId);
}

/** Nombre de brouillons d'un magasin (badge sidebar). */
export function brouillonsCount(magasinId: number): number {
  return entries.filter((e) => e.magasin === magasinId && e.statut === 'brouillon').length;
}

const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

/** Formatte un montant entier avec séparateurs de milliers (espace fine). */
export function fmtMontant(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—';
  const neg = n < 0;
  const abs = Math.abs(Math.round(n));
  const s = abs.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return (neg ? '-' : '') + s;
}

export function fmtCur(n: number | null | undefined): string {
  return `${fmtMontant(n)} FCFA`;
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

export function fmtDateLong(iso: string | null | undefined): string {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${parseInt(d, 10)} ${MONTHS[parseInt(m, 10) - 1]} ${y}`;
}

export function entryTotals(e: Ecriture): { debit: number; credit: number; balanced: boolean } {
  let debit = 0;
  let credit = 0;
  for (const l of e.lines) {
    debit += l.debit || 0;
    credit += l.credit || 0;
  }
  return { debit, credit, balanced: Math.abs(debit - credit) < 0.005 && debit > 0 };
}
