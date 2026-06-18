# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Ce qu'est ce projet

**SicoCompte** — application **desktop Electron** (TypeScript) de **gestion de comptabilité** multi-sociétés / multi-supermarchés (référentiel **SYSCOHADA / OHADA**, Côte d'Ivoire, **FCFA/XOF**). L'application est **autonome** : interface, logique comptable et accès aux données dans un seul produit desktop. Elle se connecte **directement** à une base **HFSQL** centrale via **ODBC** — **il n'y a pas d'API, pas de back-end Laravel, pas de second SGBD**.

État actuel : **scaffold Electron Forge (template Vite + TypeScript)** uniquement (`src/main.ts`, `src/preload.ts`, `src/renderer.ts`, `index.html`). Le domaine comptable décrit dans `docs/` **reste à construire**.

> ⚠️ Le projet a connu un **pivot d'architecture le 2026-06-17** : on est passé d'une API REST Laravel + front Next.js + synchro HFSQL legacy → à cette app desktop Electron en accès HFSQL direct, base neuve. Certains documents peuvent contenir des références résiduelles à l'ancienne approche (`task.md` est largement obsolète). En cas de doute, **`docs/CAHIER_DES_CHARGES.md` §7 fait foi** sur ce qui a été retiré.

## La source de vérité, c'est `docs/`

Lire **avant** de coder une fonctionnalité métier :
- **`docs/CAHIER_DES_CHARGES.md`** — spec complète : modules, règles comptables, décisions (✅), points à valider (🆕/🟡/❓). Commencer par le bloc « pivot » en tête et le §7.
- **`docs/architecture.md`** — couches Electron, accès ODBC HFSQL, topologie multi-poste / base centrale, esquisses de code.
- **`docs/compte.json`** — plan comptable SYSCOHADA structuré, **source du seeder** (insertion à la création d'un magasin). `compte.md` = version lisible ; `fonctionnement-des-comptes.md` = détail par compte.
- **`docs/design/`** — **prototype d'UI de référence** (React 18 CDN + Babel, sans build ; ouvrir `index.html`). Définit le shell (sidebar par groupes + topbar avec sélecteurs magasin/exercice), les 13 modules, et le design system (`assets/theme.css`, composants `ui.jsx`, données mock `data.js`). À **porter** en TSX dans `src/` (données mock → API preload/IPC). ⏳ La librairie de composants retenue est **shadcn/ui** (Tailwind), en cours d'installation — ne pas porter l'UI avant que ce soit en place.

## Commandes

```bash
npm start            # Lance l'app en dev (Electron Forge + Vite, hot-reload)
npm run package      # Package l'app (sans installeur)
npm run make         # Construit les distribuables (Squirrel/Windows, ZIP, deb, rpm)
npm run publish      # Publie (makers/publishers de forge.config.ts)
npm run lint         # ESLint sur .ts/.tsx
npm run typecheck    # tsc --noEmit (Vite/esbuild ne typecheck PAS au build — lancer ceci en CI)
npm test             # Vitest (run unique) ; npm run test:watch pour le mode veille
```

**Tests** : **Vitest** installé. Convention : fichiers `*.test.ts(x)` sous `src/` ; environnement `node` par défaut (logique comptable / services), basculer un fichier en `// @vitest-environment jsdom` pour tester des composants React. Exemple à reprendre : `src/domain/ecriture.ts` (+ `ecriture.test.ts`) — règle d'équilibre de partie double.

Au **tout premier `npm start`**, Electron télécharge son binaire (réseau, peut être long) ; les lancements suivants sont rapides.

## Architecture (à respecter)

Modèle Electron à **trois processus**, avec une **règle d'or** : **seul le processus `main` touche la base de données**.

- **`src/main.ts` (processus principal, Node.js)** — point d'entrée. Doit porter : la **couche d'accès données ODBC** (unique point de contact HFSQL), les **services métier** (un par module : auth, societes, magasins, comptes, journaux, ecritures, lettrage, consolidation, reporting, audit), la **vérification des permissions** (rôles `Admin`/`Comptable`) et le **contexte société/magasin courant**. Expose des handlers IPC nommés `"<module>:<action>"` via `ipcMain.handle`.
- **`src/preload.ts` (contextBridge)** — expose au renderer une **API typée et restreinte** ; relaie chaque appel en IPC. **Aucun** accès Node/DB direct ne doit fuir vers le renderer.
- **`src/renderer.tsx` (UI, React)** — point d'entrée du renderer : monte `<App>` (`src/App.tsx`) dans `#root` via `createRoot`. **React** câblé (`@vitejs/plugin-react` + `@tailwindcss/vite` dans `vite.renderer.config.mts`, `index.html` charge `/src/renderer.tsx`). Ne touche **jamais** la base ; passe toujours par l'API exposée par le preload. Voir la section **UI** plus bas.

Contraintes de sécurité : `contextIsolation` activé, `nodeIntegration` désactivé ; identifiants HFSQL **uniquement** côté `main` (variables d'env / config locale), jamais dans le renderer. Requêtes ODBC **toujours paramétrées**.

### Pont IPC (preload ↔ main) — le patron à suivre
Contrat typé partagé dans **`src/shared/ipc.ts`** : noms de canaux (`IPC`), enveloppe normalisée **`IpcResult<T>`** (`{ success:true; data } | { success:false; error }`), et l'interface **`Api`** (surface de `window.api`). `src/global.d.ts` déclare `window.api: Api`.
- **`src/preload.ts`** expose `window.api` via `contextBridge`, chaque méthode relayant en `ipcRenderer.invoke(IPC.xxx, …)`. Le renderer n'a accès qu'à cette surface.
- **`src/main/ipc.ts`** (`registerIpcHandlers()`, appelé au `app.ready`) enregistre les `ipcMain.handle(IPC.xxx, …)` et renvoie toujours un `IpcResult<T>`.
- **`src/main/services/*`** porte la logique (ex. `auth.ts`) — c'est là que vivra l'accès HFSQL.
- **Ajouter un canal** : 1) déclarer le nom + les types dans `shared/ipc.ts` (et l'ajouter à `Api`) ; 2) l'exposer dans `preload.ts` ; 3) l'implémenter dans un service + le brancher dans `main/ipc.ts`.
- ⚠️ **Imports dans `main`/`preload`** : utiliser des chemins **relatifs** (`./shared/ipc`), pas l'alias `@/` (seul le build renderer connaît l'alias). Le renderer, lui, importe `@/shared/ipc` (en `import type`).
- `tsconfig.json` est en **`strict: true`** (requis notamment pour le narrowing des unions discriminées comme `IpcResult`).

### Build (Electron Forge + Vite)
`forge.config.ts` configure le `VitePlugin` avec **trois builds séparés** : `main` (`vite.main.config.ts`), `preload` (`vite.preload.config.ts`) et `renderer` (**`vite.renderer.config.mts`**). La sortie va dans `.vite/build/` ; `package.json#main` pointe vers `.vite/build/main.js`. Les globales magiques `MAIN_WINDOW_VITE_DEV_SERVER_URL` / `MAIN_WINDOW_VITE_NAME` (déclarées dans `forge.env.d.ts`) sont injectées par le plugin pour charger l'UI en dev vs prod. Les **fuses** Electron (durcissement : `OnlyLoadAppFromAsar`, intégrité ASAR, désactivation `RunAsNode`/inspection Node) sont définies dans `forge.config.ts`.

**Pourquoi `.mts` pour le renderer** : `@tailwindcss/vite` est **ESM-only** ; comme le projet n'est pas `"type": "module"`, la config qui l'importe **doit** être en `.mts` (sinon Vite tente un `require()` CommonJS et le chargement de la config échoue). `tsconfig.json` est donc en `module: ESNext` + `moduleResolution: bundler` (réglage typecheck ; le build passe par Vite/esbuild). Il existe aussi un **`vite.config.mts` racine** (réplique du renderer) présent uniquement pour l'outillage (CLI shadcn, `npx vite build` de validation hors Electron) — **Forge l'ignore**.

## UI (Tailwind v4 + shadcn/ui)
- **Tailwind v4** via le plugin `@tailwindcss/vite` ; pas de `tailwind.config.js` — tout est en CSS (`src/index.css` : `@import "tailwindcss"` + thème). Alias **`@` → `src/`** (dans `tsconfig.json` *et* les configs Vite).
- **shadcn/ui** : style visuel **nova** (compact), librairie **radix**, base color neutral. Config dans `components.json`. Composants générés dans **`src/components/ui/`** (button, input, label, card…), helper `cn()` dans `src/lib/utils.ts`. Icônes : **lucide-react**.
- **Ajouter un composant** : `npx shadcn@latest add <nom>` (sert la variante `radix-nova`). ⚠️ requiert le réseau vers `ui.shadcn.com` — **intermittent** dans cet environnement (`ENOTFOUND`), relancer si échec.
- **Couleur primaire passée en bleu** : `--primary`/`--ring` ont été surchargés en bleu (oklch ~257°) dans `src/index.css` (`:root` + `.dark`) pour coller aux maquettes `docs/design/` (shadcn init était en neutral/gris).
- **Validation UI sans GUI** : `npx vite build` (utilise `vite.config.mts`, build depuis `index.html`) compile le renderer et surface les erreurs Tailwind/imports.
- **Règle UI (impérative)** : **toujours privilégier les composants shadcn/ui**. Si un composant manque, l'installer (`npx shadcn@latest add <nom>`) plutôt que de le coder à la main. Composants déjà présents dans `src/components/ui/` : button, input, label, card, textarea, input-group, field, select, combobox, button-group, dropdown-menu, avatar, badge, separator, tooltip, sheet, skeleton, **sidebar**, sonner, calendar, table, pagination.
- **Écran de connexion** : `src/features/auth/LoginScreen.tsx`. `App.tsx` détient l'utilisateur authentifié (`AuthUser | null`) et appelle l'IPC. Démo : `admin` / `siconex` (ou `comptable` / `siconex`). L'authentification passe par le **canal IPC `auth:login`** (voir section IPC) ; la vérification dans `main` est **provisoire** (table users en dur) → à remplacer par la table `users` HFSQL avec hash (cf. CDC §4.1).
- **Shell applicatif** : `src/components/layout/` — `AppShell.tsx` (orchestre `SidebarProvider` + `SidebarInset`, état `route`/`magasin`/`exercice`), `Sidebar.tsx` (`AppSidebar`, basé sur le `sidebar` shadcn), `Topbar.tsx` (titre + `SidebarTrigger` + sélecteurs magasin/exercice + menu utilisateur via `dropdown-menu`/`avatar`). Navigation (groupes + routes + icônes lucide) dans `src/lib/navigation.ts`. Les modules sont des **placeholders** pour l'instant.
- **Données de démo** : `src/lib/mock-data.ts` (sociétés, magasins, exercices, utilisateur, écritures + helpers `fmtCur`/`fmtDate`/`entryTotals`). **Provisoire** — remplacera les appels preload/IPC quand HFSQL sera branché.

## Règles métier à ne pas casser (cf. CDC §3)

- **Cloisonnement par magasin** : toute donnée comptable porte `magasin_id`. Le magasin/société « courant » est un **état applicatif** (sélecteur d'UI), filtré dans les services du `main` — ce n'est **pas** un en-tête HTTP.
- **Partie double / équilibre bloquant** : une écriture est en-tête + ≥ 2 lignes ; une écriture déséquilibrée (Σ débit ≠ Σ crédit) **ne peut pas être validée**. Statuts : BROUILLON → VALIDÉE → INVALIDÉE.
- **Consolidation société** : agréger sur tous les magasins d'une société, **groupé par `comptes.numero`** (pas `compte_id`, les plans étant propres à chaque magasin) et **par plage de dates** (pas par `exercice_id`).
- **Plan comptable** : SYSCOHADA, pré-chargé à la **création d'un magasin** depuis `compte.json` ; sous-comptes tiers au format 8 chiffres (`4111xxxx` clients / `4011xxxx` fournisseurs).
- **Tiers** : CRUD complet ; suppression = **archivage (soft delete)**, historique et compte `4111/4011` préservés.
- **TVA Côte d'Ivoire** : 18 % (normal) + 9 % (réduit). Devise unique **FCFA/XOF**, pas de multi-devises.
- **Audit** : tracer les actions sur **écritures, comptes, journaux et tiers** (création/modification/suppression, + validation/invalidation des écritures), avec utilisateur + horodatage, en table `audit_logs`, écrit explicitement par les services.
- **Schéma BDD** : les tables sont créées **manuellement dans le Centre de contrôle HFSQL** à partir des scripts **`db/schema/*.sql`** (pas de runner de migrations programmatique — abandonné car HFSQL/ODBC posait des verrous et ne committe pas les DDL d'une connexion app tuée). L'application **lit/écrit** seulement. Le nom `users` est **réservé** sous HFSQL → la table est **`app_users`**.
- **HFSQL via ODBC — contraintes** : le pilote ne supporte **pas** les requêtes paramétrées (`?`) ; on inline les valeurs via `sqlValue()` (`src/main/db/connection.ts`, échappement anti-injection). Connexion lue depuis `.env` (`HFSQL_*`). ⚠️ Connu/à traiter pour les écritures : node-odbc/HFSQL ne semble pas auto-committer entre connexions — à valider quand on implémentera les écritures (création d'utilisateurs, écritures comptables).
