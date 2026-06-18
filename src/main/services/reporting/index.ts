/**
 * Service reporting — balance, grand livre, compte de résultat, échéancier, consolidation.
 * Pas de JOIN SQL (incertain sous HFSQL) : jointure en JS.
 */
import type { Mouvement, LigneBalance, MouvementGL, Resultat, LigneEcheance, CaMensuel } from '../../../shared/ipc';
import { query, sqlValue } from '../../db/connection';
import { requireAuth } from '../auth';
import {
  balance as domainBalance,
  grandLivre as domainGrandLivre,
  resultat as domainResultat,
} from '../../../domain/reporting';

// --- Helpers internes ---

interface EcritureRow { id: number; date_ecriture: string; journal: string; ref: string; }
interface LigneRow {
  id: number; ecriture_id: number; compte: string; tiers: string | null;
  libelle: string; debit: number; credit: number; echeance: string | null; lettrage: string | null;
}
// CompteRow inlined into compteMap construction below

async function mouvements(
  magasinIds: number[],
  opts?: { dateDebut?: string; dateFin?: string },
): Promise<Mouvement[]> {
  if (!magasinIds.length) return [];

  const idsIn = magasinIds.map((id) => sqlValue(id)).join(',');

  // 1. Écritures validées
  const ecritureRows = await query<Record<string, unknown>>(
    `SELECT id, date_ecriture, journal, ref FROM ecritures WHERE magasin_id IN (${idsIn}) AND statut = ${sqlValue('validee')}`,
  );
  if (!ecritureRows.length) return [];

  const ecrituresById = new Map<number, EcritureRow>();
  for (const r of ecritureRows) {
    const id = Number(r.id);
    const dateStr = String(r.date_ecriture ?? '');
    if (opts?.dateDebut && dateStr < opts.dateDebut) continue;
    if (opts?.dateFin && dateStr > opts.dateFin) continue;
    ecrituresById.set(id, {
      id,
      date_ecriture: dateStr,
      journal: String(r.journal ?? ''),
      ref: String(r.ref ?? ''),
    });
  }
  if (!ecrituresById.size) return [];

  // 2. Lignes des écritures filtrées
  const ecrIds = [...ecrituresById.keys()].join(',');
  const ligneRows = await query<Record<string, unknown>>(
    `SELECT id, ecriture_id, compte, tiers, libelle, debit, credit, echeance, lettrage FROM ecriture_lignes WHERE ecriture_id IN (${ecrIds})`,
  );

  // 3. Plan comptable (map numero → {classe, libelle})
  const compteRows = await query<Record<string, unknown>>(
    `SELECT numero, classe, libelle FROM comptes WHERE magasin_id IN (${idsIn})`,
  );
  const compteMap = new Map<string, { classe: number; libelle: string }>();
  for (const c of compteRows) {
    const num = String(c.numero ?? '');
    if (!compteMap.has(num)) {
      compteMap.set(num, { classe: Number(c.classe ?? 0), libelle: String(c.libelle ?? '') });
    }
  }

  // 4. Construire les mouvements
  const result: Mouvement[] = [];
  for (const r of ligneRows as unknown as LigneRow[]) {
    const ecr = ecrituresById.get(Number(r.ecriture_id));
    if (!ecr) continue;
    const compte = String(r.compte ?? '');
    const info = compteMap.get(compte) ?? { classe: Number(compte[0] ?? '0'), libelle: compte };
    result.push({
      compte,
      classe: info.classe,
      compte_libelle: info.libelle,
      tiers: r.tiers == null || r.tiers === '' ? null : String(r.tiers),
      date: ecr.date_ecriture,
      journal: ecr.journal,
      ref: ecr.ref,
      ligne_libelle: String(r.libelle ?? ''),
      debit: Number(r.debit ?? 0),
      credit: Number(r.credit ?? 0),
      echeance: r.echeance == null || r.echeance === '' ? null : String(r.echeance),
      lettrage: r.lettrage == null || r.lettrage === '' ? null : String(r.lettrage),
    });
  }
  return result;
}

// --- Fonctions exposées ---

export async function getBalance(magasinId: number): Promise<LigneBalance[]> {
  requireAuth();
  const mvts = await mouvements([magasinId]);
  return domainBalance(mvts);
}

export async function getGrandLivre(
  magasinId: number,
  filtre: { compte?: string; tiers?: string },
): Promise<MouvementGL[]> {
  requireAuth();
  const mvts = await mouvements([magasinId]);
  return domainGrandLivre(mvts, filtre);
}

export async function getResultat(magasinId: number): Promise<Resultat> {
  requireAuth();
  const mvts = await mouvements([magasinId]);
  return domainResultat(mvts);
}

export async function getEcheancier(
  magasinId: number,
  today: Date = new Date(),
): Promise<LigneEcheance[]> {
  requireAuth();
  const todayStr = today.toISOString().slice(0, 10);

  const result: LigneEcheance[] = [];
  // Lit directement les lignes (besoin de ligne_id + echeance + lettrage)
  const ecritureRows = await query<Record<string, unknown>>(
    `SELECT id, date_ecriture, journal, ref FROM ecritures WHERE magasin_id = ${sqlValue(magasinId)} AND statut = ${sqlValue('validee')}`,
  );
  if (!ecritureRows.length) return [];
  const ecrituresById = new Map<number, { date_ecriture: string; journal: string; ref: string }>();
  for (const r of ecritureRows) {
    ecrituresById.set(Number(r.id), {
      date_ecriture: String(r.date_ecriture ?? ''),
      journal: String(r.journal ?? ''),
      ref: String(r.ref ?? ''),
    });
  }
  const ecrIds = [...ecrituresById.keys()].join(',');
  const ligneRows = await query<Record<string, unknown>>(
    `SELECT id, ecriture_id, compte, tiers, libelle, debit, credit, echeance, lettrage FROM ecriture_lignes WHERE ecriture_id IN (${ecrIds})`,
  );

  for (const r of ligneRows) {
    const lettrage = r.lettrage == null || r.lettrage === '' ? null : String(r.lettrage);
    const echeance = r.echeance == null || r.echeance === '' ? null : String(r.echeance);
    if (lettrage !== null || echeance === null) continue;

    const ecr = ecrituresById.get(Number(r.ecriture_id));
    if (!ecr) continue;

    const credit = Number(r.credit ?? 0);
    const debit = Number(r.debit ?? 0);
    const montant = credit > 0 ? credit : debit;

    const diff = Math.floor((new Date(echeance).getTime() - new Date(todayStr).getTime()) / 86400000);
    type Anteriorite = LigneEcheance['anteriorite'];
    let anteriorite: Anteriorite;
    if (diff >= 0) anteriorite = 'non_echu';
    else if (diff >= -30) anteriorite = '0_30';
    else if (diff >= -60) anteriorite = '31_60';
    else if (diff >= -90) anteriorite = '61_90';
    else anteriorite = 'plus_90';

    result.push({
      ecriture_id: Number(r.ecriture_id),
      ligne_id: Number(r.id),
      date: ecr.date_ecriture,
      journal: ecr.journal,
      ref: ecr.ref,
      tiers: r.tiers == null || r.tiers === '' ? null : String(r.tiers),
      libelle: String(r.libelle ?? ''),
      montant,
      echeance,
      anteriorite,
    });
  }
  return result;
}

export async function getCaParMois(magasinId: number): Promise<CaMensuel[]> {
  requireAuth();
  const year = new Date().getFullYear();
  const mvts = await mouvements([magasinId]);
  // Filtre classe 7 (produits) uniquement
  const classe7 = mvts.filter((m) => m.classe === 7);
  // Regroupe par mois 'AAAA-MM'
  const map = new Map<string, number>();
  for (const m of classe7) {
    const mois = m.date.slice(0, 7);
    if (!mois.startsWith(String(year))) continue;
    map.set(mois, (map.get(mois) ?? 0) + (m.credit - m.debit));
  }
  // Produit 12 mois de l'annee courante, 0 si vide
  const result: CaMensuel[] = [];
  for (let i = 1; i <= 12; i++) {
    const mois = `${year}-${String(i).padStart(2, '0')}`;
    result.push({ mois, montant: map.get(mois) ?? 0 });
  }
  return result;
}

// --- Consolidation ---

export async function getConsolidationBalance(
  societeId: number,
  dateDebut: string,
  dateFin: string,
): Promise<LigneBalance[]> {
  requireAuth();
  const magRows = await query<Record<string, unknown>>(
    `SELECT id FROM magasins WHERE societe_id = ${sqlValue(societeId)}`,
  );
  const magasinIds = magRows.map((r) => Number(r.id));
  if (!magasinIds.length) return [];
  const mvts = await mouvements(magasinIds, { dateDebut, dateFin });
  return domainBalance(mvts);
}

export async function getConsolidationResultat(
  societeId: number,
  dateDebut: string,
  dateFin: string,
): Promise<Resultat> {
  requireAuth();
  const magRows = await query<Record<string, unknown>>(
    `SELECT id FROM magasins WHERE societe_id = ${sqlValue(societeId)}`,
  );
  const magasinIds = magRows.map((r) => Number(r.id));
  if (!magasinIds.length) return { charges: 0, produits: 0, resultat: 0, charges_detail: [], produits_detail: [] };
  const mvts = await mouvements(magasinIds, { dateDebut, dateFin });
  return domainResultat(mvts);
}
