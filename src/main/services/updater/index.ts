import type { BrowserWindow } from 'electron';
import { autoUpdater } from 'electron-updater';
import { IPC, type UpdateReadyPayload, type UpdateProgressPayload } from '../../../shared/ipc';
import { logError } from '../../logger';

/**
 * Service de mise à jour automatique (processus principal uniquement).
 * Vérifie les releases GitHub au démarrage, télécharge en arrière-plan, puis
 * notifie le renderer quand une mise à jour est prête à installer.
 *
 * Par défaut : provider **github**, configuré via le fichier `app-update.yml`
 * généré dans les ressources du package (cf. hook `postPackage` de
 * `forge.config.ts`). Détecte automatiquement la dernière release du dépôt
 * public et gère le renommage espaces→points des assets — aucun `.env` requis.
 * Si `UPDATE_FEED_URL` est défini, on surcharge avec un flux `generic`
 * (serveur HTTP/S3) — utile pour un hébergement privé.
 */

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

  // Override optionnel pour un hébergement privé. Sinon, l'updater lit le
  // provider github depuis `resources/app-update.yml` (généré au packaging).
  const url = process.env.UPDATE_FEED_URL;
  if (url) {
    autoUpdater.setFeedURL({ provider: 'generic', url });
  }

  // Progression du téléchargement → barre de progression côté renderer.
  autoUpdater.on('download-progress', (p) => {
    const payload: UpdateProgressPayload = {
      percent: p.percent,
      transferred: p.transferred,
      total: p.total,
      bytesPerSecond: p.bytesPerSecond,
    };
    if (targetWindow && !targetWindow.isDestroyed()) {
      targetWindow.webContents.send(IPC.updateProgress, payload);
    }
  });

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
