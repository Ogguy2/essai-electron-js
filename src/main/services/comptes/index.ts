import type { Compte, CompteInput } from '../../../shared/ipc';
import { query, execute, nextId, sqlValue } from '../../db/connection';
import { requireAdmin } from '../auth';
import { validateCompteInput } from '../common/validation';
import { estAncreCollectif } from '../../../domain/compte';
import { AppError } from '../common/errors';

/** Service Plan comptable (processus principal). Mutations réservées à l'Admin. */

export async function list(magasinId: number): Promise<Compte[]> {
  return query<Compte>(
    `SELECT id, magasin_id, numero, libelle, classe, collectif, lettrable ` +
      `FROM comptes WHERE magasin_id = ${sqlValue(magasinId)} ORDER BY numero`,
  );
}

async function numeroExiste(magasinId: number, numero: string, exceptId?: number): Promise<boolean> {
  const extra = exceptId ? ` AND id <> ${sqlValue(exceptId)}` : '';
  const rows = await query<{ n: number }>(
    `SELECT COUNT(*) AS n FROM comptes WHERE magasin_id = ${sqlValue(magasinId)} ` +
      `AND numero = ${sqlValue(numero)}${extra}`,
  );
  return (rows[0]?.n ?? 0) > 0;
}

export async function create(magasinId: number, input: CompteInput): Promise<Compte> {
  requireAdmin();
  const err = validateCompteInput(input);
  if (err) throw new AppError('VALIDATION', err);
  if (await numeroExiste(magasinId, input.numero)) {
    throw new AppError('VALIDATION', 'Ce numéro de compte existe déjà pour ce magasin.');
  }
  const id = await nextId('comptes');
  await execute(
    `INSERT INTO comptes (id, magasin_id, numero, libelle, classe, collectif, lettrable) VALUES (` +
      `${sqlValue(id)}, ${sqlValue(magasinId)}, ${sqlValue(input.numero)}, ${sqlValue(input.libelle.trim())}, ` +
      `${sqlValue(input.classe)}, ${sqlValue(input.collectif)}, ${sqlValue(input.lettrable)})`,
  );
  return { id, magasin_id: magasinId, ...input, libelle: input.libelle.trim() };
}

export async function update(id: number, input: CompteInput): Promise<Compte> {
  requireAdmin();
  const err = validateCompteInput(input);
  if (err) throw new AppError('VALIDATION', err);
  // Récupère le magasin du compte pour vérifier l'unicité du numéro dans son périmètre.
  const rows = await query<{ magasin_id: number }>(
    `SELECT magasin_id FROM comptes WHERE id = ${sqlValue(id)}`,
  );
  const magasinId = rows[0]?.magasin_id;
  if (magasinId === undefined) throw new AppError('NOT_FOUND', 'Compte introuvable.');
  if (await numeroExiste(magasinId, input.numero, id)) {
    throw new AppError('VALIDATION', 'Ce numéro de compte existe déjà pour ce magasin.');
  }
  await execute(
    `UPDATE comptes SET numero = ${sqlValue(input.numero)}, libelle = ${sqlValue(input.libelle.trim())}, ` +
      `classe = ${sqlValue(input.classe)}, collectif = ${sqlValue(input.collectif)}, ` +
      `lettrable = ${sqlValue(input.lettrable)} WHERE id = ${sqlValue(id)}`,
  );
  return { id, magasin_id: magasinId, ...input, libelle: input.libelle.trim() };
}

export async function remove(id: number): Promise<void> {
  requireAdmin();
  const rows = await query<{ numero: string }>(
    `SELECT numero FROM comptes WHERE id = ${sqlValue(id)}`,
  );
  const numero = rows[0]?.numero;
  if (numero && estAncreCollectif(numero)) {
    throw new AppError('COMPTE_COLLECTIF', 'Compte collectif (ancre des tiers) : suppression interdite.');
  }
  // NB : ajouter un garde « utilisé dans une écriture » avec le module Écritures.
  await execute(`DELETE FROM comptes WHERE id = ${sqlValue(id)}`);
}
