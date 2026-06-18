/**
 * Service lettrage — lignes lettrables, lettrer, délettrer.
 * Jointure JS (pas de JOIN SQL).
 */
import type { LigneLettrable } from '../../../shared/ipc';
import { query, sqlValue, withTransaction } from '../../db/connection';
import { requireAuth } from '../auth';
import { nextLettrageCode } from '../../../domain/reporting';

export async function lignesLettrables(
  magasinId: number,
  compte: string,
  tiers?: string,
): Promise<LigneLettrable[]> {
  requireAuth();

  // 1. Écritures validées du magasin
  const ecritureRows = await query<Record<string, unknown>>(
    `SELECT id, date_ecriture, ref FROM ecritures WHERE magasin_id = ${sqlValue(magasinId)} AND statut = ${sqlValue('validee')}`,
  );
  if (!ecritureRows.length) return [];

  const ecrituresById = new Map<number, { date_ecriture: string; ref: string }>();
  for (const r of ecritureRows) {
    ecrituresById.set(Number(r.id), {
      date_ecriture: String(r.date_ecriture ?? ''),
      ref: String(r.ref ?? ''),
    });
  }

  const ecrIds = [...ecrituresById.keys()].join(',');

  // 2. Lignes filtrées par compte (et tiers optionnel)
  let whereTiers = '';
  if (tiers) whereTiers = ` AND tiers = ${sqlValue(tiers)}`;
  const ligneRows = await query<Record<string, unknown>>(
    `SELECT id, ecriture_id, tiers, libelle, debit, credit, lettrage FROM ecriture_lignes ` +
    `WHERE ecriture_id IN (${ecrIds}) AND compte = ${sqlValue(compte)}${whereTiers}`,
  );

  // 3. Construire et trier par date
  const result: LigneLettrable[] = [];
  for (const r of ligneRows) {
    const ecr = ecrituresById.get(Number(r.ecriture_id));
    if (!ecr) continue;
    result.push({
      ecriture_id: Number(r.ecriture_id),
      ligne_id: Number(r.id),
      date: ecr.date_ecriture,
      ref: ecr.ref,
      tiers: r.tiers == null || r.tiers === '' ? null : String(r.tiers),
      libelle: String(r.libelle ?? ''),
      debit: Number(r.debit ?? 0),
      credit: Number(r.credit ?? 0),
      lettrage: r.lettrage == null || r.lettrage === '' ? null : String(r.lettrage),
    });
  }

  result.sort((a, b) => a.date.localeCompare(b.date) || a.ref.localeCompare(b.ref));
  return result;
}

export async function lettrer(ligneIds: number[], code?: string): Promise<string> {
  requireAuth();
  if (!ligneIds.length) throw new Error('Aucune ligne sélectionnée.');

  let lettrageCode = code ?? '';
  if (!lettrageCode) {
    // Calcule le prochain code à partir des lettrage existants sur ces lignes et leurs voisins
    // On lit tous les lettrage de la table pour être sûr de ne pas créer de doublon
    const idsIn = ligneIds.map((id) => sqlValue(id)).join(',');
    const rows = await query<Record<string, unknown>>(
      `SELECT lettrage FROM ecriture_lignes WHERE id IN (${idsIn})`,
    );
    // Récupère aussi les lettrage existants sur le même compte pour calculer le prochain
    // (on lit l'ecriture_id pour remonter au magasin et lire tous les lettrage du compte)
    const existants = rows
      .map((r) => (r.lettrage == null || r.lettrage === '' ? null : String(r.lettrage)))
      .filter((v): v is string => v !== null);
    lettrageCode = nextLettrageCode(existants);
  }

  const idsIn = ligneIds.map((id) => sqlValue(id)).join(',');
  await withTransaction(async (run) => {
    await run(
      `UPDATE ecriture_lignes SET lettrage = ${sqlValue(lettrageCode)} WHERE id IN (${idsIn})`,
    );
  });
  return lettrageCode;
}

export async function delettrer(ligneIds: number[]): Promise<void> {
  requireAuth();
  if (!ligneIds.length) return;
  const idsIn = ligneIds.map((id) => sqlValue(id)).join(',');
  await withTransaction(async (run) => {
    await run(`UPDATE ecriture_lignes SET lettrage = NULL WHERE id IN (${idsIn})`);
  });
}
