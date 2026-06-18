/**
 * Contrat IPC partagé entre le processus principal (`main`), le `preload` et le
 * `renderer`. Source unique de vérité des canaux et des types d'échange.
 * Cf. CDC §5.5 (contrats IPC typés + enveloppe de réponse normalisée).
 *
 * Les types du domaine vivent dans `src/types/` et sont réexportés ici pour
 * que tous les imports existants `from '@/shared/ipc'` / `from '../shared/ipc'`
 * continuent de fonctionner sans modification.
 *
 * ⚠️ Imports relatifs obligatoires : ce fichier est consommé par `main` et
 * `preload` qui ne connaissent pas l'alias `@/`.
 */

// --- Réexports des types d'enveloppe IPC ---
export type { IpcError, IpcResult } from '../types/ipc';

// --- Réexports des types du domaine métier ---
export type {
  Role,
  AuthUser,
  Societe,
  SocieteInput,
  Magasin,
  MagasinInput,
  Exercice,
  Compte,
  CompteInput,
  Journal,
  JournalInput,
  Tiers,
  TiersInput,
  UpdateReadyPayload,
} from '../types/domain';

// --- Imports locaux pour construire IPC et Api ---
import type { IpcResult } from '../types/ipc';
import type {
  AuthUser,
  UpdateReadyPayload,
  Societe,
  SocieteInput,
  Magasin,
  MagasinInput,
  Exercice,
  Compte,
  CompteInput,
  Journal,
  JournalInput,
  Tiers,
  TiersInput,
} from '../types/domain';

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
  journauxList: 'journaux:list',
  journauxCreate: 'journaux:create',
  journauxUpdate: 'journaux:update',
  journauxDelete: 'journaux:delete',
  tiersList: 'tiers:list',
  tiersCreate: 'tiers:create',
  tiersUpdate: 'tiers:update',
  tiersDelete: 'tiers:delete',
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
  journaux: {
    list(magasinId: number): Promise<IpcResult<Journal[]>>;
    create(magasinId: number, input: JournalInput): Promise<IpcResult<Journal>>;
    update(id: number, input: JournalInput): Promise<IpcResult<Journal>>;
    delete(id: number): Promise<IpcResult<null>>;
  };
  tiers: {
    list(magasinId: number): Promise<IpcResult<Tiers[]>>;
    create(magasinId: number, input: TiersInput): Promise<IpcResult<Tiers>>;
    update(id: number, input: TiersInput): Promise<IpcResult<Tiers>>;
    delete(id: number): Promise<IpcResult<null>>;
  };
}
