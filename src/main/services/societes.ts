import type { Societe, SocieteInput } from '../../shared/ipc';
import { query, execute, nextId, sqlValue } from '../db/connection';
import { requireAdmin } from './auth';
import { validateSocieteInput } from './validation';
import { AppError } from './errors';

/** Service Sociétés (processus principal). Mutations réservées à l'Admin. */

export async function list(): Promise<Societe[]> {
  return query<Societe>(
    'SELECT id, raison_sociale, rccm, adresse, telephone FROM societes ORDER BY raison_sociale',
  );
}

export async function create(input: SocieteInput): Promise<Societe> {
  requireAdmin();
  const err = validateSocieteInput(input);
  if (err) throw new AppError('VALIDATION', err);
  const id = await nextId('societes');
  await execute(
    `INSERT INTO societes (id, raison_sociale, rccm, adresse, telephone) VALUES (` +
      `${sqlValue(id)}, ${sqlValue(input.raison_sociale.trim())}, ${sqlValue(input.rccm)}, ` +
      `${sqlValue(input.adresse)}, ${sqlValue(input.telephone)})`,
  );
  return { id, ...input, raison_sociale: input.raison_sociale.trim() };
}

export async function update(id: number, input: SocieteInput): Promise<Societe> {
  requireAdmin();
  const err = validateSocieteInput(input);
  if (err) throw new AppError('VALIDATION', err);
  await execute(
    `UPDATE societes SET raison_sociale = ${sqlValue(input.raison_sociale.trim())}, ` +
      `rccm = ${sqlValue(input.rccm)}, adresse = ${sqlValue(input.adresse)}, ` +
      `telephone = ${sqlValue(input.telephone)} WHERE id = ${sqlValue(id)}`,
  );
  return { id, ...input, raison_sociale: input.raison_sociale.trim() };
}

export async function remove(id: number): Promise<void> {
  requireAdmin();
  const rows = await query<{ n: number }>(
    `SELECT COUNT(*) AS n FROM magasins WHERE societe_id = ${sqlValue(id)}`,
  );
  if ((rows[0]?.n ?? 0) > 0) {
    throw new AppError('HAS_MAGASINS', 'Impossible : cette société possède des magasins.');
  }
  await execute(`DELETE FROM societes WHERE id = ${sqlValue(id)}`);
}
