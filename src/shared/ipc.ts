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

/** Charge utile de l'événement « mise à jour téléchargée » (main → renderer). */
export interface UpdateReadyPayload {
  version: string;
}

/** Noms des canaux IPC (`<module>:<action>`). */
export const IPC = {
  authLogin: 'auth:login',
  authLogout: 'auth:logout',
  authMe: 'auth:me',
  /** renderer → main : applique la mise à jour téléchargée et redémarre. */
  updateInstall: 'update:install',
  /** main → renderer : une mise à jour est téléchargée et prête à installer. */
  updateReady: 'update:ready',
} as const;

/** Surface exposée au renderer via `window.api` (contextBridge). */
export interface Api {
  auth: {
    login(username: string, password: string): Promise<IpcResult<AuthUser>>;
    logout(): Promise<IpcResult<null>>;
    me(): Promise<IpcResult<AuthUser | null>>;
  };
  updates: {
    /** Applique la mise à jour téléchargée et redémarre l'application. */
    install(): Promise<IpcResult<null>>;
    /**
     * S'abonne à l'événement « mise à jour prête ». Renvoie une fonction de
     * désabonnement à appeler au démontage.
     */
    onReady(callback: (payload: UpdateReadyPayload) => void): () => void;
  };
}
