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
  ExerciceInput,
  Compte,
  CompteInput,
  Journal,
  JournalInput,
  Tiers,
  TiersInput,
  User,
  UserCreateInput,
  UserUpdateInput,
  UpdateReadyPayload,
  UpdateProgressPayload,
  StatutEcriture,
  EcritureLigne,
  Ecriture,
  EcritureListItem,
  EcritureAvecLignes,
  LigneInput,
  EcritureInput,
  Mouvement,
  LigneBalance,
  SoldeCompte,
  MouvementGL,
  Resultat,
  LigneEcheance,
  LigneLettrable,
  CaMensuel,
} from '../types/domain';

// --- Imports locaux pour construire IPC et Api ---
import type { IpcResult } from '../types/ipc';
import type {
  AuthUser,
  UpdateReadyPayload,
  UpdateProgressPayload,
  Societe,
  SocieteInput,
  Magasin,
  MagasinInput,
  Exercice,
  ExerciceInput,
  Compte,
  CompteInput,
  Journal,
  JournalInput,
  Tiers,
  TiersInput,
  User,
  UserCreateInput,
  UserUpdateInput,
  EcritureListItem,
  EcritureAvecLignes,
  EcritureInput,
  LigneBalance,
  MouvementGL,
  Resultat,
  LigneEcheance,
  LigneLettrable,
  CaMensuel,
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
  /** main → renderer : progression du téléchargement de la mise à jour. */
  updateProgress: 'update:progress',
  societesList: 'societes:list',
  societesCreate: 'societes:create',
  societesUpdate: 'societes:update',
  societesDelete: 'societes:delete',
  magasinsList: 'magasins:list',
  magasinsCreate: 'magasins:create',
  magasinsUpdate: 'magasins:update',
  magasinsDelete: 'magasins:delete',
  exercicesList: 'exercices:list',
  exercicesCreate: 'exercices:create',
  exercicesUpdate: 'exercices:update',
  exercicesClose: 'exercices:close',
  exercicesReopen: 'exercices:reopen',
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
  usersList: 'users:list',
  usersCreate: 'users:create',
  usersUpdate: 'users:update',
  usersSetPassword: 'users:set-password',
  usersDelete: 'users:delete',
  ecrituresList: 'ecritures:list',
  ecrituresGet: 'ecritures:get',
  ecrituresCreate: 'ecritures:create',
  ecrituresUpdate: 'ecritures:update',
  ecrituresValidate: 'ecritures:validate',
  ecrituresInvalidate: 'ecritures:invalidate',
  ecrituresReverse: 'ecritures:reverse',
  ecrituresDelete: 'ecritures:delete',
  reportingBalance: 'reporting:balance',
  reportingGrandLivre: 'reporting:grand-livre',
  reportingResultat: 'reporting:resultat',
  reportingEcheancier: 'reporting:echeancier',
  reportingCaMensuel: 'reporting:ca-mensuel',
  consolidationBalance: 'consolidation:balance',
  consolidationResultat: 'consolidation:resultat',
  lettrageListeLignes: 'lettrage:lignes',
  lettrageLettrer: 'lettrage:lettrer',
  lettrageDelettrer: 'lettrage:delettrer',
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
    /**
     * S'abonne à la progression du téléchargement. Renvoie une fonction de
     * désabonnement à appeler au démontage.
     */
    onProgress(callback: (payload: UpdateProgressPayload) => void): () => void;
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
    create(magasinId: number, input: ExerciceInput): Promise<IpcResult<Exercice>>;
    update(id: number, input: ExerciceInput): Promise<IpcResult<Exercice>>;
    close(id: number): Promise<IpcResult<null>>;
    reopen(id: number): Promise<IpcResult<null>>;
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
  users: {
    list(): Promise<IpcResult<User[]>>;
    create(input: UserCreateInput): Promise<IpcResult<User>>;
    update(id: number, input: UserUpdateInput): Promise<IpcResult<User>>;
    setPassword(id: number, password: string): Promise<IpcResult<null>>;
    delete(id: number): Promise<IpcResult<null>>;
  };
  ecritures: {
    list(magasinId: number): Promise<IpcResult<EcritureListItem[]>>;
    get(id: number): Promise<IpcResult<EcritureAvecLignes>>;
    create(magasinId: number, input: EcritureInput): Promise<IpcResult<EcritureAvecLignes>>;
    update(id: number, input: EcritureInput): Promise<IpcResult<EcritureAvecLignes>>;
    validate(id: number): Promise<IpcResult<EcritureAvecLignes>>;
    invalidate(id: number): Promise<IpcResult<null>>;
    reverse(id: number): Promise<IpcResult<EcritureAvecLignes>>;
    delete(id: number): Promise<IpcResult<null>>;
  };
  reporting: {
    balance(magasinId: number): Promise<IpcResult<LigneBalance[]>>;
    grandLivre(magasinId: number, filtre: { compte?: string; tiers?: string }): Promise<IpcResult<MouvementGL[]>>;
    resultat(magasinId: number): Promise<IpcResult<Resultat>>;
    echeancier(magasinId: number): Promise<IpcResult<LigneEcheance[]>>;
    caMensuel(magasinId: number): Promise<IpcResult<CaMensuel[]>>;
  };
  consolidation: {
    balance(societeId: number, dateDebut: string, dateFin: string): Promise<IpcResult<LigneBalance[]>>;
    resultat(societeId: number, dateDebut: string, dateFin: string): Promise<IpcResult<Resultat>>;
  };
  lettrage: {
    lignes(magasinId: number, compte: string, tiers?: string): Promise<IpcResult<LigneLettrable[]>>;
    lettrer(ligneIds: number[], code?: string): Promise<IpcResult<string>>;
    delettrer(ligneIds: number[]): Promise<IpcResult<null>>;
  };
}
