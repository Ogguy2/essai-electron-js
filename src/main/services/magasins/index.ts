import type { Magasin, MagasinInput } from '../../../shared/ipc';
import { query, execute, nextId, sqlValue, withTransaction } from '../../db/connection';
import { requireAdmin } from '../auth';
import { magasinInputSchema, firstZodError } from '../../../shared/schemas';
import { buildComptesPlan } from './plan-comptable';
import { AppError } from '../common/errors';

/** Service Magasins (processus principal). Mutations réservées à l'Admin. */

/** Valide la saisie via le schéma Zod partagé ; renvoie les données nettoyées. */
function parseMagasin(input: MagasinInput): MagasinInput {
  const parsed = magasinInputSchema.safeParse(input);
  if (!parsed.success) throw new AppError('VALIDATION', firstZodError(parsed.error));
  return parsed.data;
}

export async function list(): Promise<Magasin[]> {
  return query<Magasin>('SELECT id, libelle, societe_id FROM magasins ORDER BY libelle');
}

export async function create(input: MagasinInput): Promise<Magasin> {
  requireAdmin();
  const data = parseMagasin(input);

  const id = await nextId('magasins');
  const exId = await nextId('exercices');
  let compteId = await nextId('comptes');
  const plan = buildComptesPlan();

  // Année courante pour l'exercice par défaut.
  const year = new Date().getFullYear();

  await withTransaction(async (run) => {
    await run(
      `INSERT INTO magasins (id, libelle, societe_id) VALUES (` +
        `${sqlValue(id)}, ${sqlValue(data.libelle)}, ${sqlValue(data.societe_id)})`,
    );
    await run(
      `INSERT INTO exercices (id, magasin_id, libelle, date_debut, date_fin, statut) VALUES (` +
        `${sqlValue(exId)}, ${sqlValue(id)}, ${sqlValue(String(year))}, ` +
        `${sqlValue(`${year}-01-01`)}, ${sqlValue(`${year}-12-31`)}, ${sqlValue('ouvert')})`,
    );
    for (const c of plan) {
      await run(
        `INSERT INTO comptes (id, magasin_id, numero, libelle, classe, collectif, lettrable) VALUES (` +
          `${sqlValue(compteId)}, ${sqlValue(id)}, ${sqlValue(c.numero)}, ${sqlValue(c.libelle)}, ` +
          `${sqlValue(c.classe)}, ${sqlValue(c.collectif)}, ${sqlValue(c.lettrable)})`,
      );
      compteId += 1;
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
