import { contextBridge, ipcRenderer } from 'electron';
import { IPC, type Api } from './shared/ipc';

// Pont sécurisé renderer ↔ main. Le renderer n'a accès qu'à cette surface
// typée (jamais à Node, ni à ipcRenderer directement). Cf. CDC §5.2.
const api: Api = {
  auth: {
    login: (username, password) => ipcRenderer.invoke(IPC.authLogin, username, password),
    logout: () => ipcRenderer.invoke(IPC.authLogout),
    me: () => ipcRenderer.invoke(IPC.authMe),
  },
};

contextBridge.exposeInMainWorld('api', api);
