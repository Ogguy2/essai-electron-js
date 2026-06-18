import * as odbc from 'odbc';
import { buildDsn, getHfsqlConfig } from './config';
import { logInfo, logError } from '../logger';

/**
 * Couche d'accès données HFSQL (ODBC) — UNIQUE point de contact avec la base.
 *
 * ⚠️ Le pilote ODBC HFSQL ne supporte pas les requêtes paramétrées (`?`) via
 * node-odbc (il renvoie un nombre de marqueurs erroné). On construit donc le SQL
 * avec des valeurs **inlinées et échappées** via `sqlValue()` (anti-injection).
 */

let pool: odbc.Pool | null = null;

export async function getPool(): Promise<odbc.Pool> {
  if (!pool) {
    // Petit pool : app desktop mono-utilisateur. Limite les connexions ouvertes
    // sur le serveur HFSQL.
    logInfo('db.getPool', 'tentative de connexion HFSQL (ouverture du pool ODBC)');
    try {
      pool = await odbc.pool({
        connectionString: buildDsn(getHfsqlConfig()),
        initialSize: 1,
        maxSize: 4,
      });
      logInfo('db.getPool', 'pool ODBC HFSQL ouvert avec succès');
    } catch (err) {
      logError('db.getPool', err);
      throw err;
    }
  }
  return pool;
}

/** Exécute une requête SQL (valeurs déjà inlinées via sqlValue) et renvoie les lignes. */
export async function query<T = unknown>(sql: string): Promise<T[]> {
  const p = await getPool();
  try {
    const rows = await p.query<T>(sql);
    return Array.from(rows);
  } catch (err) {
    // Contexte SQL volontairement tronqué (~80 car.) pour éviter de consigner
    // d'éventuels INSERT contenant des hachages de mots de passe.
    const sqlPrefix = sql.slice(0, 80);
    logError('db.query', err);
    logInfo('db.query', `échec sur SQL: ${sqlPrefix}`);
    // On relance : les appelants gèrent toujours l'erreur eux-mêmes.
    throw err;
  }
}

/**
 * Échappe une valeur pour l'inclure directement dans une instruction SQL.
 * Indispensable faute de paramètres `?` (cf. note ci-dessus).
 */
export function sqlValue(v: string | number | boolean | null | undefined): string {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : 'NULL';
  if (typeof v === 'boolean') return v ? '1' : '0';
  return `'${String(v).replace(/'/g, "''")}'`;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.close();
    pool = null;
  }
}
