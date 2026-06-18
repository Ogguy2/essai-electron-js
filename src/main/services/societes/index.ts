import type { Societe, SocieteInput } from '../../../shared/ipc';
import { query, execute, nextId, sqlValue } from '../../db/connection';
import { requireAdmin } from '../auth';
import { societeInputSchema, firstZodError } from '../../../shared/schemas';
import { AppError } from '../common/errors';

/** Service Sociétés (processus principal). Mutations réservées à l'Admin. */

/** Valide la saisie via le schéma Zod partagé ; renvoie les données nettoyées. */
function parseSociete(input: SocieteInput): SocieteInput {
  const parsed = societeInputSchema.safeParse(input);
  if (!parsed.success) throw new AppError('VALIDATION', firstZodError(parsed.error));
  return parsed.data;
}

export async function list(): Promise<Societe[]> {
  return query<Societe>(
    'SELECT id, raison_sociale, rccm, adresse, telephone FROM societes ORDER BY raison_sociale',
  );
}

export async function create(input: SocieteInput): Promise<Societe> {
  requireAdmin();
  const data = parseSociete(input);
  const id = await nextId('societes');
  await execute(
    `INSERT INTO societes (id, raison_sociale, rccm, adresse, telephone) VALUES (` +
      `${sqlValue(id)}, ${sqlValue(data.raison_sociale)}, ${sqlValue(data.rccm)}, ` +
      `${sqlValue(data.adresse)}, ${sqlValue(data.telephone)})`,
  );
  return { id, ...data };
}

export async function update(id: number, input: SocieteInput): Promise<Societe> {
  requireAdmin();
  const data = parseSociete(input);
  await execute(
    `UPDATE societes SET raison_sociale = ${sqlValue(data.raison_sociale)}, ` +
      `rccm = ${sqlValue(data.rccm)}, adresse = ${sqlValue(data.adresse)}, ` +
      `telephone = ${sqlValue(data.telephone)} WHERE id = ${sqlValue(id)}`,
  );
  return { id, ...data };
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
