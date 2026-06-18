import { ipcMain } from 'electron';
import { IPC, type AuthUser, type IpcResult } from '../shared/ipc';
import { authenticate, logout, currentSession } from './services/auth';
import { logError } from './logger';

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
}
