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
};

contextBridge.exposeInMainWorld('api', api);
