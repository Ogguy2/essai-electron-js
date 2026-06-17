import { ipcMain } from 'electron';
import { IPC, type AuthUser, type IpcResult } from '../shared/ipc';
import { authenticate, logout, currentSession } from './services/auth';

/**
 * Enregistre tous les handlers IPC du processus principal.
 * Chaque handler renvoie l'enveloppe normalisée `IpcResult<T>` (cf. CDC §5.5).
 * Au fur et à mesure des modules, on ajoutera ici les canaux correspondants.
 */
export function registerIpcHandlers(): void {
  ipcMain.handle(
    IPC.authLogin,
    (_event, username: string, password: string): IpcResult<AuthUser> => {
      const user = authenticate(username, password);
      if (!user) {
        return {
          success: false,
          error: { code: 'AUTH_INVALID', message: 'Identifiants incorrects. Réessayez.' },
        };
      }
      return { success: true, data: user };
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
