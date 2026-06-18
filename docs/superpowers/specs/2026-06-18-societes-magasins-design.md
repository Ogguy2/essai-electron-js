# Spec — Module Sociétés / Magasins

**Date** : 2026-06-18
**Statut** : validé (design)
**Branche** : `master` (pas de branche dédiée — demande utilisateur)

## Contexte

SicoCompte gère une comptabilité **multi-sociétés / multi-magasins** (SYSCOHADA, Côte
d'Ivoire). Le module Sociétés/Magasins est le **socle** : toute donnée comptable porte un
`magasin_id`, et le plan comptable est seedé à la création d'un magasin. Les autres modules
(comptes, écritures, consolidation…) en dépendent. Aujourd'hui les entités existent seulement
en données mock (`src/lib/mock-data.ts`) et l'UI n'affiche qu'un placeholder générique.

Ce module remplace les mocks par un vrai CRUD persistant en **HFSQL via ODBC**. C'est aussi
le **premier write** du projet : il valide la stratégie d'écriture/commit et de génération
d'IDs.

## Décisions

- **Portée** : module complet d'un coup — CRUD Sociétés + CRUD Magasins (avec seeder du plan
  comptable à la création) + branchement des sélecteurs magasin/exercice du shell sur les
  données réelles (IPC).
- **Permissions** : créer / modifier / supprimer réservé au rôle **Admin** ; le Comptable
  consulte. Vérifié côté `main` via `currentSession()`.
- **Dates** stockées en `VARCHAR(10)` ISO `YYYY-MM-DD` (comparables en plage ; évite les
  littéraux date ODBC).
- **IDs** générés par `SELECT MAX(id)+1` (le schéma n'a pas d'auto-increment). Limite assumée
  en multi-poste (course possible) — acceptable pour ces entités rares.
- **Écritures** via transaction explicite (`beginTransaction`/`commit`) → résout le souci
  d'auto-commit ODBC/HFSQL et rend la création de magasin atomique.
- **Schéma** créé manuellement dans HFSQL depuis `db/schema/*.sql` (conforme à `CLAUDE.md` —
  pas de runner programmatique).

## Schéma HFSQL (scripts manuels, style `001`)

`db/schema/002_societes_magasins.sql` :
- `societes(id INT, raison_sociale VARCHAR(150), rccm VARCHAR(50), adresse VARCHAR(200), telephone VARCHAR(30), PK id)`
- `magasins(id INT, libelle VARCHAR(100), societe_id INT, PK id)`
- `exercices(id INT, magasin_id INT, libelle VARCHAR(50), date_debut VARCHAR(10), date_fin VARCHAR(10), statut VARCHAR(10), PK id)`

`db/schema/003_comptes.sql` :
- `comptes(id INT, magasin_id INT, numero VARCHAR(8), libelle VARCHAR(150), classe INT, collectif BOOLEAN, lettrable BOOLEAN, PK id)`

## Couche d'accès — `src/main/db/connection.ts`

Ajouts :
- `execute(sql): Promise<void>` — INSERT/UPDATE/DELETE (valeurs inlinées via `sqlValue`).
- `withTransaction(fn: (conn) => Promise<void>): Promise<void>` — connexion dédiée,
  `beginTransaction` → callback → `commit` ; `rollback` + rethrow sur erreur ; libère la
  connexion. Le callback exécute ses requêtes sur **cette** connexion.
- `nextId(table: string): Promise<number>` — `SELECT MAX(id) AS m FROM <table>` → `m+1` (ou 1).

## Services `main` (un module par entité, style `auth.ts`)

- `src/main/services/societes.ts` — `list()`, `create(input)`, `update(id, input)`,
  `remove(id)`. `remove` **bloqué si la société a des magasins** (compte `magasins`).
- `src/main/services/magasins.ts` — `list()`, `create(input)`, `update(id, input)`,
  `remove(id)`.
  - `create` = **transaction** : `magasins` + un **exercice par défaut** (année courante,
    `01-01`→`12-31`, statut `ouvert`) + **seed des 117 comptes** depuis `compte.json`.
  - `remove` = transaction : supprime les `exercices` et `comptes` du magasin puis le magasin.
    (Garde « écritures existantes » à ajouter quand le module Écritures arrivera.)
- `src/main/services/exercices.ts` — `list(magasinId)`.
- **Seeder** : `src/main/services/plan-comptable.ts` — importe `compte.json` (bundlé dans
  `main`), aplatit classes→comptes, insère chaque compte avec `magasin_id` ; `collectif` et
  `lettrable` à `true` pour `4011`/`4111`, sinon `false`.
- **Permissions** : helper `assertAdmin()` (lève/retourne erreur si
  `currentSession()?.role !== 'Admin'`) appelé en tête de chaque mutation.

## Pont IPC (patron `IpcResult<T>`)

- `src/shared/ipc.ts` : types domaine canoniques `Societe`, `Magasin`, `Exercice` (déplacés
  depuis `mock-data.ts`, qui les réimporte). Inputs : `SocieteInput`, `MagasinInput`.
- Canaux dans `IPC` : `societes:list|create|update|delete`,
  `magasins:list|create|update|delete`, `exercices:list`.
- Surface `Api` : `societes`, `magasins`, `exercices` (+ méthodes typées).
- `src/preload.ts` : relais `ipcRenderer.invoke`.
- `src/main/ipc.ts` : handlers → services, enveloppe `IpcResult`, erreurs normalisées
  (`FORBIDDEN`, `VALIDATION`, `HAS_MAGASINS`, `DB_ERROR`).

## UI (shadcn/ui)

- `src/components/layout/AppShell.tsx` :
  - charge `societes` / `magasins` / `exercices` réels via IPC au montage (état du shell),
    avec états chargement/erreur ; supprime les imports mock pour ces données.
  - remplace `<Placeholder route={route} />` par un **switch** : `societes` →
    `SocietesModule`, `magasins` → `MagasinsModule`, autres → `Placeholder`.
  - les sélecteurs Topbar consomment les données réelles ; sélection courante = état UI.
- `src/features/societes/SocietesModule.tsx` : tableau (`table`), bouton « Nouvelle société »
  → `dialog` formulaire, actions éditer/supprimer (suppression gardée). Mutations masquées
  pour le Comptable (selon `user.role`).
- `src/features/magasins/MagasinsModule.tsx` : tableau (avec raison sociale), création
  (libellé + `select` société) → toast sonner « Plan comptable initialisé (117 comptes) »,
  éditer/supprimer. Rafraîchit la liste + l'état du shell après mutation.

## Hors périmètre (YAGNI)

Clôture d'exercice, module Comptes (CRUD du plan), tiers, consolidation — modules séparés.
Ici on ne fait qu'**alimenter** `comptes`/`exercices` à la création d'un magasin.

## Vérification

1. `npm run typecheck` (tsc strict — nouveaux types, narrowing `IpcResult`).
2. `npm run lint`.
3. Build renderer (`vite build`) — UI compile (table/dialog/select/toast).
4. **Validation manuelle sur base réelle** (côté utilisateur, pas d'HFSQL ici) :
   - exécuter `002_…` et `003_…` dans le Centre de contrôle HFSQL ;
   - `npm start`, se connecter Admin ;
   - créer une société, puis un magasin → vérifier en base : 1 magasin, 1 exercice, 117
     comptes (commit effectif) ;
   - vérifier le blocage de suppression d'une société ayant des magasins ;
   - se connecter Comptable → mutations indisponibles.

## Risques / points d'attention

- **Write/commit HFSQL** : non testable ici ; la transaction explicite est la parade. À
  confirmer sur la base réelle (premier write du projet).
- **Génération d'IDs** `MAX+1` : course multi-poste possible (faible risque ici).
- **Import `compte.json`** depuis `main` : nécessite `resolveJsonModule` (tsconfig) ; vérifier
  que le bundle `main` l'inclut bien.
- **Format date ODBC** : choix `VARCHAR(10)` ISO pour éviter les littéraux date du pilote.
