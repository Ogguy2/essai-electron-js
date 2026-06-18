import { ipcMain } from 'electron';
import { IPC, type AuthUser, type IpcResult, type Societe, type Magasin, type Exercice, type SocieteInput, type MagasinInput, type Compte, type CompteInput, type Journal, type JournalInput } from '../shared/ipc';
import * as comptes from './services/comptes';
import * as journaux from './services/journaux';
import { authenticate, logout, currentSession } from './services/auth';
import { install as installUpdate } from './services/updater';
import { logError } from './logger';
import * as societes from './services/societes';
import * as magasins from './services/magasins';
import * as exercices from './services/exercices';
import { AppError } from './services/common/errors';

/** Exécute une action et renvoie un IpcResult, en mappant AppError -> code. */
async function wrap<T>(action: () => Promise<T>, channel: string): Promise<IpcResult<T>> {
  try {
    return { success: true, data: await action() };
  } catch (err) {
    if (err instanceof AppError) {
      return { success: false, error: { code: err.code, message: err.message } };
    }
    console.error(`[ipc] ${channel} :`, (err as Error).message);
    logError(`ipc.${channel}`, err);
    return { success: false, error: { code: 'DB_ERROR', message: 'Opération impossible. Réessayez.' } };
  }
}

/**
 * Enregistre tous les handlers IPC du processus principal.
 * Chaque handler renvoie l'enveloppe normalisée `IpcResult<T>` (cf. CDC §5.5).
 * Au fur et à mesure des modules, on ajoutera ici les canaux correspondants.
 */
export function registerIpcHandlers(): void {
  ipcMain.handle(
    IPC.authLogin,
    async (_event, username: string, password: string): Promise<IpcResult<AuthUser>> => {
      try {
        const user = await authenticate(username, password);
        if (!user) {
          return {
            success: false,
            error: { code: 'AUTH_INVALID', message: 'Identifiants incorrects. Réessayez.' },
          };
        }
        return { success: true, data: user };
      } catch (err) {
        console.error('[auth] échec login :', (err as Error).message);
        logError('ipc.auth:login', err);
        return {
          success: false,
          error: { code: 'AUTH_ERROR', message: 'Base indisponible. Réessayez.' },
        };
      }
    },
  );

  ipcMain.handle(IPC.authLogout, (): IpcResult<null> => {
    logout();
    return { success: true, data: null };
  });

  ipcMain.handle(IPC.authMe, (): IpcResult<AuthUser | null> => {
    return { success: true, data: currentSession() };
  });

  // Applique la mise à jour téléchargée puis redémarre (le process se ferme aussitôt).
  ipcMain.handle(IPC.updateInstall, (): IpcResult<null> => {
    installUpdate();
    return { success: true, data: null };
  });

  ipcMain.handle(IPC.societesList, () => wrap<Societe[]>(() => societes.list(), 'societes:list'));
  ipcMain.handle(IPC.societesCreate, (_e, input: SocieteInput) =>
    wrap<Societe>(() => societes.create(input), 'societes:create'));
  ipcMain.handle(IPC.societesUpdate, (_e, id: number, input: SocieteInput) =>
    wrap<Societe>(() => societes.update(id, input), 'societes:update'));
  ipcMain.handle(IPC.societesDelete, (_e, id: number) =>
    wrap<null>(async () => { await societes.remove(id); return null; }, 'societes:delete'));

  ipcMain.handle(IPC.magasinsList, () => wrap<Magasin[]>(() => magasins.list(), 'magasins:list'));
  ipcMain.handle(IPC.magasinsCreate, (_e, input: MagasinInput) =>
    wrap<Magasin>(() => magasins.create(input), 'magasins:create'));
  ipcMain.handle(IPC.magasinsUpdate, (_e, id: number, input: MagasinInput) =>
    wrap<Magasin>(() => magasins.update(id, input), 'magasins:update'));
  ipcMain.handle(IPC.magasinsDelete, (_e, id: number) =>
    wrap<null>(async () => { await magasins.remove(id); return null; }, 'magasins:delete'));

  ipcMain.handle(IPC.exercicesList, (_e, magasinId: number) =>
    wrap<Exercice[]>(() => exercices.list(magasinId), 'exercices:list'));

  ipcMain.handle(IPC.comptesList, (_e, magasinId: number) =>
    wrap<Compte[]>(() => comptes.list(magasinId), 'comptes:list'));
  ipcMain.handle(IPC.comptesCreate, (_e, magasinId: number, input: CompteInput) =>
    wrap<Compte>(() => comptes.create(magasinId, input), 'comptes:create'));
  ipcMain.handle(IPC.comptesUpdate, (_e, id: number, input: CompteInput) =>
    wrap<Compte>(() => comptes.update(id, input), 'comptes:update'));
  ipcMain.handle(IPC.comptesDelete, (_e, id: number) =>
    wrap<null>(async () => { await comptes.remove(id); return null; }, 'comptes:delete'));

  ipcMain.handle(IPC.journauxList, (_e, magasinId: number) =>
    wrap<Journal[]>(() => journaux.list(magasinId), 'journaux:list'));
  ipcMain.handle(IPC.journauxCreate, (_e, magasinId: number, input: JournalInput) =>
    wrap<Journal>(() => journaux.create(magasinId, input), 'journaux:create'));
  ipcMain.handle(IPC.journauxUpdate, (_e, id: number, input: JournalInput) =>
    wrap<Journal>(() => journaux.update(id, input), 'journaux:update'));
  ipcMain.handle(IPC.journauxDelete, (_e, id: number) =>
    wrap<null>(async () => { await journaux.remove(id); return null; }, 'journaux:delete'));
}
