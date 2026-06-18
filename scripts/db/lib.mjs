/**
 * Lib partagée des commandes BD (DML) — connexion HFSQL, encodage et helpers SQL
 * communs aux seeders (scripts/db/seeders/) et aux commandes db:status / db:seed /
 * db:fresh.
 *
 * ⚠️ HFSQL/ODBC ne permet PAS de DDL programmatique fiable (tables créées par
 * ODBC non visibles ailleurs — cf. probe-ddl). Le SCHÉMA reste donc créé à la
 * main dans le Centre de contrôle (db/schema/*.sql). Ces commandes ne font que
 * du DML (données). Les `id` sont auto-incrémentés (insertion SANS id) et les
 * chaînes sont pré-encodées utf8→latin1 (contournement d'encodage, cf.
 * src/main/db/connection.ts).
 */
import 'dotenv/config';
import odbc from 'odbc';

export function getConfig() {
  return {
    driver: process.env.HFSQL_DRIVER ?? 'HFSQL',
    host: process.env.HFSQL_HOST ?? '127.0.0.1',
    port: process.env.HFSQL_PORT ?? '4900',
    database: process.env.HFSQL_DATABASE ?? 'sicocompte',
    user: process.env.HFSQL_USER ?? 'admin',
    password: process.env.HFSQL_PASSWORD ?? '',
  };
}

export const dsn = (c) =>
  `DRIVER={${c.driver}};Server Name=${c.host};Server Port=${c.port};Database=${c.database};UID=${c.user};PWD=${c.password};`;

export async function connect() {
  return odbc.connect(dsn(getConfig()));
}

// --- Encodage texte (cf. src/domain/text.ts) ---

/** Dé-accente → ASCII pur. */
export const deaccent = (s) =>
  String(s)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/œ/g, 'oe').replace(/Œ/g, 'OE').replace(/æ/g, 'ae').replace(/Æ/g, 'AE')
    .replace(/[^\x00-\x7F]/g, '');
/** De-accent + MAJUSCULES (texte humain). */
export const toAsciiUpper = (s) => deaccent(s).toUpperCase();

// --- Helpers de littéraux SQL ---

/** Littéral SQL chaîne, dé-accenté (ASCII) + échappé. */
export const sqlStr = (s) => `'${deaccent(s).replace(/'/g, "''")}'`;
/** Littéral SQL pour un INT nullable (NULL si null/undefined). */
export const sqlIntOrNull = (n) => (n == null ? 'NULL' : Number(n));
/** Littéral SQL pour une chaîne nullable (NULL si vide/null). */
export const sqlStrOrNull = (s) => (s == null || s === '' ? 'NULL' : sqlStr(s));

// --- Helpers de requête ---

/** Insère une ligne (sans id) et renvoie l'id auto-incrémenté (via MAX(id)). */
export async function insertGetId(conn, insertSql, table) {
  await conn.query(insertSql);
  const rows = await conn.query(`SELECT MAX(id) AS id FROM ${table}`);
  return Number(rows?.[0]?.id ?? 0);
}

/** COUNT(*) d'une table, ou null si la table n'existe pas. */
export async function tableCount(conn, table) {
  try {
    const rows = await conn.query(`SELECT COUNT(*) AS n FROM ${table}`);
    return Number(rows?.[0]?.n ?? 0);
  } catch {
    return null;
  }
}

/** Tables de DONNÉES gérées par seed/fresh (app_users est hors périmètre). */
export const DATA_TABLES = ['ecriture_lignes', 'ecritures', 'tiers', 'journaux', 'comptes', 'exercices', 'magasins', 'societes'];
