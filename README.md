# SicoCompte

**SicoCompte** est une application **desktop** (Windows) de **gestion de comptabilité**
multi-sociétés / multi-supermarchés, conforme au référentiel **SYSCOHADA / OHADA**
(Côte d'Ivoire, devise **FCFA/XOF**).

L'application est **autonome** : interface, logique comptable et accès aux données sont
réunis dans un seul produit. Elle se connecte **directement** à une base **HFSQL** centrale
via **ODBC** — il n'y a ni API ni back-end intermédiaire.

---

## Sommaire

- [Pile technique](#pile-technique)
- [Architecture](#architecture)
- [Prérequis](#prérequis)
- [Démarrage rapide](#démarrage-rapide)
- [Configuration (.env)](#configuration-env)
- [Base de données HFSQL](#base-de-données-hfsql)
- [Scripts npm](#scripts-npm)
- [Construire l'installeur Windows](#construire-linstalleur-windows)
- [Mises à jour automatiques](#mises-à-jour-automatiques)
- [Structure du projet](#structure-du-projet)
- [Tests](#tests)

---

## Pile technique

| Domaine | Technologie |
|---|---|
| Runtime desktop | Electron |
| Langage | TypeScript (mode `strict`) |
| UI | React 19 + Tailwind CSS v4 + shadcn/ui (lucide-react) |
| Build | Electron Forge + Vite |
| Accès données | HFSQL via ODBC (`odbc`) |
| Installeur | NSIS (electron-builder) |
| Mises à jour | electron-updater (provider générique HTTP/S3) |
| Tests | Vitest |

## Architecture

Modèle Electron à **trois processus**, avec une **règle d'or** :
**seul le processus principal (`main`) accède à la base de données**.

- **`main` (Node.js)** — point d'entrée. Porte la couche d'accès ODBC (unique point de
  contact HFSQL), les services métier (un par module), la vérification des permissions
  (rôles `Admin` / `Comptable`) et le contexte société/magasin courant. Expose des handlers
  IPC nommés `"<module>:<action>"`.
- **`preload` (contextBridge)** — expose au renderer une API typée et restreinte
  (`window.api`) et relaie chaque appel en IPC. Aucun accès Node/DB ne fuit vers le renderer.
- **`renderer` (React)** — l'interface. Ne touche jamais la base : tout passe par l'API
  exposée par le preload.

Sécurité : `contextIsolation` activé, `nodeIntegration` désactivé, identifiants HFSQL
uniquement côté `main`, durcissement via les fuses Electron.

Le contrat IPC est partagé dans `src/shared/ipc.ts` (noms de canaux, enveloppe normalisée
`IpcResult<T>`, interface `Api`).

## Prérequis

- **Node.js** 18+ et npm
- **Windows** (cible de l'application et de l'installeur NSIS)
- Un **pilote ODBC HFSQL** installé (l'installeur de l'application propose de l'installer
  automatiquement s'il est absent ; voir plus bas)
- Accès à une **base HFSQL** (locale ou centrale)

## Démarrage rapide

```bash
# 1. Installer les dépendances
npm install

# 2. Configurer l'accès à la base
cp .env.example .env
#   puis renseigner les valeurs HFSQL_* dans .env

# 3. Lancer en développement (hot-reload)
npm start
```

> Au tout premier `npm start`, Electron télécharge son binaire (peut être long selon le
> réseau) ; les lancements suivants sont rapides.

**Comptes de démonstration** : `admin` / `siconex` (rôle Admin) ou `comptable` / `siconex`.

## Configuration (.env)

La connexion HFSQL est lue **uniquement par le processus principal**. Copier `.env.example`
en `.env` (déjà ignoré par git) et renseigner :

| Variable | Description |
|---|---|
| `HFSQL_DRIVER` | Nom du pilote ODBC tel qu'enregistré dans Windows (souvent `HFSQL`) |
| `HFSQL_HOST` | Hôte du serveur HFSQL |
| `HFSQL_PORT` | Port (par défaut `4900`) |
| `HFSQL_DATABASE` | Nom de la base |
| `HFSQL_USER` | Utilisateur |
| `HFSQL_PASSWORD` | Mot de passe |
| `UPDATE_FEED_URL` | (Optionnel) URL du serveur de mises à jour — laisser vide pour désactiver |

## Base de données HFSQL

Les tables sont créées **manuellement dans le Centre de contrôle HFSQL** à partir des
scripts SQL versionnés dans **`db/schema/*.sql`**. L'application **lit et écrit** seulement ;
elle ne gère pas de migrations programmatiques.

- Le plan comptable SYSCOHADA est pré-chargé à la **création d'un magasin**.
- Le nom `users` étant réservé sous HFSQL, la table des utilisateurs s'appelle **`app_users`**.
- Le pilote ODBC HFSQL ne supporte pas les requêtes paramétrées : les valeurs sont inlinées
  via un échappement anti-injection centralisé (`src/main/db/connection.ts`).

## Scripts npm

```bash
npm start            # Lance l'app en développement (Electron Forge + Vite, hot-reload)
npm run package      # Package l'app (sans installeur)
npm run make         # Construit les distribuables par défaut (Squirrel/ZIP)
npm run make:nsis    # Construit l'installeur NSIS classique (recommandé pour Windows)
npm run lint         # ESLint sur .ts/.tsx
npm run typecheck    # Vérification de types (tsc --noEmit)
npm test             # Tests Vitest (run unique)
npm run test:watch   # Tests en mode veille
```

> Vite/esbuild ne vérifie **pas** les types au build : lancer `npm run typecheck` en CI.

## Construire l'installeur Windows

L'installeur recommandé est un **assistant NSIS classique** (Bienvenue → choix du dossier →
installation dans `Program Files` → Terminer), produit par electron-builder à partir du
paquet généré par Forge :

```bash
npm run make:nsis
```

Sortie : `out/installer/SicoCompte Setup <version>.exe` (+ `.blockmap` et `latest.yml`).

### Pilote ODBC HFSQL embarqué

L'installeur embarque le pack du pilote ODBC HFSQL (`docs/ODBC25PACK090f.exe`). À
l'installation, il détecte si un pilote HFSQL est déjà présent et, le cas échéant, propose
de l'installer, avec un message de résultat (déjà présent / installé avec succès / erreur).

> ⚠️ Le pack ODBC (~75 Mo) **n'est pas versionné** dans le dépôt. Le placer manuellement
> dans `docs/ODBC25PACK090f.exe` avant de construire l'installeur.

## Mises à jour automatiques

Les mises à jour utilisent **electron-updater** avec un provider **générique** (serveur
HTTP/S3 que vous contrôlez).

**Côté serveur** : à chaque version, déposer les trois fichiers produits par `make:nsis` sur
le serveur de mises à jour :

- `SicoCompte Setup <version>.exe`
- `SicoCompte Setup <version>.exe.blockmap`
- `latest.yml`

**Côté client** : renseigner `UPDATE_FEED_URL` dans `.env` (URL se terminant par `/`).
En version packagée, l'application vérifie au démarrage, télécharge la mise à jour en
arrière-plan, puis affiche une notification **« Redémarrer maintenant / Plus tard »**.
L'utilisateur garde le contrôle du moment du redémarrage.

> Les vérifications de mise à jour ne sont actives qu'en **version packagée** (jamais en
> développement).

## Structure du projet

```
src/
  main.ts                 # Point d'entrée du processus principal
  preload.ts              # Pont contextBridge (window.api)
  renderer.tsx            # Point d'entrée de l'UI (monte <App>)
  App.tsx                 # Racine React (auth + notifications)
  shared/ipc.ts           # Contrat IPC partagé (canaux, types, Api)
  main/
    ipc.ts                # Enregistrement des handlers ipcMain
    db/                   # Couche d'accès ODBC HFSQL
    services/             # Services métier (auth, updater, …)
    logger.ts
  features/auth/          # Écran de connexion + splash
  components/             # UI (shadcn/ui dans components/ui, layout dans components/layout)
  lib/                    # Utilitaires, navigation, données de démo
db/schema/                # Scripts SQL de création des tables (HFSQL)
docs/                     # Spécifications et maquettes de référence
```

## Tests

Les tests utilisent **Vitest**. Convention : fichiers `*.test.ts(x)` sous `src/`,
environnement `node` par défaut (logique comptable / services). Pour tester des composants
React, basculer le fichier en `// @vitest-environment jsdom`.

```bash
npm test
```

---

© Siconex — usage interne.
