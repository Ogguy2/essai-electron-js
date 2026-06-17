# Spec — Mises à jour automatiques de SicoCompte

**Date** : 2026-06-17
**Statut** : validé (design)
**Contexte** : SicoCompte est packagé en installeur NSIS via electron-builder en mode
`--prepackaged` (le build de l'app reste géré par Electron Forge + Vite). electron-builder
génère déjà `Setup.exe` + `.blockmap`, compatibles avec `electron-updater`.

## Objectif

Permettre aux postes clients de récupérer et d'installer les nouvelles versions de
SicoCompte depuis un **serveur web/Cloud (HTTP/S3)** contrôlé par l'éditeur, avec une
**notification utilisateur** et une **installation au redémarrage** (l'utilisateur garde le
contrôle du moment du redémarrage — important pour une app de comptabilité).

## Décisions

- **Mécanisme** : `electron-updater` (provider `generic`).
- **Hébergement** : serveur HTTP/S3 ; les 3 artefacts (`Setup.exe`, `.blockmap`,
  `latest.yml`) y sont déposés à chaque version.
- **UX** : vérif auto au démarrage → téléchargement silencieux → toast « Mise à jour prête
  — Redémarrer maintenant / Plus tard ». Pas de bouton manuel (YAGNI).
- **URL du flux configurable sans rebuild** : lue depuis `.env` (`UPDATE_FEED_URL`),
  fixée par programme via `autoUpdater.setFeedURL(...)`. On ne dépend pas de
  `app-update.yml` (non injecté en mode `--prepackaged`).
- **Pas de signature de code** requise pour le fonctionnement (intégrité via sha512 du
  `latest.yml`). Signature Authenticode = amélioration future (alertes SmartScreen).

## Architecture

Respecte la règle d'or du projet : **seul le `main` pilote la mise à jour** ; le renderer
se contente d'afficher la notif et de relayer l'action utilisateur via le pont IPC existant.

```
[main] updater.ts ──(events autoUpdater)──┐
   │  checkForUpdates / quitAndInstall      │
   │                                        ▼
   │                              webContents.send('update:ready', {version})
   ▼                                        │
[preload] window.api.onUpdateReady(cb) ◀────┘
[preload] window.api.installUpdate() ──invoke('update:install')──▶ [main] quitAndInstall
   ▲
[renderer] toast sonner « Redémarrer maintenant / Plus tard »
```

## Flux runtime

1. `app.ready` → si `app.isPackaged`, `updater.init(mainWindow)` :
   `autoUpdater.setFeedURL({ provider: 'generic', url: process.env.UPDATE_FEED_URL })`
   puis `autoUpdater.checkForUpdates()`.
2. `update-available` → téléchargement silencieux (`autoDownload: true`).
3. `update-downloaded` → `webContents.send(IPC.updateReady, { version })`.
4. Renderer : toast `sonner` persistant avec 2 actions :
   - **Redémarrer maintenant** → `window.api.installUpdate()` → `quitAndInstall()`.
   - **Plus tard** → ferme le toast ; la MAJ s'installe à la prochaine fermeture
     (`autoInstallOnAppQuit: true`, défaut).
5. `error` → `console.error` côté main (log), aucun pop-up bloquant. Un échec réseau ne
   doit jamais bloquer le démarrage de l'app.

## Contrat IPC (suit le patron `IpcResult<T>` du projet)

Ajouts dans `src/shared/ipc.ts` :

- **Canal `update:install`** (renderer → main, `invoke`) : déclenche `quitAndInstall()`.
  Retourne `IpcResult<void>` (en pratique le process se ferme).
- **Canal `update:ready`** (main → renderer, `webContents.send`) : payload
  `{ version: string }`. N'utilise pas `IpcResult` (push événementiel, pas une requête).
- Ajouts à l'interface `Api` : `installUpdate(): Promise<IpcResult<void>>` et
  `onUpdateReady(cb: (p: { version: string }) => void): () => void` (retourne une fonction
  de désabonnement).

## Composants / fichiers

| Fichier | Changement |
|---|---|
| `package.json` | dépendance runtime `electron-updater` |
| `vite.main.config.ts` | `electron-updater` en `external` (non bundlé, chargé depuis node_modules au runtime, comme `odbc`) |
| `electron-builder.yml` | bloc `publish: { provider: generic, url }` → fait générer `latest.yml` |
| `.env.example` | `UPDATE_FEED_URL=` (+ doc) |
| `src/main/services/updater.ts` | **nouveau** — `init(win)`, abonnements aux events autoUpdater, `install()` |
| `src/main.ts` | appelle `updater.init(mainWindow)` au `app.ready` si `app.isPackaged` |
| `src/shared/ipc.ts` | noms de canaux + types + ajouts à `Api` |
| `src/preload.ts` | expose `installUpdate` / `onUpdateReady` |
| `src/main/ipc.ts` | `ipcMain.handle(IPC.updateInstall, …)` |
| renderer (ex. `src/App.tsx` ou petit hook) | `onUpdateReady` → toast sonner |

## Découpage / responsabilités

- `updater.ts` : **un seul rôle** — orchestrer `autoUpdater` (config feed, events, install).
  Ne connaît pas l'UI ; il pousse juste un event IPC. Dépend de `electron`/`electron-updater`
  et de `IPC`/`mainWindow`.
- Le renderer ne connaît pas `electron-updater` ; il ne voit que `window.api`.

## Hors périmètre (YAGNI)

- Bouton « Vérifier les mises à jour » manuel.
- Canaux de pré-version (beta/stable), rollback, mises à jour delta forcées.
- Signature de code Authenticode (amélioration future, non bloquante).
- Publication automatisée (`electron-builder --publish`) : le dépôt des 3 fichiers sur le
  serveur reste manuel pour l'instant (peut être automatisé plus tard).

## Critères de réussite

1. Build inchangé : `npm run make:nsis` produit `Setup.exe`, `.blockmap` **et** `latest.yml`.
2. En version packagée pointant vers un `UPDATE_FEED_URL` valide servant une version
   supérieure, l'app télécharge la MAJ et affiche le toast.
3. « Redémarrer maintenant » applique la MAJ ; « Plus tard » la diffère à la fermeture.
4. Sans réseau / URL invalide, l'app démarre normalement (erreur loggée, pas de blocage).
5. En dev (`npm start`, non packagé), aucun appel updater n'est tenté (pas d'erreur).
