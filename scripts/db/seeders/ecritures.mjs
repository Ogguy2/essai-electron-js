/**
 * Seeder Écritures — écritures comptables de démonstration (en-têtes + lignes),
 * portées de src/lib/mock-data.ts. Idempotent : seede seulement si le magasin
 * n'a aucune écriture et qu'un exercice existe.
 *
 * Seules les écritures `validee` alimentent balance/soldes ; les `brouillon`
 * restent hors mouvements (utile pour démontrer le plan comptable).
 */
import { sqlStr, toAsciiUpper, sqlStrOrNull, insertGetId } from '../lib.mjs';

/** Fabrique une ligne d'écriture de démo. */
const L = (compte, debit, credit, opts = {}) => ({
  compte, debit, credit,
  tiers: opts.tiers ?? null, libelle: opts.libelle ?? '',
  echeance: opts.echeance ?? null, lettrage: opts.lettrage ?? null,
});

/** Écritures de démonstration par magasin (index 0 = Marcory, 1 = Ena). */
export const DEMO_ECRITURES = [
  // --- Magasin 0 : Marcory ---
  [
    { ref: 'AN-2026-0001', journal: 'AN', date: '2026-01-01', libelle: 'À-nouveaux — reports exercice 2025', statut: 'validee', lines: [
      L('521', 5000000, 0, { libelle: 'Solde banque au 31/12' }),
      L('571', 800000, 0, { libelle: 'Solde caisse au 31/12' }),
      L('311', 3200000, 0, { libelle: 'Stock marchandises' }),
      L('2411', 4000000, 0, { libelle: 'Matériel & agencement' }),
      L('101', 0, 10000000, { libelle: 'Capital social' }),
      L('106', 0, 2000000, { libelle: 'Réserves' }),
      L('162', 0, 1000000, { libelle: 'Emprunt bancaire' }),
    ] },
    { ref: 'VTE-2026-0001', journal: 'VTE', date: '2026-01-08', libelle: 'Facture FV-1042 — Pharmacie du Plateau', statut: 'validee', lines: [
      L('4111', 1180000, 0, { tiers: 'C001', libelle: 'Pharmacie du Plateau', echeance: '2026-02-07', lettrage: 'A' }),
      L('701', 0, 1000000, { libelle: 'Ventes marchandises' }),
      L('4431', 0, 180000, { libelle: 'TVA collectée 18%' }),
    ] },
    { ref: 'VTE-2026-0002', journal: 'VTE', date: '2026-01-15', libelle: 'Facture FV-1043 — Restaurant Le Baobab', statut: 'validee', lines: [
      L('4111', 590000, 0, { tiers: 'C002', libelle: 'Restaurant Le Baobab', echeance: '2026-02-14' }),
      L('701', 0, 500000, { libelle: 'Ventes marchandises' }),
      L('4431', 0, 90000, { libelle: 'TVA collectée 18%' }),
    ] },
    { ref: 'ACHT-2026-0001', journal: 'ACHT', date: '2026-01-10', libelle: 'Facture FA-7781 — Grossiste CDCI', statut: 'validee', lines: [
      L('601', 800000, 0, { libelle: 'Achat marchandises' }),
      L('4452', 144000, 0, { libelle: 'TVA récupérable 18%' }),
      L('4011', 0, 944000, { tiers: 'F001', libelle: 'Grossiste CDCI', echeance: '2026-02-09', lettrage: 'B' }),
    ] },
    { ref: 'BANQ-2026-0001', journal: 'BANQ', date: '2026-01-22', libelle: 'Règlement client Pharmacie (vir.)', statut: 'validee', lines: [
      L('521', 1180000, 0, { libelle: 'Virement reçu' }),
      L('4111', 0, 1180000, { tiers: 'C001', libelle: 'Pharmacie du Plateau', lettrage: 'A' }),
    ] },
    { ref: 'BANQ-2026-0002', journal: 'BANQ', date: '2026-01-25', libelle: 'Règlement fournisseur CDCI (vir.)', statut: 'validee', lines: [
      L('4011', 944000, 0, { tiers: 'F001', libelle: 'Grossiste CDCI', lettrage: 'B' }),
      L('521', 0, 944000, { libelle: 'Virement émis' }),
    ] },
    { ref: 'ACHT-2026-0002', journal: 'ACHT', date: '2026-02-03', libelle: 'Facture électricité CIE — janvier', statut: 'validee', lines: [
      L('6052', 85000, 0, { libelle: 'Électricité magasin' }),
      L('4452', 15300, 0, { libelle: 'TVA récupérable' }),
      L('4011', 0, 100300, { tiers: 'F003', libelle: 'CIE', echeance: '2026-02-20' }),
    ] },
    { ref: 'CAI-2026-0001', journal: 'CAI', date: '2026-02-05', libelle: 'Recette caisse — ventes comptant', statut: 'validee', lines: [
      L('571', 354000, 0, { libelle: 'Espèces encaissées' }),
      L('701', 0, 300000, { libelle: 'Ventes comptant' }),
      L('4431', 0, 54000, { libelle: 'TVA collectée 18%' }),
    ] },
    { ref: 'OD-2026-0001', journal: 'OD', date: '2026-02-28', libelle: 'Paie du personnel — février', statut: 'validee', lines: [
      L('661', 1200000, 0, { libelle: 'Salaires bruts' }),
      L('664', 240000, 0, { libelle: 'Charges sociales CNPS' }),
      L('421', 0, 1200000, { libelle: 'Net à payer personnel' }),
      L('447', 0, 240000, { libelle: 'Cotisations dues' }),
    ] },
    { ref: 'VTE-2026-0003', journal: 'VTE', date: '2026-03-08', libelle: 'Facture FV-1051 — Hôtel Ivoire Services', statut: 'validee', lines: [
      L('4111', 826000, 0, { tiers: 'C003', libelle: 'Hôtel Ivoire Services', echeance: '2026-04-07' }),
      L('701', 0, 700000, { libelle: 'Ventes marchandises' }),
      L('4431', 0, 126000, { libelle: 'TVA collectée 18%' }),
    ] },
    { ref: 'ACHT-2026-0003', journal: 'ACHT', date: '2026-03-12', libelle: 'Facture FA-2210 — Nestlé CI', statut: 'validee', lines: [
      L('601', 1500000, 0, { libelle: 'Achat marchandises' }),
      L('4452', 270000, 0, { libelle: 'TVA récupérable 18%' }),
      L('4011', 0, 1770000, { tiers: 'F002', libelle: 'Nestlé CI', echeance: '2026-04-11' }),
    ] },
    { ref: 'CAI-2026-0002', journal: 'CAI', date: '2026-04-12', libelle: 'Recette caisse — ventes comptant', statut: 'validee', lines: [
      L('571', 1770000, 0, { libelle: 'Espèces encaissées' }),
      L('701', 0, 1500000, { libelle: 'Ventes comptant' }),
      L('4431', 0, 270000, { libelle: 'TVA collectée 18%' }),
    ] },
    { ref: 'VTE-2026-0004', journal: 'VTE', date: '2026-06-09', libelle: 'Facture FV-1062 — Boutique Adjamé', statut: 'brouillon', lines: [
      L('4111', 472000, 0, { tiers: 'C004', libelle: 'Boutique Adjamé Centre', echeance: '2026-07-09' }),
      L('701', 0, 400000, { libelle: 'Ventes marchandises' }),
      L('4431', 0, 72000, { libelle: 'TVA collectée 18%' }),
    ] },
    { ref: '', journal: 'OD', date: '2026-03-12', libelle: 'Loyer magasin — mars (à saisir)', statut: 'brouillon', lines: [
      L('622', 350000, 0, { libelle: 'Loyer mensuel' }),
      L('521', 0, 350000, { libelle: 'à régler' }),
    ] },
    { ref: 'ACHT-2026-0004', journal: 'ACHT', date: '2026-06-05', libelle: 'Facture FA-3380 — Brasserie SOLIBRA', statut: 'brouillon', lines: [
      L('601', 900000, 0, { libelle: 'Achat boissons' }),
      L('4452', 162000, 0, { libelle: 'TVA récupérable 18%' }),
      L('4011', 0, 1052000, { tiers: 'F004', libelle: 'SOLIBRA', echeance: '2026-07-05' }),
    ] },
    { ref: 'VTE-2026-0005', journal: 'VTE', date: '2026-06-07', libelle: 'Facture FV-1063 — vente au comptoir', statut: 'brouillon', lines: [
      L('4111', 708000, 0, { libelle: 'Client divers (à affecter)' }),
      L('701', 0, 600000, { libelle: 'Ventes marchandises' }),
      L('4431', 0, 108000, { libelle: 'TVA collectée 18%' }),
    ] },
    { ref: 'OD-2026-0002', journal: 'OD', date: '2026-06-02', libelle: 'Campagne publicitaire — régularisation', statut: 'brouillon', lines: [
      L('627', 500000, 0, { libelle: 'Publicité & marketing' }),
      L('4452', 80000, 0, { libelle: 'TVA récupérable' }),
      L('4011', 0, 580000, { tiers: 'F002', libelle: 'Nestlé CI' }),
    ] },
  ],
  // --- Magasin 1 : Ena ---
  [
    { ref: 'AN-2026-0001', journal: 'AN', date: '2026-01-01', libelle: 'À-nouveaux — reports exercice 2025', statut: 'validee', lines: [
      L('521', 2600000, 0, { libelle: 'Solde banque au 31/12' }),
      L('571', 400000, 0, { libelle: 'Solde caisse au 31/12' }),
      L('311', 1500000, 0, { libelle: 'Stock marchandises' }),
      L('101', 0, 4000000, { libelle: 'Capital social' }),
      L('106', 0, 500000, { libelle: 'Réserves' }),
    ] },
    { ref: 'VTE-2026-0001', journal: 'VTE', date: '2026-01-12', libelle: 'Facture FV-2001 — Hôtel Ivoire Services', statut: 'validee', lines: [
      L('4111', 944000, 0, { tiers: 'C003', libelle: 'Hôtel Ivoire Services', echeance: '2026-02-11' }),
      L('701', 0, 800000, { libelle: 'Ventes marchandises' }),
      L('4431', 0, 144000, { libelle: 'TVA collectée 18%' }),
    ] },
    { ref: 'CAI-2026-0001', journal: 'CAI', date: '2026-02-10', libelle: 'Recette caisse — ventes comptant', statut: 'validee', lines: [
      L('571', 1062000, 0, { libelle: 'Espèces encaissées' }),
      L('701', 0, 900000, { libelle: 'Ventes comptant' }),
      L('4431', 0, 162000, { libelle: 'TVA collectée 18%' }),
    ] },
    { ref: 'ACHT-2026-0001', journal: 'ACHT', date: '2026-02-15', libelle: 'Facture FA-5500 — Nestlé CI', statut: 'validee', lines: [
      L('601', 700000, 0, { libelle: 'Achat marchandises' }),
      L('4452', 126000, 0, { libelle: 'TVA récupérable 18%' }),
      L('4011', 0, 826000, { tiers: 'F002', libelle: 'Nestlé CI', echeance: '2026-03-17' }),
    ] },
    { ref: 'OD-2026-0001', journal: 'OD', date: '2026-02-28', libelle: 'Paie du personnel — février', statut: 'validee', lines: [
      L('661', 600000, 0, { libelle: 'Salaires bruts' }),
      L('664', 120000, 0, { libelle: 'Charges sociales CNPS' }),
      L('421', 0, 600000, { libelle: 'Net à payer personnel' }),
      L('447', 0, 120000, { libelle: 'Cotisations dues' }),
    ] },
    { ref: 'BANQ-2026-0001', journal: 'BANQ', date: '2026-03-05', libelle: 'Frais de tenue de compte', statut: 'validee', lines: [
      L('631', 8000, 0, { libelle: 'Commissions bancaires' }),
      L('521', 0, 8000, { libelle: 'Prélèvement banque' }),
    ] },
  ],
];

/**
 * Seede les écritures de démo d'un magasin si aucune n'existe et qu'un exercice
 * est disponible. Renvoie le nb d'écritures insérées.
 */
export async function seedEcritures(conn, magasinId, exerciceId, demoIndex) {
  if (!exerciceId) return 0;
  const rows = await conn.query(`SELECT COUNT(*) AS n FROM ecritures WHERE magasin_id = ${Number(magasinId)}`);
  if (Number(rows?.[0]?.n ?? 0) > 0) return 0;

  const list = DEMO_ECRITURES[demoIndex] ?? [];
  for (const e of list) {
    const validee = e.statut === 'validee';
    const ecrId = await insertGetId(
      conn,
      `INSERT INTO ecritures (magasin_id, exercice_id, journal, ref, date_ecriture, libelle, statut, validee_at, cree_par) VALUES (` +
        `${Number(magasinId)}, ${Number(exerciceId)}, ${sqlStr(e.journal)}, ${sqlStrOrNull(e.ref)}, ${sqlStr(e.date)}, ` +
        `${sqlStr(toAsciiUpper(e.libelle))}, ${sqlStr(e.statut)}, ${validee ? sqlStr(`${e.date} 09:00:00`) : 'NULL'}, ${sqlStr('admin')})`,
      'ecritures',
    );
    for (const l of e.lines) {
      await conn.query(
        `INSERT INTO ecriture_lignes (ecriture_id, compte, tiers, libelle, debit, credit, echeance, lettrage) VALUES (` +
          `${ecrId}, ${sqlStr(l.compte)}, ${sqlStrOrNull(l.tiers)}, ${sqlStr(toAsciiUpper(l.libelle))}, ` +
          `${Number(l.debit) || 0}, ${Number(l.credit) || 0}, ${sqlStrOrNull(l.echeance)}, ${sqlStrOrNull(l.lettrage)})`,
      );
    }
  }
  return list.length;
}
