import { ipcMain } from 'electron';
import { IPC, type AuthUser, type IpcResult, type Societe, type Magasin, type Exercice, type ExerciceInput, type SocieteInput, type MagasinInput, type Compte, type CompteInput, type Journal, type JournalInput, type Tiers, type TiersInput, type User, type UserCreateInput, type UserUpdateInput, type EcritureListItem, type EcritureAvecLignes, type EcritureInput, type LigneBalance, type MouvementGL, type Resultat, type LigneEcheance, type LigneLettrable } from '../shared/ipc';
import * as comptes from './services/comptes';
import * as journaux from './services/journaux';
import * as tiers from './services/tiers';
import * as users from './services/users';
import * as ecritures from './services/ecritures';
import { authenticate, logout, currentSession } from './services/auth';
import { install as installUpdate } from './services/updater';
import { logError } from './logger';
import * as societes from './services/societes';
import * as magasins from './services/magasins';
import * as exercices from './services/exercices';
import { AppError } from './services/common/errors';
import * as reporting from './services/reporting';
import * as lettrage from './services/lettrage';

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
  ipcMain.handle(IPC.exercicesCreate, (_e, magasinId: number, input: ExerciceInput) =>
    wrap<Exercice>(() => exercices.create(magasinId, input), 'exercices:create'));
  ipcMain.handle(IPC.exercicesUpdate, (_e, id: number, input: ExerciceInput) =>
    wrap<Exercice>(() => exercices.update(id, input), 'exercices:update'));
  ipcMain.handle(IPC.exercicesClose, (_e, id: number) =>
    wrap<null>(async () => { await exercices.close(id); return null; }, 'exercices:close'));
  ipcMain.handle(IPC.exercicesReopen, (_e, id: number) =>
    wrap<null>(async () => { await exercices.reopen(id); return null; }, 'exercices:reopen'));

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

  ipcMain.handle(IPC.tiersList, (_e, magasinId: number) =>
    wrap<Tiers[]>(() => tiers.list(magasinId), 'tiers:list'));
  ipcMain.handle(IPC.tiersCreate, (_e, magasinId: number, input: TiersInput) =>
    wrap<Tiers>(() => tiers.create(magasinId, input), 'tiers:create'));
  ipcMain.handle(IPC.tiersUpdate, (_e, id: number, input: TiersInput) =>
    wrap<Tiers>(() => tiers.update(id, input), 'tiers:update'));
  ipcMain.handle(IPC.tiersDelete, (_e, id: number) =>
    wrap<null>(async () => { await tiers.remove(id); return null; }, 'tiers:delete'));

  ipcMain.handle(IPC.usersList, () =>
    wrap<User[]>(() => users.list(), 'users:list'));
  ipcMain.handle(IPC.usersCreate, (_e, input: UserCreateInput) =>
    wrap<User>(() => users.create(input), 'users:create'));
  ipcMain.handle(IPC.usersUpdate, (_e, id: number, input: UserUpdateInput) =>
    wrap<User>(() => users.update(id, input), 'users:update'));
  ipcMain.handle(IPC.usersSetPassword, (_e, id: number, password: string) =>
    wrap<null>(async () => { await users.setPassword(id, password); return null; }, 'users:set-password'));
  ipcMain.handle(IPC.usersDelete, (_e, id: number) =>
    wrap<null>(async () => { await users.remove(id); return null; }, 'users:delete'));

  ipcMain.handle(IPC.ecrituresList, (_e, magasinId: number) =>
    wrap<EcritureListItem[]>(() => ecritures.list(magasinId), 'ecritures:list'));
  ipcMain.handle(IPC.ecrituresGet, (_e, id: number) =>
    wrap<EcritureAvecLignes>(() => ecritures.get(id), 'ecritures:get'));
  ipcMain.handle(IPC.ecrituresCreate, (_e, magasinId: number, input: EcritureInput) =>
    wrap<EcritureAvecLignes>(() => ecritures.create(magasinId, input), 'ecritures:create'));
  ipcMain.handle(IPC.ecrituresUpdate, (_e, id: number, input: EcritureInput) =>
    wrap<EcritureAvecLignes>(() => ecritures.update(id, input), 'ecritures:update'));
  ipcMain.handle(IPC.ecrituresValidate, (_e, id: number) =>
    wrap<EcritureAvecLignes>(() => ecritures.validate(id), 'ecritures:validate'));
  ipcMain.handle(IPC.ecrituresInvalidate, (_e, id: number) =>
    wrap<null>(async () => { await ecritures.invalidate(id); return null; }, 'ecritures:invalidate'));
  ipcMain.handle(IPC.ecrituresReverse, (_e, id: number) =>
    wrap<EcritureAvecLignes>(() => ecritures.reverse(id), 'ecritures:reverse'));
  ipcMain.handle(IPC.ecrituresDelete, (_e, id: number) =>
    wrap<null>(async () => { await ecritures.remove(id); return null; }, 'ecritures:delete'));

  // Reporting
  ipcMain.handle(IPC.reportingBalance, (_e, magasinId: number) =>
    wrap<LigneBalance[]>(() => reporting.getBalance(magasinId), 'reporting:balance'));
  ipcMain.handle(IPC.reportingGrandLivre, (_e, magasinId: number, filtre: { compte?: string; tiers?: string }) =>
    wrap<MouvementGL[]>(() => reporting.getGrandLivre(magasinId, filtre), 'reporting:grand-livre'));
  ipcMain.handle(IPC.reportingResultat, (_e, magasinId: number) =>
    wrap<Resultat>(() => reporting.getResultat(magasinId), 'reporting:resultat'));
  ipcMain.handle(IPC.reportingEcheancier, (_e, magasinId: number) =>
    wrap<LigneEcheance[]>(() => reporting.getEcheancier(magasinId), 'reporting:echeancier'));

  // Consolidation
  ipcMain.handle(IPC.consolidationBalance, (_e, societeId: number, dateDebut: string, dateFin: string) =>
    wrap<LigneBalance[]>(() => reporting.getConsolidationBalance(societeId, dateDebut, dateFin), 'consolidation:balance'));
  ipcMain.handle(IPC.consolidationResultat, (_e, societeId: number, dateDebut: string, dateFin: string) =>
    wrap<Resultat>(() => reporting.getConsolidationResultat(societeId, dateDebut, dateFin), 'consolidation:resultat'));

  // Lettrage
  ipcMain.handle(IPC.lettrageListeLignes, (_e, magasinId: number, compte: string, tiers?: string) =>
    wrap<LigneLettrable[]>(() => lettrage.lignesLettrables(magasinId, compte, tiers), 'lettrage:lignes'));
  ipcMain.handle(IPC.lettrageLettrer, (_e, ligneIds: number[], code?: string) =>
    wrap<string>(() => lettrage.lettrer(ligneIds, code), 'lettrage:lettrer'));
  ipcMain.handle(IPC.lettrageDelettrer, (_e, ligneIds: number[]) =>
    wrap<null>(async () => { await lettrage.delettrer(ligneIds); return null; }, 'lettrage:delettrer'));
}
