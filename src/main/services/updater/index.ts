import type { BrowserWindow } from 'electron';
import { autoUpdater } from 'electron-updater';
import { IPC, type UpdateReadyPayload } from '../../../shared/ipc';
import { logError } from '../../logger';

/**
 * Service de mise à jour automatique (processus principal uniquement).
 * Vérifie les releases GitHub au démarrage, télécharge en arrière-plan, puis
 * notifie le renderer quand une mise à jour est prête à installer.
 *
 * Par défaut : provider **github** (releases du dépôt public — détecte
 * automatiquement la dernière version, gère le renommage espaces→points des
 * assets, ne dépend d'aucun `.env`). Si `UPDATE_FEED_URL` est défini, on
 * bascule sur un flux `generic` (serveur HTTP/S3) — utile pour un hébergement
 * privé.
 */

// Dépôt GitHub hébergeant les releases (assets + latest.yml).
const GITHUB_OWNER = 'Ogguy2';
const GITHUB_REPO = 'essai-electron-js';

let targetWindow: BrowserWindow | null = null;

/**
 * Initialise et lance la vérification des mises à jour.
 * À n'appeler qu'en version packagée (electron-updater lève en dev).
 */
export function init(win: BrowserWindow): void {
  targetWindow = win;

  // Téléchargement auto en arrière-plan ; installation différée au prochain quit
  // si l'utilisateur ne redémarre pas tout de suite.
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  const url = process.env.UPDATE_FEED_URL;
  if (url) {
    autoUpdater.setFeedURL({ provider: 'generic', url });
  } else {
    autoUpdater.setFeedURL({ provider: 'github', owner: GITHUB_OWNER, repo: GITHUB_REPO });
  }

  autoUpdater.on('update-downloaded', (info) => {
    const payload: UpdateReadyPayload = { version: info.version };
    if (targetWindow && !targetWindow.isDestroyed()) {
      targetWindow.webContents.send(IPC.updateReady, payload);
    }
  });

  // Un échec (réseau, URL injoignable…) ne doit jamais bloquer l'application.
  autoUpdater.on('error', (err) => {
    console.error('[updater] erreur :', err.message);
    logError('updater.error', err);
  });

  autoUpdater.checkForUpdates().catch((err) => {
    console.error('[updater] checkForUpdates a échoué :', (err as Error).message);
    logError('updater.checkForUpdates', err);
  });
}

/** Applique la mise à jour téléchargée et redémarre l'application. */
export function install(): void {
  autoUpdater.quitAndInstall();
}
