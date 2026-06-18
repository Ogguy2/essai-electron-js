import type { Magasin, MagasinInput } from '../../../shared/ipc';
import { query, execute, sqlValue, withTransaction } from '../../db/connection';
import { requireAdmin } from '../auth';
import { magasinInputSchema, firstZodError } from '../../../shared/schemas';
import { toAsciiUpper } from '../../../domain/text';
import { buildComptesPlan } from './plan-comptable';
import { DEFAULT_JOURNAUX } from '../../../domain/journal';
import { AppError } from '../common/errors';

/** Service Magasins (processus principal). Mutations réservées à l'Admin. */

/** Valide la saisie ; le libellé est stocké en MAJUSCULES sans accents (ASCII). */
function parseMagasin(input: MagasinInput): MagasinInput {
  const parsed = magasinInputSchema.safeParse(input);
  if (!parsed.success) throw new AppError('VALIDATION', firstZodError(parsed.error));
  return { libelle: toAsciiUpper(parsed.data.libelle), societe_id: parsed.data.societe_id };
}

export async function list(): Promise<Magasin[]> {
  return query<Magasin>('SELECT id, libelle, societe_id FROM magasins ORDER BY libelle');
}

export async function create(input: MagasinInput): Promise<Magasin> {
  requireAdmin();
  const data = parseMagasin(input);
  const plan = buildComptesPlan();

  // Année courante pour l'exercice par défaut.
  const year = new Date().getFullYear();

  // Tout dans UNE transaction. Les `id` sont auto-incrémentés par HFSQL : on
  // insère sans `id`, puis on relit MAX(id) du magasin pour rattacher l'exercice
  // et les comptes (HFSQL/ODBC ne fournit pas LAST_INSERT_ID — cf. connection.ts).
  let id = 0;
  await withTransaction(async (run) => {
    await run(
      `INSERT INTO magasins (libelle, societe_id) VALUES (` +
        `${sqlValue(data.libelle)}, ${sqlValue(data.societe_id)})`,
    );
    const rows = await run<{ id: number | null }>('SELECT MAX(id) AS id FROM magasins');
    id = Number(rows[0]?.id ?? 0);

    await run(
      `INSERT INTO exercices (magasin_id, libelle, date_debut, date_fin, statut) VALUES (` +
        `${sqlValue(id)}, ${sqlValue(String(year))}, ` +
        `${sqlValue(`${year}-01-01`)}, ${sqlValue(`${year}-12-31`)}, ${sqlValue('ouvert')})`,
    );
    for (const c of plan) {
      await run(
        `INSERT INTO comptes (magasin_id, numero, libelle, classe, collectif, lettrable) VALUES (` +
          `${sqlValue(id)}, ${sqlValue(c.numero)}, ${sqlValue(c.libelle)}, ` +
          `${sqlValue(c.classe)}, ${sqlValue(c.collectif)}, ${sqlValue(c.lettrable)})`,
      );
    }
    for (const j of DEFAULT_JOURNAUX) {
      await run(
        `INSERT INTO journaux (magasin_id, code, libelle, type, active) VALUES (` +
          `${sqlValue(id)}, ${sqlValue(toAsciiUpper(j.code))}, ${sqlValue(toAsciiUpper(j.libelle))}, ` +
          `${sqlValue(j.type)}, 1)`,
      );
    }
  });

  return { id, libelle: data.libelle, societe_id: data.societe_id };
}

export async function update(id: number, input: MagasinInput): Promise<Magasin> {
  requireAdmin();
  const data = parseMagasin(input);
  await execute(
    `UPDATE magasins SET libelle = ${sqlValue(data.libelle)}, ` +
      `societe_id = ${sqlValue(data.societe_id)} WHERE id = ${sqlValue(id)}`,
  );
  return { id, libelle: data.libelle, societe_id: data.societe_id };
}

export async function remove(id: number): Promise<void> {
  requireAdmin();
  // Cascade : exercices + comptes du magasin, puis le magasin (transaction).
  // NB : ajouter un garde « écritures existantes » quand le module Écritures arrivera.
  await withTransaction(async (run) => {
    await run(`DELETE FROM comptes WHERE magasin_id = ${sqlValue(id)}`);
    await run(`DELETE FROM exercices WHERE magasin_id = ${sqlValue(id)}`);
    await run(`DELETE FROM magasins WHERE id = ${sqlValue(id)}`);
  });
}
