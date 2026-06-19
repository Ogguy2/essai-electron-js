/**
 * Résolution de l'emplacement de la base SQLite (processus principal).
 *
 * Priorité :
 *   1. `SQLITE_PATH` (variable d'env) — utile en dev et pour les scripts `db:*`,
 *      afin que l'app et les seeders pointent vers le MÊME fichier.
 *   2. App packagée → dossier `userData` de l'utilisateur (stockage durable).
 *   3. Dev (non packagée) → `.data/sicocompte.db` à la racine du projet.
 *
 * Aucun identifiant à exposer : SQLite est un simple fichier local.
 */
import { app } from 'electron';
import * as path from 'node:path';

export function resolveDbPath(): string {
  if (process.env.SQLITE_PATH) return process.env.SQLITE_PATH;
  try {
    if (app?.isPackaged) return path.join(app.getPath('userData'), 'sicocompte.db');
  } catch {
    /* `app` indisponible (contexte hors Electron) → repli dev ci-dessous */
  }
  return path.join(process.cwd(), '.data', 'sicocompte.db');
}
