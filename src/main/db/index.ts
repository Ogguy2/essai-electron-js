import { getDb } from './connection';
import { logInfo, logError } from '../logger';

/**
 * Initialise la base SQLite au démarrage. Ouvre le fichier et garantit le
 * schéma (DDL idempotent, cf. `schema.ts`). Les données de démo sont, elles,
 * insérées via les commandes `db:seed` / `db:fresh`.
 */
export async function bootstrapDatabase(): Promise<void> {
  logInfo('db.bootstrap', 'ouverture de la base SQLite');
  try {
    getDb();
    console.log('[db] Base SQLite prête.');
    logInfo('db.bootstrap', 'Base SQLite prête.');
  } catch (err) {
    console.error('[db] Ouverture SQLite impossible :', (err as Error).message);
    logError('db.bootstrap', err);
  }
}
