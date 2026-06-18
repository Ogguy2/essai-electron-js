import type { Compte, CompteInput } from '../../../shared/ipc';
import { query, execute, nextId, sqlValue } from '../../db/connection';
import { requireAdmin } from '../auth';
import { compteInputSchema, firstZodError } from '../../../shared/schemas';
import { estAncreCollectif } from '../../../domain/compte';
import { AppError } from '../common/errors';

/** Service Plan comptable (processus principal). Mutations réservées à l'Admin. */

/** Valide la saisie via le schéma Zod partagé ; renvoie les données nettoyées. */
function parseCompte(input: CompteInput): CompteInput {
  const parsed = compteInputSchema.safeParse(input);
  if (!parsed.success) throw new AppError('VALIDATION', firstZodError(parsed.error));
  return parsed.data;
}

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
  const data = parseCompte(input);
  if (await numeroExiste(magasinId, data.numero)) {
    throw new AppError('VALIDATION', 'Ce numéro de compte existe déjà pour ce magasin.');
  }
  const id = await nextId('comptes');
  await execute(
    `INSERT INTO comptes (id, magasin_id, numero, libelle, classe, collectif, lettrable) VALUES (` +
      `${sqlValue(id)}, ${sqlValue(magasinId)}, ${sqlValue(data.numero)}, ${sqlValue(data.libelle)}, ` +
      `${sqlValue(data.classe)}, ${sqlValue(data.collectif)}, ${sqlValue(data.lettrable)})`,
  );
  return { id, magasin_id: magasinId, ...data };
}

export async function update(id: number, input: CompteInput): Promise<Compte> {
  requireAdmin();
  const data = parseCompte(input);
  // Récupère le magasin du compte pour vérifier l'unicité du numéro dans son périmètre.
  const rows = await query<{ magasin_id: number }>(
    `SELECT magasin_id FROM comptes WHERE id = ${sqlValue(id)}`,
  );
  const magasinId = rows[0]?.magasin_id;
  if (magasinId === undefined) throw new AppError('NOT_FOUND', 'Compte introuvable.');
  if (await numeroExiste(magasinId, data.numero, id)) {
    throw new AppError('VALIDATION', 'Ce numéro de compte existe déjà pour ce magasin.');
  }
  await execute(
    `UPDATE comptes SET numero = ${sqlValue(data.numero)}, libelle = ${sqlValue(data.libelle)}, ` +
      `classe = ${sqlValue(data.classe)}, collectif = ${sqlValue(data.collectif)}, ` +
      `lettrable = ${sqlValue(data.lettrable)} WHERE id = ${sqlValue(id)}`,
  );
  return { id, magasin_id: magasinId, ...data };
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
