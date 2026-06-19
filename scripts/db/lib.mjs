/**
 * Lib partagée des commandes BD (DML) — connexion SQLite (better-sqlite3),
 * encodage et helpers SQL communs aux seeders (scripts/db/seeders/) et aux
 * commandes db:status / db:seed / db:fresh.
 *
 * Migration HFSQL → SQLite : `connect()` renvoie désormais un objet qui IMITE
 * l'ancienne API de connexion ODBC (`conn.query(sql)` async, `conn.close()`),
 * mais adossé à better-sqlite3 (synchrone). Les seeders restent donc inchangés.
 *
 * ⚠️ Ces scripts tournent sous Electron-as-node (cf. package.json `db:*`) : le
 * binaire natif better-sqlite3 est compilé pour l'ABI Electron, pas Node.
 */
import 'dotenv/config';
import * as fs from 'node:fs';
import * as path from 'node:path';
import BetterSqlite3 from 'better-sqlite3';

/**
 * Emplacement du fichier SQLite. Doit rester aligné avec
 * `src/main/db/config.ts` : `SQLITE_PATH` sinon `.data/sicocompte.db` à la
 * racine du projet (les scripts s'exécutent depuis la racine via npm).
 */
export function resolveDbPath() {
  if (process.env.SQLITE_PATH) return process.env.SQLITE_PATH;
  return path.join(process.cwd(), '.data', 'sicocompte.db');
}

/**
 * DDL idempotent — DOIT rester synchronisé avec `src/main/db/schema.ts`.
 * Dupliqué ici car les scripts (.mjs) ne peuvent pas importer le module TS
 * bundlé de l'app. Garantit que les tables existent avant tout seed.
 */
const DDL = `
CREATE TABLE IF NOT EXISTS app_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT, password_hash TEXT,
  name TEXT, email TEXT, role TEXT, active INTEGER);
CREATE TABLE IF NOT EXISTS societes (
  id INTEGER PRIMARY KEY AUTOINCREMENT, raison_sociale TEXT, rccm TEXT,
  adresse TEXT, telephone TEXT);
CREATE TABLE IF NOT EXISTS magasins (
  id INTEGER PRIMARY KEY AUTOINCREMENT, libelle TEXT, societe_id INTEGER);
CREATE TABLE IF NOT EXISTS exercices (
  id INTEGER PRIMARY KEY AUTOINCREMENT, magasin_id INTEGER, libelle TEXT,
  date_debut TEXT, date_fin TEXT, statut TEXT);
CREATE TABLE IF NOT EXISTS comptes (
  id INTEGER PRIMARY KEY AUTOINCREMENT, magasin_id INTEGER, numero TEXT,
  libelle TEXT, classe INTEGER, collectif INTEGER, lettrable INTEGER);
CREATE TABLE IF NOT EXISTS journaux (
  id INTEGER PRIMARY KEY AUTOINCREMENT, magasin_id INTEGER, code TEXT,
  libelle TEXT, type TEXT, active INTEGER);
CREATE TABLE IF NOT EXISTS tiers (
  id INTEGER PRIMARY KEY AUTOINCREMENT, magasin_id INTEGER, code TEXT,
  raison_sociale TEXT, est_client INTEGER, est_fournisseur INTEGER,
  telephone TEXT, adresse TEXT, registre_commerce TEXT, plafond_credit INTEGER,
  bloque INTEGER, compte_client TEXT, compte_fournisseur TEXT, archived INTEGER);
CREATE TABLE IF NOT EXISTS ecritures (
  id INTEGER PRIMARY KEY AUTOINCREMENT, magasin_id INTEGER, exercice_id INTEGER,
  journal TEXT, ref TEXT, date_ecriture TEXT, libelle TEXT, statut TEXT,
  reversal_of_id INTEGER, validee_at TEXT, cree_par TEXT);
CREATE TABLE IF NOT EXISTS ecriture_lignes (
  id INTEGER PRIMARY KEY AUTOINCREMENT, ecriture_id INTEGER, compte TEXT,
  tiers TEXT, libelle TEXT, debit INTEGER, credit INTEGER, echeance TEXT,
  lettrage TEXT);
`;

/**
 * Ouvre la base SQLite et renvoie une connexion compatible avec l'ancienne API
 * ODBC : `query(sql)` (async, renvoie les lignes pour un SELECT, [] sinon),
 * `close()`, et `db` (l'instance better-sqlite3 brute, pour `insertGetId`).
 */
export async function connect() {
  const file = resolveDbPath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new BetterSqlite3(file);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(DDL);
  return {
    db,
    async query(sql) {
      const stmt = db.prepare(sql);
      if (stmt.reader) return stmt.all();
      stmt.run();
      return [];
    },
    async close() {
      db.close();
    },
  };
}

// --- Encodage texte (cf. src/domain/text.ts) ---
// NB : SQLite stocke l'UTF-8 nativement. On conserve néanmoins la convention
// MAJUSCULES historique (libellés comptables) ; la dé-accentuation reste pour
// rester cohérent avec les services. À assouplir si l'on veut restaurer les
// accents partout (décision UX, hors migration moteur).

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

/**
 * Insère une ligne (sans id) et renvoie l'id auto-incrémenté.
 * SQLite fournit `lastInsertRowid` de façon fiable (fini le repli `MAX(id)`).
 * Le paramètre `table` est conservé pour compatibilité d'appel.
 */
export async function insertGetId(conn, insertSql, _table) {
  const info = conn.db.prepare(insertSql).run();
  return Number(info.lastInsertRowid);
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
