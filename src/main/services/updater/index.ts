import type { BrowserWindow } from 'electron';
import { autoUpdater } from 'electron-updater';
import { IPC, type UpdateReadyPayload } from '../../../shared/ipc';
import { logError } from '../../logger';

/**
 * Service de mise à jour automatique (processus principal uniquement).
 * Vérifie un flux `generic` (serveur HTTP/S3) au démarrage, télécharge en arrière-plan,
 * puis notifie le renderer quand une mise à jour est prête à installer.
 * L'URL du flux est lue depuis `.env` (`UPDATE_FEED_URL`) — configurable sans rebuild.
 */

let targetWindow: BrowserWindow | null = null;

/**
 * Initialise et lance la vérification des mises à jour.
 * À n'appeler qu'en version packagée (electron-updater lève en dev).
 */
export function init(win: BrowserWindow): void {
  const url = process.env.UPDATE_FEED_URL;
  if (!url) {
    console.warn('[updater] UPDATE_FEED_URL absent — mises à jour désactivées.');
    return;
  }

  targetWindow = win;

  // Téléchargement auto en arrière-plan ; installation différée au prochain quit
  // si l'utilisateur ne redémarre pas tout de suite.
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.setFeedURL({ provider: 'generic', url });

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
