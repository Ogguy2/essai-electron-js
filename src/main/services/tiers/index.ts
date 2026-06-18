import type { Tiers, TiersInput } from '../../../shared/ipc';
import { query, execute, sqlValue, withTransaction, toBool } from '../../db/connection';
import { requireAuth } from '../auth';
import { tiersInputSchema, firstZodError } from '../../../shared/schemas';
import { toAsciiUpper } from '../../../domain/text';
import { SOUS_COMPTE_PREFIX, formatSousCompte, prochaineSequence } from '../../../domain/tiers';
import { AppError } from '../common/errors';

/** Service Tiers (processus principal). Ouvert à Admin ET Comptable. */

function parseTiers(input: TiersInput): TiersInput {
  const parsed = tiersInputSchema.safeParse(input);
  if (!parsed.success) throw new AppError('VALIDATION', firstZodError(parsed.error));
  const d = parsed.data;
  return {
    code: toAsciiUpper(d.code),
    raison_sociale: toAsciiUpper(d.raison_sociale),
    est_client: d.est_client,
    est_fournisseur: d.est_fournisseur,
    telephone: toAsciiUpper(d.telephone),
    adresse: toAsciiUpper(d.adresse),
    registre_commerce: toAsciiUpper(d.registre_commerce),
    plafond_credit: d.plafond_credit,
    bloque: d.bloque,
  };
}

function mapRow(r: Record<string, unknown>): Tiers {
  return {
    id: Number(r.id),
    magasin_id: Number(r.magasin_id),
    code: String(r.code ?? ''),
    raison_sociale: String(r.raison_sociale ?? ''),
    est_client: toBool(r.est_client),
    est_fournisseur: toBool(r.est_fournisseur),
    telephone: String(r.telephone ?? ''),
    adresse: String(r.adresse ?? ''),
    registre_commerce: String(r.registre_commerce ?? ''),
    plafond_credit: Number(r.plafond_credit ?? 0),
    bloque: toBool(r.bloque),
    compte_client: String(r.compte_client ?? ''),
    compte_fournisseur: String(r.compte_fournisseur ?? ''),
    archived: toBool(r.archived),
  };
}

const COLS = 'id, magasin_id, code, raison_sociale, est_client, est_fournisseur, telephone, ' +
  'adresse, registre_commerce, plafond_credit, bloque, compte_client, compte_fournisseur, archived';

export async function list(magasinId: number): Promise<Tiers[]> {
  const rows = await query<Record<string, unknown>>(
    `SELECT ${COLS} FROM tiers WHERE magasin_id = ${sqlValue(magasinId)} AND archived <> 1 ORDER BY code`,
  );
  return rows.map(mapRow);
}

async function codeExiste(magasinId: number, code: string, exceptId?: number): Promise<boolean> {
  const extra = exceptId ? ` AND id <> ${sqlValue(exceptId)}` : '';
  const rows = await query<{ n: number }>(
    `SELECT COUNT(*) AS n FROM tiers WHERE magasin_id = ${sqlValue(magasinId)} AND code = ${sqlValue(code)}${extra}`,
  );
  return (rows[0]?.n ?? 0) > 0;
}

/** Insère un sous-compte tiers (4111/4011) et renvoie son numéro. À appeler DANS la transaction. */
async function creerSousCompte(
  run: <T = unknown>(sql: string) => Promise<T[]>,
  magasinId: number,
  prefix: string,
  libelle: string,
): Promise<string> {
  const maxRows = await run<{ m: string | null }>(
    `SELECT MAX(numero) AS m FROM comptes WHERE magasin_id = ${sqlValue(magasinId)} AND numero LIKE '${prefix}%'`,
  );
  const numero = formatSousCompte(prefix, prochaineSequence(maxRows[0]?.m ?? null, prefix));
  await run(
    `INSERT INTO comptes (magasin_id, numero, libelle, classe, collectif, lettrable) VALUES (` +
      `${sqlValue(magasinId)}, ${sqlValue(numero)}, ${sqlValue(libelle)}, 4, 0, 1)`,
  );
  return numero;
}

export async function create(magasinId: number, input: TiersInput): Promise<Tiers> {
  requireAuth();
  const d = parseTiers(input);
  if (await codeExiste(magasinId, d.code)) {
    throw new AppError('VALIDATION', 'Ce code de tiers existe déjà pour ce magasin.');
  }
  let id = 0;
  let compteClient = '';
  let compteFournisseur = '';
  await withTransaction(async (run) => {
    if (d.est_client) compteClient = await creerSousCompte(run, magasinId, SOUS_COMPTE_PREFIX.client, d.raison_sociale);
    if (d.est_fournisseur) compteFournisseur = await creerSousCompte(run, magasinId, SOUS_COMPTE_PREFIX.fournisseur, d.raison_sociale);
    await run(
      `INSERT INTO tiers (magasin_id, code, raison_sociale, est_client, est_fournisseur, telephone, ` +
        `adresse, registre_commerce, plafond_credit, bloque, compte_client, compte_fournisseur, archived) VALUES (` +
        `${sqlValue(magasinId)}, ${sqlValue(d.code)}, ${sqlValue(d.raison_sociale)}, ${sqlValue(d.est_client)}, ` +
        `${sqlValue(d.est_fournisseur)}, ${sqlValue(d.telephone)}, ${sqlValue(d.adresse)}, ` +
        `${sqlValue(d.registre_commerce)}, ${sqlValue(d.plafond_credit)}, ${sqlValue(d.bloque)}, ` +
        `${sqlValue(compteClient)}, ${sqlValue(compteFournisseur)}, 0)`,
    );
    const idRows = await run<{ id: number | null }>('SELECT MAX(id) AS id FROM tiers');
    id = Number(idRows[0]?.id ?? 0);
  });
  return { id, magasin_id: magasinId, ...d, compte_client: compteClient, compte_fournisseur: compteFournisseur, archived: false };
}

export async function update(id: number, input: TiersInput): Promise<Tiers> {
  requireAuth();
  const d = parseTiers(input);
  const rows = await query<Record<string, unknown>>(`SELECT ${COLS} FROM tiers WHERE id = ${sqlValue(id)}`);
  if (!rows[0]) throw new AppError('NOT_FOUND', 'Tiers introuvable.');
  const existant = mapRow(rows[0]);
  if (await codeExiste(existant.magasin_id, d.code, id)) {
    throw new AppError('VALIDATION', 'Ce code de tiers existe déjà pour ce magasin.');
  }
  let compteClient = existant.compte_client;
  let compteFournisseur = existant.compte_fournisseur;
  await withTransaction(async (run) => {
    // Génère un sous-compte si un flag vient d'être activé et qu'il manque.
    if (d.est_client && !compteClient) compteClient = await creerSousCompte(run, existant.magasin_id, SOUS_COMPTE_PREFIX.client, d.raison_sociale);
    if (d.est_fournisseur && !compteFournisseur) compteFournisseur = await creerSousCompte(run, existant.magasin_id, SOUS_COMPTE_PREFIX.fournisseur, d.raison_sociale);
    await run(
      `UPDATE tiers SET code = ${sqlValue(d.code)}, raison_sociale = ${sqlValue(d.raison_sociale)}, ` +
        `est_client = ${sqlValue(d.est_client)}, est_fournisseur = ${sqlValue(d.est_fournisseur)}, ` +
        `telephone = ${sqlValue(d.telephone)}, adresse = ${sqlValue(d.adresse)}, ` +
        `registre_commerce = ${sqlValue(d.registre_commerce)}, plafond_credit = ${sqlValue(d.plafond_credit)}, ` +
        `bloque = ${sqlValue(d.bloque)}, compte_client = ${sqlValue(compteClient)}, ` +
        `compte_fournisseur = ${sqlValue(compteFournisseur)} WHERE id = ${sqlValue(id)}`,
    );
  });
  return { id, magasin_id: existant.magasin_id, ...d, compte_client: compteClient, compte_fournisseur: compteFournisseur, archived: false };
}

/** Soft delete : archive le tiers (conserve l'historique et les sous-comptes 4111/4011). */
export async function remove(id: number): Promise<void> {
  requireAuth();
  await execute(`UPDATE tiers SET archived = 1 WHERE id = ${sqlValue(id)}`);
}
