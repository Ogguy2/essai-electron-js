import type { Exercice, ExerciceInput } from '../../../shared/ipc';
import { query, execute, insertReturningId, sqlValue } from '../../db/connection';
import { requireAdmin } from '../auth';
import { exerciceInputSchema, firstZodError } from '../../../shared/schemas';
import { toAsciiUpper } from '../../../domain/text';
import { AppError } from '../common/errors';

/** Service Exercices (lecture + mutations). La clôture est réservée aux Admins. */

export async function list(magasinId: number): Promise<Exercice[]> {
  return query<Exercice>(
    `SELECT id, magasin_id, libelle, date_debut, date_fin, statut FROM exercices ` +
      `WHERE magasin_id = ${sqlValue(magasinId)} ORDER BY date_debut DESC`,
  );
}

export async function create(magasinId: number, input: ExerciceInput): Promise<Exercice> {
  requireAdmin();
  const parsed = exerciceInputSchema.safeParse(input);
  if (!parsed.success) throw new AppError('VALIDATION', firstZodError(parsed.error));
  const data = { ...parsed.data, libelle: toAsciiUpper(parsed.data.libelle) };
  const id = await insertReturningId(
    `INSERT INTO exercices (magasin_id, libelle, date_debut, date_fin, statut) VALUES (` +
      `${sqlValue(magasinId)}, ${sqlValue(data.libelle)}, ${sqlValue(data.date_debut)}, ` +
      `${sqlValue(data.date_fin)}, 'ouvert')`,
    'exercices',
  );
  return { id, magasin_id: magasinId, libelle: data.libelle, date_debut: data.date_debut, date_fin: data.date_fin, statut: 'ouvert' };
}

export async function update(id: number, input: ExerciceInput): Promise<Exercice> {
  requireAdmin();
  const parsed = exerciceInputSchema.safeParse(input);
  if (!parsed.success) throw new AppError('VALIDATION', firstZodError(parsed.error));
  const data = { ...parsed.data, libelle: toAsciiUpper(parsed.data.libelle) };
  const rows = await query<{ magasin_id: number; statut: string }>(
    `SELECT magasin_id, statut FROM exercices WHERE id = ${sqlValue(id)}`,
  );
  const row = rows[0];
  if (!row) throw new AppError('NOT_FOUND', 'Exercice introuvable.');
  await execute(
    `UPDATE exercices SET libelle = ${sqlValue(data.libelle)}, ` +
      `date_debut = ${sqlValue(data.date_debut)}, date_fin = ${sqlValue(data.date_fin)} ` +
      `WHERE id = ${sqlValue(id)}`,
  );
  return {
    id,
    magasin_id: row.magasin_id,
    libelle: data.libelle,
    date_debut: data.date_debut,
    date_fin: data.date_fin,
    statut: row.statut as 'ouvert' | 'cloture',
  };
}

export async function close(id: number): Promise<void> {
  requireAdmin();
  await execute(`UPDATE exercices SET statut = 'cloture' WHERE id = ${sqlValue(id)}`);
}

export async function reopen(id: number): Promise<void> {
  requireAdmin();
  await execute(`UPDATE exercices SET statut = 'ouvert' WHERE id = ${sqlValue(id)}`);
}
