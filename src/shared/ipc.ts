/**
 * Contrat IPC partagé entre le processus principal (`main`), le `preload` et le
 * `renderer`. Source unique de vérité des canaux et des types d'échange.
 * Cf. CDC §5.5 (contrats IPC typés + enveloppe de réponse normalisée).
 */

export interface IpcError {
  code: string;
  message: string;
}

/** Enveloppe normalisée de toute réponse IPC. */
export type IpcResult<T> =
  | { success: true; data: T }
  | { success: false; error: IpcError };

export type Role = 'Admin' | 'Comptable';

/** Utilisateur authentifié (jamais de mot de passe / hash côté renderer). */
export interface AuthUser {
  name: string;
  username: string;
  email: string | null;
  role: Role;
}

/** Noms des canaux IPC (`<module>:<action>`). */
export const IPC = {
  authLogin: 'auth:login',
  authLogout: 'auth:logout',
  authMe: 'auth:me',
} as const;

/** Surface exposée au renderer via `window.api` (contextBridge). */
export interface Api {
  auth: {
    login(username: string, password: string): Promise<IpcResult<AuthUser>>;
    logout(): Promise<IpcResult<null>>;
    me(): Promise<IpcResult<AuthUser | null>>;
  };
}
