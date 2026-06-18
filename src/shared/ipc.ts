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

export interface Societe {
  id: number;
  raison_sociale: string;
  rccm: string;
  adresse: string;
  telephone: string;
}
export type SocieteInput = Omit<Societe, 'id'>;

export interface Magasin {
  id: number;
  libelle: string;
  societe_id: number;
}
export type MagasinInput = Omit<Magasin, 'id'>;

export interface Exercice {
  id: number;
  magasin_id: number;
  libelle: string;
  date_debut: string;
  date_fin: string;
  statut: 'ouvert' | 'cloture';
}

export interface Compte {
  id: number;
  magasin_id: number;
  numero: string;
  libelle: string;
  classe: number;
  collectif: boolean;
  lettrable: boolean;
}
export type CompteInput = Omit<Compte, 'id' | 'magasin_id'>;

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
  societesList: 'societes:list',
  societesCreate: 'societes:create',
  societesUpdate: 'societes:update',
  societesDelete: 'societes:delete',
  magasinsList: 'magasins:list',
  magasinsCreate: 'magasins:create',
  magasinsUpdate: 'magasins:update',
  magasinsDelete: 'magasins:delete',
  exercicesList: 'exercices:list',
  comptesList: 'comptes:list',
  comptesCreate: 'comptes:create',
  comptesUpdate: 'comptes:update',
  comptesDelete: 'comptes:delete',
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
  societes: {
    list(): Promise<IpcResult<Societe[]>>;
    create(input: SocieteInput): Promise<IpcResult<Societe>>;
    update(id: number, input: SocieteInput): Promise<IpcResult<Societe>>;
    delete(id: number): Promise<IpcResult<null>>;
  };
  magasins: {
    list(): Promise<IpcResult<Magasin[]>>;
    create(input: MagasinInput): Promise<IpcResult<Magasin>>;
    update(id: number, input: MagasinInput): Promise<IpcResult<Magasin>>;
    delete(id: number): Promise<IpcResult<null>>;
  };
  exercices: {
    list(magasinId: number): Promise<IpcResult<Exercice[]>>;
  };
  comptes: {
    list(magasinId: number): Promise<IpcResult<Compte[]>>;
    create(magasinId: number, input: CompteInput): Promise<IpcResult<Compte>>;
    update(id: number, input: CompteInput): Promise<IpcResult<Compte>>;
    delete(id: number): Promise<IpcResult<null>>;
  };
}
