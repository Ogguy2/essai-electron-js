import { getPool } from './connection';
import { logInfo, logError } from '../logger';

/**
 * Initialise la connexion HFSQL au démarrage (non bloquant).
 * Les tables sont créées manuellement dans le Centre de contrôle HFSQL à partir
 * des scripts `db/schema/*.sql` — l'application ne fait que lire/écrire dedans.
 */
export async function bootstrapDatabase(): Promise<void> {
  logInfo('db.bootstrap', 'tentative de connexion HFSQL');
  try {
    await getPool();
    console.log('[db] Connexion HFSQL établie.');
    logInfo('db.bootstrap', 'Connexion HFSQL établie.');
  } catch (err) {
    console.error('[db] Connexion HFSQL impossible :', (err as Error).message);
    logError('db.bootstrap', err);
  }
}
