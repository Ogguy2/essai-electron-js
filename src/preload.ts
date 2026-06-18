import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import { IPC, type Api, type UpdateReadyPayload } from './shared/ipc';

// Pont sécurisé renderer ↔ main. Le renderer n'a accès qu'à cette surface
// typée (jamais à Node, ni à ipcRenderer directement). Cf. CDC §5.2.
const api: Api = {
  auth: {
    login: (username, password) => ipcRenderer.invoke(IPC.authLogin, username, password),
    logout: () => ipcRenderer.invoke(IPC.authLogout),
    me: () => ipcRenderer.invoke(IPC.authMe),
  },
  updates: {
    install: () => ipcRenderer.invoke(IPC.updateInstall),
    onReady: (callback) => {
      const listener = (_event: IpcRendererEvent, payload: UpdateReadyPayload) =>
        callback(payload);
      ipcRenderer.on(IPC.updateReady, listener);
      return () => ipcRenderer.removeListener(IPC.updateReady, listener);
    },
  },
  societes: {
    list: () => ipcRenderer.invoke(IPC.societesList),
    create: (input) => ipcRenderer.invoke(IPC.societesCreate, input),
    update: (id, input) => ipcRenderer.invoke(IPC.societesUpdate, id, input),
    delete: (id) => ipcRenderer.invoke(IPC.societesDelete, id),
  },
  magasins: {
    list: () => ipcRenderer.invoke(IPC.magasinsList),
    create: (input) => ipcRenderer.invoke(IPC.magasinsCreate, input),
    update: (id, input) => ipcRenderer.invoke(IPC.magasinsUpdate, id, input),
    delete: (id) => ipcRenderer.invoke(IPC.magasinsDelete, id),
  },
  exercices: {
    list: (magasinId) => ipcRenderer.invoke(IPC.exercicesList, magasinId),
    create: (magasinId, input) => ipcRenderer.invoke(IPC.exercicesCreate, magasinId, input),
    update: (id, input) => ipcRenderer.invoke(IPC.exercicesUpdate, id, input),
    close: (id) => ipcRenderer.invoke(IPC.exercicesClose, id),
    reopen: (id) => ipcRenderer.invoke(IPC.exercicesReopen, id),
  },
  comptes: {
    list: (magasinId) => ipcRenderer.invoke(IPC.comptesList, magasinId),
    create: (magasinId, input) => ipcRenderer.invoke(IPC.comptesCreate, magasinId, input),
    update: (id, input) => ipcRenderer.invoke(IPC.comptesUpdate, id, input),
    delete: (id) => ipcRenderer.invoke(IPC.comptesDelete, id),
  },
  journaux: {
    list: (magasinId) => ipcRenderer.invoke(IPC.journauxList, magasinId),
    create: (magasinId, input) => ipcRenderer.invoke(IPC.journauxCreate, magasinId, input),
    update: (id, input) => ipcRenderer.invoke(IPC.journauxUpdate, id, input),
    delete: (id) => ipcRenderer.invoke(IPC.journauxDelete, id),
  },
  tiers: {
    list: (magasinId) => ipcRenderer.invoke(IPC.tiersList, magasinId),
    create: (magasinId, input) => ipcRenderer.invoke(IPC.tiersCreate, magasinId, input),
    update: (id, input) => ipcRenderer.invoke(IPC.tiersUpdate, id, input),
    delete: (id) => ipcRenderer.invoke(IPC.tiersDelete, id),
  },
  users: {
    list: () => ipcRenderer.invoke(IPC.usersList),
    create: (input) => ipcRenderer.invoke(IPC.usersCreate, input),
    update: (id, input) => ipcRenderer.invoke(IPC.usersUpdate, id, input),
    setPassword: (id, password) => ipcRenderer.invoke(IPC.usersSetPassword, id, password),
    delete: (id) => ipcRenderer.invoke(IPC.usersDelete, id),
  },
  ecritures: {
    list: (magasinId) => ipcRenderer.invoke(IPC.ecrituresList, magasinId),
    get: (id) => ipcRenderer.invoke(IPC.ecrituresGet, id),
    create: (magasinId, input) => ipcRenderer.invoke(IPC.ecrituresCreate, magasinId, input),
    update: (id, input) => ipcRenderer.invoke(IPC.ecrituresUpdate, id, input),
    validate: (id) => ipcRenderer.invoke(IPC.ecrituresValidate, id),
    invalidate: (id) => ipcRenderer.invoke(IPC.ecrituresInvalidate, id),
    reverse: (id) => ipcRenderer.invoke(IPC.ecrituresReverse, id),
    delete: (id) => ipcRenderer.invoke(IPC.ecrituresDelete, id),
  },
  reporting: {
    balance: (magasinId) => ipcRenderer.invoke(IPC.reportingBalance, magasinId),
    grandLivre: (magasinId, filtre) => ipcRenderer.invoke(IPC.reportingGrandLivre, magasinId, filtre),
    resultat: (magasinId) => ipcRenderer.invoke(IPC.reportingResultat, magasinId),
    echeancier: (magasinId) => ipcRenderer.invoke(IPC.reportingEcheancier, magasinId),
  },
  consolidation: {
    balance: (societeId, dateDebut, dateFin) => ipcRenderer.invoke(IPC.consolidationBalance, societeId, dateDebut, dateFin),
    resultat: (societeId, dateDebut, dateFin) => ipcRenderer.invoke(IPC.consolidationResultat, societeId, dateDebut, dateFin),
  },
  lettrage: {
    lignes: (magasinId, compte, tiers) => ipcRenderer.invoke(IPC.lettrageListeLignes, magasinId, compte, tiers),
    lettrer: (ligneIds, code) => ipcRenderer.invoke(IPC.lettrageLettrer, ligneIds, code),
    delettrer: (ligneIds) => ipcRenderer.invoke(IPC.lettrageDelettrer, ligneIds),
  },
};

contextBridge.exposeInMainWorld('api', api);
