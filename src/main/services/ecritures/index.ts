import type {
  Ecriture, EcritureLigne, EcritureListItem, EcritureAvecLignes, EcritureInput, StatutEcriture,
} from '../../../shared/ipc';
import { query, execute, sqlValue, withTransaction } from '../../db/connection';
import { requireAuth, requireAdmin, currentSession } from '../auth';
import { ecritureInputSchema, firstZodError } from '../../../shared/schemas';
import { toAsciiUpper } from '../../../domain/text';
import { estAncreCollectif } from '../../../domain/compte';
import {
  estEquilibree, ligneValide, numeroRef, inverseLignes, dateDansPeriode, totalDebit, totalCredit,
} from '../../../domain/ecriture';
import { AppError } from '../common/errors';

function parseEcriture(input: EcritureInput): EcritureInput {
  const parsed = ecritureInputSchema.safeParse(input);
  if (!parsed.success) throw new AppError('VALIDATION', firstZodError(parsed.error));
  const e = parsed.data;
  return {
    exercice_id: e.exercice_id,
    journal: toAsciiUpper(e.journal),
    date_ecriture: e.date_ecriture,
    libelle: toAsciiUpper(e.libelle),
    lignes: e.lignes.map((l) => ({
      compte: toAsciiUpper(l.compte),
      tiers: l.tiers ? toAsciiUpper(l.tiers) : null,
      libelle: toAsciiUpper(l.libelle),
      debit: l.debit,
      credit: l.credit,
      echeance: l.echeance || null,
      lettrage: l.lettrage ? toAsciiUpper(l.lettrage) : null,
    })),
  };
}

function mapEcriture(r: Record<string, unknown>): Ecriture {
  return {
    id: Number(r.id), magasin_id: Number(r.magasin_id), exercice_id: Number(r.exercice_id),
    journal: String(r.journal ?? ''), ref: String(r.ref ?? ''),
    date_ecriture: String(r.date_ecriture ?? ''), libelle: String(r.libelle ?? ''),
    statut: String(r.statut ?? 'brouillon') as StatutEcriture,
    reversal_of_id: r.reversal_of_id == null ? null : Number(r.reversal_of_id),
    validee_at: r.validee_at == null ? null : String(r.validee_at),
    cree_par: String(r.cree_par ?? ''),
  };
}

function mapLigne(r: Record<string, unknown>): EcritureLigne {
  return {
    id: Number(r.id), ecriture_id: Number(r.ecriture_id), compte: String(r.compte ?? ''),
    tiers: r.tiers == null || r.tiers === '' ? null : String(r.tiers), libelle: String(r.libelle ?? ''),
    debit: Number(r.debit ?? 0), credit: Number(r.credit ?? 0),
    echeance: r.echeance == null || r.echeance === '' ? null : String(r.echeance),
    lettrage: r.lettrage == null || r.lettrage === '' ? null : String(r.lettrage),
  };
}

const E_COLS = 'id, magasin_id, exercice_id, journal, ref, date_ecriture, libelle, statut, reversal_of_id, validee_at, cree_par';
const L_COLS = 'id, ecriture_id, compte, tiers, libelle, debit, credit, echeance, lettrage';

export async function list(magasinId: number): Promise<EcritureListItem[]> {
  const heads = await query<Record<string, unknown>>(
    `SELECT ${E_COLS} FROM ecritures WHERE magasin_id = ${sqlValue(magasinId)} ORDER BY date_ecriture DESC, id DESC`,
  );
  if (!heads.length) return [];
  const ids = heads.map((h) => Number(h.id)).join(',');
  const sums = await query<{ ecriture_id: number; td: number; tc: number }>(
    `SELECT ecriture_id, SUM(debit) AS td, SUM(credit) AS tc FROM ecriture_lignes WHERE ecriture_id IN (${ids}) GROUP BY ecriture_id`,
  );
  const byId = new Map(sums.map((s) => [Number(s.ecriture_id), s]));
  return heads.map((h) => {
    const s = byId.get(Number(h.id));
    return { ...mapEcriture(h), total_debit: Number(s?.td ?? 0), total_credit: Number(s?.tc ?? 0) };
  });
}

export async function get(id: number): Promise<EcritureAvecLignes> {
  const rows = await query<Record<string, unknown>>(`SELECT ${E_COLS} FROM ecritures WHERE id = ${sqlValue(id)}`);
  if (!rows[0]) throw new AppError('NOT_FOUND', 'Écriture introuvable.');
  const e = mapEcriture(rows[0]);
  const ligneRows = await query<Record<string, unknown>>(
    `SELECT ${L_COLS} FROM ecriture_lignes WHERE ecriture_id = ${sqlValue(id)} ORDER BY id`,
  );
  const lignes = ligneRows.map(mapLigne);
  return { ...e, lignes, total_debit: totalDebit(lignes), total_credit: totalCredit(lignes) };
}

async function insertLignes(run: <T = unknown>(sql: string) => Promise<T[]>, ecritureId: number, lignes: EcritureInput['lignes']): Promise<void> {
  for (const l of lignes) {
    await run(
      `INSERT INTO ecriture_lignes (ecriture_id, compte, tiers, libelle, debit, credit, echeance, lettrage) VALUES (` +
        `${sqlValue(ecritureId)}, ${sqlValue(l.compte)}, ${sqlValue(l.tiers)}, ${sqlValue(l.libelle)}, ` +
        `${sqlValue(l.debit)}, ${sqlValue(l.credit)}, ${sqlValue(l.echeance)}, ${sqlValue(l.lettrage)})`,
    );
  }
}

export async function create(magasinId: number, input: EcritureInput): Promise<EcritureAvecLignes> {
  requireAuth();
  const d = parseEcriture(input);
  const user = currentSession()?.username ?? '';
  let id = 0;
  await withTransaction(async (run) => {
    await run(
      `INSERT INTO ecritures (magasin_id, exercice_id, journal, ref, date_ecriture, libelle, statut, reversal_of_id, validee_at, cree_par) VALUES (` +
        `${sqlValue(magasinId)}, ${sqlValue(d.exercice_id)}, ${sqlValue(d.journal)}, '', ${sqlValue(d.date_ecriture)}, ` +
        `${sqlValue(d.libelle)}, 'brouillon', NULL, NULL, ${sqlValue(user)})`,
    );
    id = Number((await run<{ id: number | null }>('SELECT MAX(id) AS id FROM ecritures'))[0]?.id ?? 0);
    await insertLignes(run, id, d.lignes);
  });
  return get(id);
}

export async function update(id: number, input: EcritureInput): Promise<EcritureAvecLignes> {
  requireAuth();
  const cur = await get(id);
  if (cur.statut !== 'brouillon') throw new AppError('IMMUABLE', 'Une écriture validée ne peut pas être modifiée.');
  const d = parseEcriture(input);
  await withTransaction(async (run) => {
    await run(
      `UPDATE ecritures SET exercice_id = ${sqlValue(d.exercice_id)}, journal = ${sqlValue(d.journal)}, ` +
        `date_ecriture = ${sqlValue(d.date_ecriture)}, libelle = ${sqlValue(d.libelle)} WHERE id = ${sqlValue(id)}`,
    );
    await run(`DELETE FROM ecriture_lignes WHERE ecriture_id = ${sqlValue(id)}`);
    await insertLignes(run, id, d.lignes);
  });
  return get(id);
}

export async function validate(id: number): Promise<EcritureAvecLignes> {
  requireAuth();
  const e = await get(id);
  if (e.statut !== 'brouillon') throw new AppError('IMMUABLE', 'Seul un brouillon peut être validé.');
  const exRows = await query<{ libelle: string; date_debut: string; date_fin: string; statut: string }>(
    `SELECT libelle, date_debut, date_fin, statut FROM exercices WHERE id = ${sqlValue(e.exercice_id)}`,
  );
  const ex = exRows[0];
  if (!ex) throw new AppError('VALIDATION', 'Exercice introuvable.');
  if (e.lignes.length < 2) throw new AppError('VALIDATION', 'Au moins 2 lignes sont requises.');
  for (const l of e.lignes) {
    if (!l.compte) throw new AppError('VALIDATION', 'Chaque ligne doit avoir un compte.');
    if (!ligneValide(l)) throw new AppError('VALIDATION', 'Chaque ligne doit porter un débit OU un crédit positif.');
    if (estAncreCollectif(l.compte) && !l.tiers) {
      throw new AppError('VALIDATION', `Le compte collectif ${l.compte} exige un tiers.`);
    }
  }
  if (!(estEquilibree(e.lignes) && totalDebit(e.lignes) > 0)) {
    throw new AppError('VALIDATION', 'Écriture déséquilibrée (Σ débit ≠ Σ crédit).');
  }
  if (ex.statut !== 'ouvert') throw new AppError('VALIDATION', "L'exercice est clôturé.");
  if (!dateDansPeriode(e.date_ecriture, ex.date_debut, ex.date_fin)) {
    throw new AppError('VALIDATION', "La date doit tomber dans l'exercice.");
  }
  const seqRows = await query<{ n: number }>(
    `SELECT COUNT(*) AS n FROM ecritures WHERE magasin_id = ${sqlValue(e.magasin_id)} ` +
      `AND exercice_id = ${sqlValue(e.exercice_id)} AND journal = ${sqlValue(e.journal)} AND statut = 'validee'`,
  );
  const ref = numeroRef(e.journal, ex.libelle, (seqRows[0]?.n ?? 0) + 1);
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  await execute(
    `UPDATE ecritures SET statut = 'validee', ref = ${sqlValue(ref)}, validee_at = ${sqlValue(now)}, ` +
      `cree_par = ${sqlValue(currentSession()?.username ?? '')} WHERE id = ${sqlValue(id)}`,
  );
  return get(id);
}

export async function remove(id: number): Promise<void> {
  requireAuth();
  const cur = await get(id);
  if (cur.statut !== 'brouillon') throw new AppError('IMMUABLE', 'Une écriture validée ne peut pas être supprimée.');
  await withTransaction(async (run) => {
    await run(`DELETE FROM ecriture_lignes WHERE ecriture_id = ${sqlValue(id)}`);
    await run(`DELETE FROM ecritures WHERE id = ${sqlValue(id)}`);
  });
}

export async function reverse(id: number): Promise<EcritureAvecLignes> {
  requireAuth();
  const e = await get(id);
  if (e.statut !== 'validee') throw new AppError('VALIDATION', "Seule une écriture validée peut être extournée.");
  const ex = (await query<{ libelle: string }>(`SELECT libelle FROM exercices WHERE id = ${sqlValue(e.exercice_id)}`))[0];
  const seqRows = await query<{ n: number }>(
    `SELECT COUNT(*) AS n FROM ecritures WHERE magasin_id = ${sqlValue(e.magasin_id)} ` +
      `AND exercice_id = ${sqlValue(e.exercice_id)} AND journal = ${sqlValue(e.journal)} AND statut = 'validee'`,
  );
  const ref = numeroRef(e.journal, ex?.libelle ?? '', (seqRows[0]?.n ?? 0) + 1);
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const user = currentSession()?.username ?? '';
  const inverses = inverseLignes(e.lignes);
  let newId = 0;
  await withTransaction(async (run) => {
    await run(
      `INSERT INTO ecritures (magasin_id, exercice_id, journal, ref, date_ecriture, libelle, statut, reversal_of_id, validee_at, cree_par) VALUES (` +
        `${sqlValue(e.magasin_id)}, ${sqlValue(e.exercice_id)}, ${sqlValue(e.journal)}, ${sqlValue(ref)}, ` +
        `${sqlValue(e.date_ecriture)}, ${sqlValue('EXTOURNE ' + e.ref)}, 'validee', ${sqlValue(e.id)}, ${sqlValue(now)}, ${sqlValue(user)})`,
    );
    newId = Number((await run<{ id: number | null }>('SELECT MAX(id) AS id FROM ecritures'))[0]?.id ?? 0);
    await insertLignes(run, newId, inverses.map((l) => ({
      compte: l.compte, tiers: l.tiers, libelle: l.libelle, debit: l.debit, credit: l.credit,
      echeance: l.echeance, lettrage: l.lettrage,
    })));
  });
  return get(newId);
}

export async function invalidate(id: number): Promise<void> {
  requireAdmin();
  const cur = await get(id);
  if (cur.statut !== 'validee') throw new AppError('VALIDATION', "Seule une écriture validée peut être invalidée.");
  await execute(`UPDATE ecritures SET statut = 'invalidee' WHERE id = ${sqlValue(id)}`);
}
