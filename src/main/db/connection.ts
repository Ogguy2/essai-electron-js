import * as fs from 'node:fs';
import * as path from 'node:path';
import BetterSqlite3 from 'better-sqlite3';
import { resolveDbPath } from './config';
import { ensureSchema } from './schema';
import { ensureDefaultUsers } from './seed';
import { logInfo, logError } from '../logger';

/**
 * Couche d'accès données SQLite (better-sqlite3) — UNIQUE point de contact avec
 * la base. Remplace l'ancien accès HFSQL/ODBC.
 *
 * better-sqlite3 est **synchrone**. On conserve néanmoins des signatures `async`
 * (Promise) pour garder l'API historique : les 12 services et l'IPC restent
 * inchangés. Comme aucune opération ne fait réellement d'I/O asynchrone, une
 * transaction ouverte par `withTransaction` se termine dans la même phase de
 * micro-tâches — aucune autre requête IPC ne peut s'y intercaler.
 */

let db: BetterSqlite3.Database | null = null;

/** Ouvre (paresseusement) la base SQLite et garantit le schéma. */
export function getDb(): BetterSqlite3.Database {
  if (!db) {
    const file = resolveDbPath();
    fs.mkdirSync(path.dirname(file), { recursive: true });
    logInfo('db.getDb', `ouverture SQLite : ${file}`);
    db = new BetterSqlite3(file);
    db.pragma('journal_mode = WAL'); // meilleures perfs + lectures concurrentes
    db.pragma('foreign_keys = ON');
    ensureSchema(db);
    ensureDefaultUsers(db); // premier lancement : crée admin + comptable si base vide
    logInfo('db.getDb', 'base SQLite ouverte (schéma garanti)');
  }
  return db;
}

/**
 * Exécute une instruction SQL et renvoie les lignes.
 * `Statement.reader` vaut `true` pour les requêtes qui renvoient des données
 * (SELECT…) → on `all()` ; sinon on `run()` (INSERT/UPDATE/DELETE) et on
 * renvoie un tableau vide. Permet d'utiliser le même helper pour tout.
 */
function runSql<T = unknown>(d: BetterSqlite3.Database, sql: string): T[] {
  const stmt = d.prepare(sql);
  if (stmt.reader) return stmt.all() as T[];
  stmt.run();
  return [];
}

/** Exécute une requête SQL (valeurs inlinées via sqlValue) et renvoie les lignes. */
export async function query<T = unknown>(sql: string): Promise<T[]> {
  try {
    return runSql<T>(getDb(), sql);
  } catch (err) {
    const sqlPrefix = sql.slice(0, 120);
    console.error(`[db.query] ${(err as Error).message}\n  SQL: ${sqlPrefix}`);
    logError('db.query', err);
    logInfo('db.query', `échec sur SQL: ${sqlPrefix}`);
    throw err;
  }
}

/**
 * Échappe une valeur pour l'inclure directement dans une instruction SQL.
 *
 * Conservé pour rester compatible avec les services existants (qui composent du
 * SQL textuel). SQLite supporte les vraies requêtes paramétrées, mais on garde
 * l'inlining échappé pour ne pas réécrire toute la couche. Contrairement à
 * HFSQL, **plus de dé-accentuation** : SQLite stocke l'UTF-8 nativement, les
 * accents sont préservés.
 */
export function sqlValue(v: string | number | boolean | null | undefined): string {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : 'NULL';
  if (typeof v === 'boolean') return v ? '1' : '0';
  return `'${String(v).replace(/'/g, "''")}'`;
}

/**
 * Normalise un BOOLEAN stocké (INTEGER 0/1) en `boolean` JS. Les schémas zod
 * côté renderer attendent un vrai `boolean`.
 */
export function toBool(v: unknown): boolean {
  return v === true || v === 1 || v === '1';
}

/**
 * Exécute un bloc de requêtes dans UNE transaction.
 * `run(sql)` exécute une requête. Commit si tout passe, rollback sinon.
 * (better-sqlite3 étant synchrone, le callback `async` se déroule sans yield
 * réel — la transaction est atomique vis-à-vis des autres appels IPC.)
 */
export async function withTransaction(
  fn: (run: <T = unknown>(sql: string) => Promise<T[]>) => Promise<void>,
): Promise<void> {
  const d = getDb();
  d.exec('BEGIN');
  try {
    await fn(async <T = unknown>(sql: string) => runSql<T>(d, sql));
    d.exec('COMMIT');
  } catch (err) {
    try {
      d.exec('ROLLBACK');
    } catch {
      /* rollback best-effort */
    }
    console.error(`[db.withTransaction] ${(err as Error).message}`);
    logError('db.withTransaction', err);
    throw err;
  }
}

/** Exécute une seule requête d'écriture. */
export async function execute(sql: string): Promise<void> {
  try {
    runSql(getDb(), sql);
  } catch (err) {
    console.error(`[db.execute] ${(err as Error).message}\n  SQL: ${sql.slice(0, 120)}`);
    logError('db.execute', err);
    throw err;
  }
}

/**
 * Insère une ligne SANS `id` (colonne AUTOINCREMENT) et renvoie l'id assigné.
 * SQLite expose `lastInsertRowid` de façon fiable (plus besoin du repli
 * `MAX(id)` qu'imposait HFSQL/ODBC). Le paramètre `table` est conservé pour
 * compatibilité d'appel mais n'est plus utilisé.
 */
export async function insertReturningId(insertSql: string, _table?: string): Promise<number> {
  const info = getDb().prepare(insertSql).run();
  return Number(info.lastInsertRowid);
}

/** Ferme la base (appelé à la fermeture de l'app). */
export async function closePool(): Promise<void> {
  if (db) {
    db.close();
    db = null;
  }
}
