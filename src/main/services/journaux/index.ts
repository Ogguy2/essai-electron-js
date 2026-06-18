import type { Journal, JournalInput } from '../../../shared/ipc';
import { query, execute, insertReturningId, sqlValue } from '../../db/connection';
import { requireAdmin } from '../auth';
import { journalInputSchema, firstZodError } from '../../../shared/schemas';
import { toAsciiUpper } from '../../../domain/text';
import { AppError } from '../common/errors';

function parseJournal(input: JournalInput): JournalInput {
  const parsed = journalInputSchema.safeParse(input);
  if (!parsed.success) throw new AppError('VALIDATION', firstZodError(parsed.error));
  return {
    code: toAsciiUpper(parsed.data.code),
    libelle: toAsciiUpper(parsed.data.libelle),
    type: parsed.data.type,
    active: parsed.data.active,
  };
}

export async function list(magasinId: number): Promise<Journal[]> {
  return query<Journal>(
    `SELECT id, magasin_id, code, libelle, type, active FROM journaux ` +
      `WHERE magasin_id = ${sqlValue(magasinId)} ORDER BY code`,
  );
}

async function codeExiste(magasinId: number, code: string, exceptId?: number): Promise<boolean> {
  const extra = exceptId ? ` AND id <> ${sqlValue(exceptId)}` : '';
  const rows = await query<{ n: number }>(
    `SELECT COUNT(*) AS n FROM journaux WHERE magasin_id = ${sqlValue(magasinId)} ` +
      `AND code = ${sqlValue(code)}${extra}`,
  );
  return (rows[0]?.n ?? 0) > 0;
}

export async function create(magasinId: number, input: JournalInput): Promise<Journal> {
  requireAdmin();
  const data = parseJournal(input);
  if (await codeExiste(magasinId, data.code)) {
    throw new AppError('VALIDATION', 'Ce code de journal existe déjà pour ce magasin.');
  }
  const id = await insertReturningId(
    `INSERT INTO journaux (magasin_id, code, libelle, type, active) VALUES (` +
      `${sqlValue(magasinId)}, ${sqlValue(data.code)}, ${sqlValue(data.libelle)}, ` +
      `${sqlValue(data.type)}, ${sqlValue(data.active)})`,
    'journaux',
  );
  return { id, magasin_id: magasinId, ...data };
}

export async function update(id: number, input: JournalInput): Promise<Journal> {
  requireAdmin();
  const data = parseJournal(input);
  const rows = await query<{ magasin_id: number }>(
    `SELECT magasin_id FROM journaux WHERE id = ${sqlValue(id)}`,
  );
  const magasinId = rows[0]?.magasin_id;
  if (magasinId === undefined) throw new AppError('NOT_FOUND', 'Journal introuvable.');
  if (await codeExiste(magasinId, data.code, id)) {
    throw new AppError('VALIDATION', 'Ce code de journal existe déjà pour ce magasin.');
  }
  await execute(
    `UPDATE journaux SET code = ${sqlValue(data.code)}, libelle = ${sqlValue(data.libelle)}, ` +
      `type = ${sqlValue(data.type)}, active = ${sqlValue(data.active)} WHERE id = ${sqlValue(id)}`,
  );
  return { id, magasin_id: magasinId, ...data };
}

export async function remove(id: number): Promise<void> {
  requireAdmin();
  // NB : garde « journal utilisé dans une écriture » à ajouter avec le module Écritures.
  await execute(`DELETE FROM journaux WHERE id = ${sqlValue(id)}`);
}
