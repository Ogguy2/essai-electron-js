# Module Sociétés / Magasins — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> ⚠️ **Commits** : ce projet INTERDIT toute mention d'outil d'IA dans les messages de commit (pas de trailer `Co-Authored-By: Claude…`, aucune référence « Claude/AI »). Travailler sur la branche **`master`** (pas de nouvelle branche).

**Goal:** Remplacer les données mock par un CRUD persistant HFSQL des Sociétés et Magasins, avec seeding du plan comptable à la création d'un magasin et branchement des sélecteurs du shell.

**Architecture:** Le `main` porte l'accès ODBC (transactions explicites pour garantir le commit HFSQL) et les services métier ; le `preload` expose une API typée ; le `renderer` (React + shadcn/ui) consomme l'API. Cloisonnement par `magasin_id`. Mutations réservées au rôle Admin.

**Tech Stack:** Electron, TypeScript strict, `odbc`, React 19, shadcn/ui, Vitest.

---

## File Structure

**Créés :**
- `db/schema/002_societes_magasins.sql` — tables societes/magasins/exercices (création manuelle HFSQL).
- `db/schema/003_comptes.sql` — table comptes.
- `src/main/services/errors.ts` — `AppError` (code + message) pour erreurs métier typées.
- `src/main/services/plan-comptable.ts` — seeder : aplatit `compte.json` en lignes de comptes.
- `src/main/services/societes.ts` — CRUD sociétés.
- `src/main/services/magasins.ts` — CRUD magasins (+ transaction création : exercice + seed comptes).
- `src/main/services/exercices.ts` — lecture des exercices d'un magasin.
- `src/main/services/plan-comptable.test.ts`, `src/main/services/validation.test.ts` — tests unitaires (logique pure).
- `src/main/services/validation.ts` — validations pures d'entrée.
- `src/features/societes/SocietesModule.tsx` — UI sociétés.
- `src/features/magasins/MagasinsModule.tsx` — UI magasins.

**Modifiés :**
- `src/shared/ipc.ts` — types domaine + canaux + surface `Api`.
- `src/main/db/connection.ts` — `execute`, `withTransaction`, `nextId`.
- `src/main/services/auth.ts` — `requireAdmin()`.
- `src/main/ipc.ts` — handlers societes/magasins/exercices.
- `src/preload.ts` — relais des nouveaux canaux.
- `src/lib/mock-data.ts` — réimporte les types domaine depuis `shared/ipc`.
- `src/components/layout/AppShell.tsx` — chargement IPC + switch de routes.
- `tsconfig.json` — `resolveJsonModule` (si absent).

---

## Task 1: Scripts de schéma HFSQL

**Files:**
- Create: `db/schema/002_societes_magasins.sql`
- Create: `db/schema/003_comptes.sql`

- [ ] **Step 1: Créer `002_societes_magasins.sql`**

```sql
-- =====================================================================
-- 002 — Sociétés, magasins et exercices comptables
-- À exécuter dans le Centre de contrôle HFSQL (base : sicocompte).
-- Hiérarchie : societes (1..n) -> magasins ; exercices rattachés au magasin.
-- Dates stockées en VARCHAR(10) ISO 'YYYY-MM-DD' (comparables en plage).
-- =====================================================================

CREATE TABLE societes (
  id             INT,
  raison_sociale VARCHAR(150),
  rccm           VARCHAR(50),
  adresse        VARCHAR(200),
  telephone      VARCHAR(30),
  PRIMARY KEY (id)
);

CREATE TABLE magasins (
  id         INT,
  libelle    VARCHAR(100),
  societe_id INT,
  PRIMARY KEY (id)
);

CREATE TABLE exercices (
  id         INT,
  magasin_id INT,
  libelle    VARCHAR(50),
  date_debut VARCHAR(10),
  date_fin   VARCHAR(10),
  statut     VARCHAR(10),
  PRIMARY KEY (id)
);
```

- [ ] **Step 2: Créer `003_comptes.sql`**

```sql
-- =====================================================================
-- 003 — Plan comptable (comptes) par magasin
-- À exécuter dans le Centre de contrôle HFSQL (base : sicocompte).
-- Alimenté par le seeder (compte.json) à la création d'un magasin.
-- numero : 2 à 8 chiffres (sous-comptes tiers 4111xxxx / 4011xxxx).
-- =====================================================================

CREATE TABLE comptes (
  id         INT,
  magasin_id INT,
  numero     VARCHAR(8),
  libelle    VARCHAR(150),
  classe     INT,
  collectif  BOOLEAN,
  lettrable  BOOLEAN,
  PRIMARY KEY (id)
);
```

- [ ] **Step 3: Commit**

```bash
git add db/schema/002_societes_magasins.sql db/schema/003_comptes.sql
git commit -m "db: schéma sociétés, magasins, exercices et comptes"
```

---

## Task 2: Types domaine + canaux IPC (`src/shared/ipc.ts`)

**Files:**
- Modify: `src/shared/ipc.ts`

- [ ] **Step 1: Ajouter les types domaine** (après l'interface `AuthUser`)

```typescript
export interface Societe {
  id: number;
  raison_sociale: string;
  rccm: string;
  adresse: string;
  telephone: string;
}
export type SocieteInput = Omit<Societe, 'id'>;

export interface Magasin {
  id: number;
  libelle: string;
  societe_id: number;
}
export type MagasinInput = Omit<Magasin, 'id'>;

export interface Exercice {
  id: number;
  magasin_id: number;
  libelle: string;
  date_debut: string;
  date_fin: string;
  statut: 'ouvert' | 'cloture';
}
```

- [ ] **Step 2: Ajouter les canaux dans l'objet `IPC`** (avant la fermeture `} as const;`)

```typescript
  societesList: 'societes:list',
  societesCreate: 'societes:create',
  societesUpdate: 'societes:update',
  societesDelete: 'societes:delete',
  magasinsList: 'magasins:list',
  magasinsCreate: 'magasins:create',
  magasinsUpdate: 'magasins:update',
  magasinsDelete: 'magasins:delete',
  exercicesList: 'exercices:list',
```

- [ ] **Step 3: Étendre l'interface `Api`** (ajouter ces propriétés à `Api`)

```typescript
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
```

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: échoue uniquement là où `preload.ts` n'implémente pas encore `Api` (sera corrigé Task 10). Si d'autres erreurs, corriger.

- [ ] **Step 5: Commit**

```bash
git add src/shared/ipc.ts
git commit -m "ipc: types domaine et canaux societes/magasins/exercices"
```

---

## Task 3: `resolveJsonModule` (tsconfig)

**Files:**
- Modify: `tsconfig.json`

- [ ] **Step 1: Vérifier/ajouter l'option**

Lire `tsconfig.json`. Si `"resolveJsonModule": true` est absent de `compilerOptions`, l'ajouter. Ajouter aussi `"esModuleInterop": true` s'il est absent (import par défaut du JSON).

- [ ] **Step 2: Commit**

```bash
git add tsconfig.json
git commit -m "build: resolveJsonModule pour importer compte.json dans le main"
```

---

## Task 4: Couche d'accès — écritures et transactions (`connection.ts`)

**Files:**
- Modify: `src/main/db/connection.ts`

- [ ] **Step 1: Ajouter `withTransaction`, `execute`, `nextId`** (à la fin du fichier, avant `closePool` ou après)

```typescript
/**
 * Exécute un bloc de requêtes dans UNE transaction (connexion dédiée).
 * `run(sql)` exécute une requête sur cette connexion. Commit si tout passe,
 * rollback sinon. Indispensable : le pilote HFSQL/ODBC ne committe pas de façon
 * fiable hors transaction explicite.
 */
export async function withTransaction(
  fn: (run: (sql: string) => Promise<void>) => Promise<void>,
): Promise<void> {
  const p = await getPool();
  const conn = await p.connect();
  try {
    await conn.beginTransaction();
    await fn(async (sql) => {
      await conn.query(sql);
    });
    await conn.commit();
  } catch (err) {
    try {
      await conn.rollback();
    } catch {
      /* rollback best-effort */
    }
    logError('db.withTransaction', err);
    throw err;
  } finally {
    await conn.close();
  }
}

/** Exécute une seule requête d'écriture en la committant (via transaction). */
export async function execute(sql: string): Promise<void> {
  await withTransaction(async (run) => {
    await run(sql);
  });
}

/** Prochain id pour une table (le schéma n'a pas d'auto-increment). */
export async function nextId(table: string): Promise<number> {
  const rows = await query<{ m: number | null }>(`SELECT MAX(id) AS m FROM ${table}`);
  const max = rows[0]?.m;
  return (typeof max === 'number' ? max : 0) + 1;
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS (sur ce fichier). `p.connect()` et les méthodes `beginTransaction/commit/rollback/close` font partie des types `odbc.Pool`/`odbc.Connection`.

- [ ] **Step 3: Commit**

```bash
git add src/main/db/connection.ts
git commit -m "db: execute, withTransaction (commit explicite) et nextId"
```

---

## Task 5: Erreurs métier typées (`errors.ts`)

**Files:**
- Create: `src/main/services/errors.ts`

- [ ] **Step 1: Créer `AppError`**

```typescript
/**
 * Erreur métier portant un `code` stable (mappé en IpcResult.error.code).
 * Distingue les échecs attendus (FORBIDDEN, VALIDATION, HAS_MAGASINS…) des
 * erreurs techniques (DB_ERROR) côté handlers IPC.
 */
export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/main/services/errors.ts
git commit -m "services: AppError pour erreurs métier typées"
```

---

## Task 6: Seeder du plan comptable (TDD)

**Files:**
- Create: `src/main/services/plan-comptable.ts`
- Test: `src/main/services/plan-comptable.test.ts`

- [ ] **Step 1: Écrire le test qui échoue**

```typescript
import { describe, it, expect } from 'vitest';
import { buildComptesPlan } from './plan-comptable';

describe('buildComptesPlan', () => {
  it('aplatit compte.json en 117 comptes', () => {
    const rows = buildComptesPlan();
    expect(rows).toHaveLength(117);
  });

  it('renseigne numero, libelle et classe numérique', () => {
    const rows = buildComptesPlan();
    const capital = rows.find((r) => r.numero === '101');
    expect(capital).toBeDefined();
    expect(capital!.libelle).toBe('Capital social');
    expect(capital!.classe).toBe(1);
  });

  it('marque 4011 et 4111 comme collectif et lettrable', () => {
    const rows = buildComptesPlan();
    const fournisseurs = rows.find((r) => r.numero === '4011');
    const clients = rows.find((r) => r.numero === '4111');
    expect(fournisseurs).toMatchObject({ collectif: true, lettrable: true });
    expect(clients).toMatchObject({ collectif: true, lettrable: true });
  });

  it('laisse les autres comptes non collectifs', () => {
    const rows = buildComptesPlan();
    expect(rows.find((r) => r.numero === '101')!.collectif).toBe(false);
  });
});
```

- [ ] **Step 2: Lancer le test (échec attendu)**

Run: `npm test -- plan-comptable`
Expected: FAIL — `buildComptesPlan` introuvable.

- [ ] **Step 3: Implémenter le seeder**

```typescript
import comptePlan from '../../../docs/compte.json';

export interface CompteSeedRow {
  numero: string;
  libelle: string;
  classe: number;
  collectif: boolean;
  lettrable: boolean;
}

const TIERS_COLLECTIFS = new Set(['4011', '4111']);

/** Aplatit le plan SYSCOHADA (compte.json) en lignes prêtes à insérer. */
export function buildComptesPlan(): CompteSeedRow[] {
  const rows: CompteSeedRow[] = [];
  for (const cls of comptePlan.classes) {
    const classe = parseInt(cls.classe, 10);
    for (const c of cls.comptes) {
      const tiers = TIERS_COLLECTIFS.has(c.compte);
      rows.push({
        numero: c.compte,
        libelle: c.libelle,
        classe,
        collectif: tiers,
        lettrable: tiers,
      });
    }
  }
  return rows;
}
```

- [ ] **Step 4: Lancer le test (succès attendu)**

Run: `npm test -- plan-comptable`
Expected: PASS (4 tests). Si le total diffère de 117, vérifier `docs/compte.json` et ajuster l'attendu du test au compte réel.

- [ ] **Step 5: Commit**

```bash
git add src/main/services/plan-comptable.ts src/main/services/plan-comptable.test.ts
git commit -m "services: seeder du plan comptable depuis compte.json"
```

---

## Task 7: Validations d'entrée (TDD)

**Files:**
- Create: `src/main/services/validation.ts`
- Test: `src/main/services/validation.test.ts`

- [ ] **Step 1: Écrire le test qui échoue**

```typescript
import { describe, it, expect } from 'vitest';
import { validateSocieteInput, validateMagasinInput } from './validation';

describe('validateSocieteInput', () => {
  it('exige une raison sociale', () => {
    expect(validateSocieteInput({ raison_sociale: '  ', rccm: '', adresse: '', telephone: '' }))
      .toBe('La raison sociale est obligatoire.');
  });
  it('accepte une société valide', () => {
    expect(validateSocieteInput({ raison_sociale: 'ACME', rccm: 'X', adresse: 'Y', telephone: 'Z' }))
      .toBeNull();
  });
});

describe('validateMagasinInput', () => {
  it('exige un libellé', () => {
    expect(validateMagasinInput({ libelle: '', societe_id: 1 }))
      .toBe('Le libellé du magasin est obligatoire.');
  });
  it('exige une société', () => {
    expect(validateMagasinInput({ libelle: 'M', societe_id: 0 }))
      .toBe('La société est obligatoire.');
  });
  it('accepte un magasin valide', () => {
    expect(validateMagasinInput({ libelle: 'M', societe_id: 1 })).toBeNull();
  });
});
```

- [ ] **Step 2: Lancer le test (échec attendu)**

Run: `npm test -- validation`
Expected: FAIL — fonctions introuvables.

- [ ] **Step 3: Implémenter**

```typescript
import type { SocieteInput, MagasinInput } from '../../shared/ipc';

/** Renvoie un message d'erreur, ou null si valide. */
export function validateSocieteInput(input: SocieteInput): string | null {
  if (!input.raison_sociale || !input.raison_sociale.trim()) {
    return 'La raison sociale est obligatoire.';
  }
  return null;
}

export function validateMagasinInput(input: MagasinInput): string | null {
  if (!input.libelle || !input.libelle.trim()) {
    return 'Le libellé du magasin est obligatoire.';
  }
  if (!input.societe_id) {
    return 'La société est obligatoire.';
  }
  return null;
}
```

- [ ] **Step 4: Lancer le test (succès attendu)**

Run: `npm test -- validation`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/main/services/validation.ts src/main/services/validation.test.ts
git commit -m "services: validations d'entrée sociétés/magasins"
```

---

## Task 8: Garde de permission (`requireAdmin`)

**Files:**
- Modify: `src/main/services/auth.ts`

- [ ] **Step 1: Ajouter `requireAdmin`** (à la fin de `auth.ts`, importer `AppError`)

Ajouter en haut : `import { AppError } from './errors';`

```typescript
/** Lève AppError('FORBIDDEN') si l'utilisateur courant n'est pas Admin. */
export function requireAdmin(): void {
  const u = currentSession();
  if (!u || u.role !== 'Admin') {
    throw new AppError('FORBIDDEN', "Action réservée à l'administrateur.");
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/main/services/auth.ts
git commit -m "auth: requireAdmin pour les mutations réservées à l'Admin"
```

---

## Task 9: Service Sociétés

**Files:**
- Create: `src/main/services/societes.ts`

- [ ] **Step 1: Implémenter le service**

```typescript
import type { Societe, SocieteInput } from '../../shared/ipc';
import { query, execute, nextId, sqlValue } from '../db/connection';
import { requireAdmin } from './auth';
import { validateSocieteInput } from './validation';
import { AppError } from './errors';

/** Service Sociétés (processus principal). Mutations réservées à l'Admin. */

export async function list(): Promise<Societe[]> {
  return query<Societe>(
    'SELECT id, raison_sociale, rccm, adresse, telephone FROM societes ORDER BY raison_sociale',
  );
}

export async function create(input: SocieteInput): Promise<Societe> {
  requireAdmin();
  const err = validateSocieteInput(input);
  if (err) throw new AppError('VALIDATION', err);
  const id = await nextId('societes');
  await execute(
    `INSERT INTO societes (id, raison_sociale, rccm, adresse, telephone) VALUES (` +
      `${sqlValue(id)}, ${sqlValue(input.raison_sociale.trim())}, ${sqlValue(input.rccm)}, ` +
      `${sqlValue(input.adresse)}, ${sqlValue(input.telephone)})`,
  );
  return { id, ...input, raison_sociale: input.raison_sociale.trim() };
}

export async function update(id: number, input: SocieteInput): Promise<Societe> {
  requireAdmin();
  const err = validateSocieteInput(input);
  if (err) throw new AppError('VALIDATION', err);
  await execute(
    `UPDATE societes SET raison_sociale = ${sqlValue(input.raison_sociale.trim())}, ` +
      `rccm = ${sqlValue(input.rccm)}, adresse = ${sqlValue(input.adresse)}, ` +
      `telephone = ${sqlValue(input.telephone)} WHERE id = ${sqlValue(id)}`,
  );
  return { id, ...input, raison_sociale: input.raison_sociale.trim() };
}

export async function remove(id: number): Promise<void> {
  requireAdmin();
  const rows = await query<{ n: number }>(
    `SELECT COUNT(*) AS n FROM magasins WHERE societe_id = ${sqlValue(id)}`,
  );
  if ((rows[0]?.n ?? 0) > 0) {
    throw new AppError('HAS_MAGASINS', 'Impossible : cette société possède des magasins.');
  }
  await execute(`DELETE FROM societes WHERE id = ${sqlValue(id)}`);
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/main/services/societes.ts
git commit -m "services: CRUD sociétés (garde suppression si magasins)"
```

---

## Task 10: Service Magasins (+ exercice par défaut + seed comptes)

**Files:**
- Create: `src/main/services/magasins.ts`

- [ ] **Step 1: Implémenter le service**

```typescript
import type { Magasin, MagasinInput } from '../../shared/ipc';
import { query, execute, nextId, sqlValue, withTransaction } from '../db/connection';
import { requireAdmin } from './auth';
import { validateMagasinInput } from './validation';
import { buildComptesPlan } from './plan-comptable';
import { AppError } from './errors';

/** Service Magasins (processus principal). Mutations réservées à l'Admin. */

export async function list(): Promise<Magasin[]> {
  return query<Magasin>('SELECT id, libelle, societe_id FROM magasins ORDER BY libelle');
}

export async function create(input: MagasinInput): Promise<Magasin> {
  requireAdmin();
  const err = validateMagasinInput(input);
  if (err) throw new AppError('VALIDATION', err);

  const id = await nextId('magasins');
  const exId = await nextId('exercices');
  let compteId = await nextId('comptes');
  const plan = buildComptesPlan();

  // Année courante pour l'exercice par défaut.
  const year = new Date().getFullYear();

  await withTransaction(async (run) => {
    await run(
      `INSERT INTO magasins (id, libelle, societe_id) VALUES (` +
        `${sqlValue(id)}, ${sqlValue(input.libelle.trim())}, ${sqlValue(input.societe_id)})`,
    );
    await run(
      `INSERT INTO exercices (id, magasin_id, libelle, date_debut, date_fin, statut) VALUES (` +
        `${sqlValue(exId)}, ${sqlValue(id)}, ${sqlValue(String(year))}, ` +
        `${sqlValue(`${year}-01-01`)}, ${sqlValue(`${year}-12-31`)}, ${sqlValue('ouvert')})`,
    );
    for (const c of plan) {
      await run(
        `INSERT INTO comptes (id, magasin_id, numero, libelle, classe, collectif, lettrable) VALUES (` +
          `${sqlValue(compteId)}, ${sqlValue(id)}, ${sqlValue(c.numero)}, ${sqlValue(c.libelle)}, ` +
          `${sqlValue(c.classe)}, ${sqlValue(c.collectif)}, ${sqlValue(c.lettrable)})`,
      );
      compteId += 1;
    }
  });

  return { id, libelle: input.libelle.trim(), societe_id: input.societe_id };
}

export async function update(id: number, input: MagasinInput): Promise<Magasin> {
  requireAdmin();
  const err = validateMagasinInput(input);
  if (err) throw new AppError('VALIDATION', err);
  await execute(
    `UPDATE magasins SET libelle = ${sqlValue(input.libelle.trim())}, ` +
      `societe_id = ${sqlValue(input.societe_id)} WHERE id = ${sqlValue(id)}`,
  );
  return { id, libelle: input.libelle.trim(), societe_id: input.societe_id };
}

export async function remove(id: number): Promise<void> {
  requireAdmin();
  // Cascade : exercices + comptes du magasin, puis le magasin (transaction).
  // NB : ajouter un garde « écritures existantes » quand le module Écritures arrivera.
  await withTransaction(async (run) => {
    await run(`DELETE FROM comptes WHERE magasin_id = ${sqlValue(id)}`);
    await run(`DELETE FROM exercices WHERE magasin_id = ${sqlValue(id)}`);
    await run(`DELETE FROM magasins WHERE id = ${sqlValue(id)}`);
  });
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/main/services/magasins.ts
git commit -m "services: CRUD magasins + exercice par défaut + seed comptes (transaction)"
```

---

## Task 11: Service Exercices

**Files:**
- Create: `src/main/services/exercices.ts`

- [ ] **Step 1: Implémenter**

```typescript
import type { Exercice } from '../../shared/ipc';
import { query, sqlValue } from '../db/connection';

/** Service Exercices (lecture). La clôture est gérée par le futur module Exercices. */
export async function list(magasinId: number): Promise<Exercice[]> {
  return query<Exercice>(
    `SELECT id, magasin_id, libelle, date_debut, date_fin, statut FROM exercices ` +
      `WHERE magasin_id = ${sqlValue(magasinId)} ORDER BY date_debut DESC`,
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/main/services/exercices.ts
git commit -m "services: lecture des exercices d'un magasin"
```

---

## Task 12: Handlers IPC (`main/ipc.ts`)

**Files:**
- Modify: `src/main/ipc.ts`

- [ ] **Step 1: Ajouter les imports** (en haut)

```typescript
import * as societes from './services/societes';
import * as magasins from './services/magasins';
import * as exercices from './services/exercices';
import { AppError } from './services/errors';
import type { Societe, Magasin, Exercice, SocieteInput, MagasinInput } from '../shared/ipc';
```

- [ ] **Step 2: Ajouter un helper d'enveloppe** (au-dessus de `registerIpcHandlers`)

```typescript
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
```

- [ ] **Step 3: Enregistrer les handlers** (dans `registerIpcHandlers`, après les handlers existants)

```typescript
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
```

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/main/ipc.ts
git commit -m "ipc: handlers societes/magasins/exercices (wrap AppError)"
```

---

## Task 13: Preload (`preload.ts`)

**Files:**
- Modify: `src/preload.ts`

- [ ] **Step 1: Ajouter les relais** (dans l'objet `api`, après `updates`)

```typescript
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
  },
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS (la surface `Api` est désormais complètement implémentée).

- [ ] **Step 3: Commit**

```bash
git add src/preload.ts
git commit -m "preload: expose societes/magasins/exercices"
```

---

## Task 14: Mock-data — réimporter les types domaine

**Files:**
- Modify: `src/lib/mock-data.ts`

- [ ] **Step 1: Remplacer les déclarations locales de `Societe`, `Magasin`, `Exercice`**

Supprimer les `export interface Societe`, `export interface Magasin`, `export interface Exercice` (lignes 7-27) et les remplacer par un ré-export depuis le contrat partagé :

```typescript
import type { Societe, Magasin, Exercice } from '@/shared/ipc';
export type { Societe, Magasin, Exercice };
```

- [ ] **Step 2: Adapter les données mock au nouveau type `Exercice`** (qui a `magasin_id`)

Mettre à jour le tableau `exercices` :

```typescript
export const exercices: Exercice[] = [
  { id: 1, magasin_id: 1, libelle: '2025', date_debut: '2025-01-01', date_fin: '2025-12-31', statut: 'cloture' },
  { id: 2, magasin_id: 1, libelle: '2026', date_debut: '2026-01-01', date_fin: '2026-12-31', statut: 'ouvert' },
];
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/lib/mock-data.ts
git commit -m "mock-data: types domaine importés du contrat IPC partagé"
```

---

## Task 15: UI Sociétés (`SocietesModule.tsx`)

**Files:**
- Create: `src/features/societes/SocietesModule.tsx`

Prérequis composants shadcn : `table`, `dialog`, `input`, `label`, `button` (déjà présents d'après CLAUDE.md). Si `table` ou `dialog` manquent, les installer : `npx shadcn@latest add table dialog`.

- [ ] **Step 1: Implémenter le module**

```tsx
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import type { AuthUser, Societe, SocieteInput } from '@/shared/ipc';

const EMPTY: SocieteInput = { raison_sociale: '', rccm: '', adresse: '', telephone: '' };

interface Props {
  user: AuthUser;
  onChanged?: () => void;
}

export function SocietesModule({ user, onChanged }: Props): React.JSX.Element {
  const isAdmin = user.role === 'Admin';
  const [rows, setRows] = useState<Societe[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Societe | null>(null);
  const [form, setForm] = useState<SocieteInput>(EMPTY);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const res = await window.api.societes.list();
    if (res.success) setRows(res.data);
    else toast.error(res.error.message);
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setOpen(true);
  }
  function openEdit(s: Societe) {
    setEditing(s);
    setForm({ raison_sociale: s.raison_sociale, rccm: s.rccm, adresse: s.adresse, telephone: s.telephone });
    setOpen(true);
  }

  async function save() {
    setSaving(true);
    const res = editing
      ? await window.api.societes.update(editing.id, form)
      : await window.api.societes.create(form);
    setSaving(false);
    if (!res.success) { toast.error(res.error.message); return; }
    toast.success(editing ? 'Société modifiée.' : 'Société créée.');
    setOpen(false);
    await load();
    onChanged?.();
  }

  async function remove(s: Societe) {
    if (!confirm(`Supprimer « ${s.raison_sociale} » ?`)) return;
    const res = await window.api.societes.delete(s.id);
    if (!res.success) { toast.error(res.error.message); return; }
    toast.success('Société supprimée.');
    await load();
    onChanged?.();
  }

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold">Sociétés</h2>
        {isAdmin && (
          <Button onClick={openCreate}><Plus size={16} /> Nouvelle société</Button>
        )}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Raison sociale</TableHead>
            <TableHead>RCCM</TableHead>
            <TableHead>Adresse</TableHead>
            <TableHead>Téléphone</TableHead>
            {isAdmin && <TableHead className="w-24 text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading && (
            <TableRow><TableCell colSpan={5} className="text-muted-foreground">Chargement…</TableCell></TableRow>
          )}
          {!loading && rows.length === 0 && (
            <TableRow><TableCell colSpan={5} className="text-muted-foreground">Aucune société.</TableCell></TableRow>
          )}
          {rows.map((s) => (
            <TableRow key={s.id}>
              <TableCell className="font-semibold">{s.raison_sociale}</TableCell>
              <TableCell>{s.rccm}</TableCell>
              <TableCell>{s.adresse}</TableCell>
              <TableCell>{s.telephone}</TableCell>
              {isAdmin && (
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon-sm" onClick={() => openEdit(s)} aria-label="Modifier">
                    <Pencil size={15} />
                  </Button>
                  <Button variant="ghost" size="icon-sm" onClick={() => void remove(s)} aria-label="Supprimer">
                    <Trash2 size={15} />
                  </Button>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Modifier la société' : 'Nouvelle société'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="rs">Raison sociale</Label>
              <Input id="rs" value={form.raison_sociale}
                onChange={(e) => setForm({ ...form, raison_sociale: e.target.value })} autoFocus />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="rccm">RCCM</Label>
              <Input id="rccm" value={form.rccm} onChange={(e) => setForm({ ...form, rccm: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="adr">Adresse</Label>
              <Input id="adr" value={form.adresse} onChange={(e) => setForm({ ...form, adresse: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="tel">Téléphone</Label>
              <Input id="tel" value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={() => void save()} disabled={saving}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS. (Si `size="icon-sm"` n'existe pas sur Button, utiliser `size="icon"`.)

- [ ] **Step 3: Commit**

```bash
git add src/features/societes/SocietesModule.tsx
git commit -m "ui: module Sociétés (table + dialog CRUD, Admin only)"
```

---

## Task 16: UI Magasins (`MagasinsModule.tsx`)

**Files:**
- Create: `src/features/magasins/MagasinsModule.tsx`

Prérequis : `select` shadcn (présent d'après CLAUDE.md).

- [ ] **Step 1: Implémenter le module**

```tsx
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import type { AuthUser, Magasin, MagasinInput, Societe } from '@/shared/ipc';

interface Props {
  user: AuthUser;
  onChanged?: () => void;
}

export function MagasinsModule({ user, onChanged }: Props): React.JSX.Element {
  const isAdmin = user.role === 'Admin';
  const [rows, setRows] = useState<Magasin[]>([]);
  const [societes, setSocietes] = useState<Societe[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Magasin | null>(null);
  const [form, setForm] = useState<MagasinInput>({ libelle: '', societe_id: 0 });
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const societeName = (id: number) => societes.find((s) => s.id === id)?.raison_sociale ?? '—';

  async function load() {
    setLoading(true);
    const [mRes, sRes] = await Promise.all([window.api.magasins.list(), window.api.societes.list()]);
    if (mRes.success) setRows(mRes.data); else toast.error(mRes.error.message);
    if (sRes.success) setSocietes(sRes.data);
    setLoading(false);
  }
  useEffect(() => { void load(); }, []);

  function openCreate() {
    setEditing(null);
    setForm({ libelle: '', societe_id: societes[0]?.id ?? 0 });
    setOpen(true);
  }
  function openEdit(m: Magasin) {
    setEditing(m);
    setForm({ libelle: m.libelle, societe_id: m.societe_id });
    setOpen(true);
  }

  async function save() {
    setSaving(true);
    const res = editing
      ? await window.api.magasins.update(editing.id, form)
      : await window.api.magasins.create(form);
    setSaving(false);
    if (!res.success) { toast.error(res.error.message); return; }
    toast.success(editing ? 'Magasin modifié.' : 'Magasin créé — plan comptable initialisé (117 comptes).');
    setOpen(false);
    await load();
    onChanged?.();
  }

  async function remove(m: Magasin) {
    if (!confirm(`Supprimer « ${m.libelle} » et son plan comptable ?`)) return;
    const res = await window.api.magasins.delete(m.id);
    if (!res.success) { toast.error(res.error.message); return; }
    toast.success('Magasin supprimé.');
    await load();
    onChanged?.();
  }

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold">Magasins</h2>
        {isAdmin && <Button onClick={openCreate}><Plus size={16} /> Nouveau magasin</Button>}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Libellé</TableHead>
            <TableHead>Société</TableHead>
            {isAdmin && <TableHead className="w-24 text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading && (
            <TableRow><TableCell colSpan={3} className="text-muted-foreground">Chargement…</TableCell></TableRow>
          )}
          {!loading && rows.length === 0 && (
            <TableRow><TableCell colSpan={3} className="text-muted-foreground">Aucun magasin.</TableCell></TableRow>
          )}
          {rows.map((m) => (
            <TableRow key={m.id}>
              <TableCell className="font-semibold">{m.libelle}</TableCell>
              <TableCell>{societeName(m.societe_id)}</TableCell>
              {isAdmin && (
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon-sm" onClick={() => openEdit(m)} aria-label="Modifier">
                    <Pencil size={15} />
                  </Button>
                  <Button variant="ghost" size="icon-sm" onClick={() => void remove(m)} aria-label="Supprimer">
                    <Trash2 size={15} />
                  </Button>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Modifier le magasin' : 'Nouveau magasin'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="lib">Libellé</Label>
              <Input id="lib" value={form.libelle} autoFocus
                onChange={(e) => setForm({ ...form, libelle: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label>Société</Label>
              <Select value={form.societe_id ? String(form.societe_id) : undefined}
                onValueChange={(v) => setForm({ ...form, societe_id: Number(v) })}>
                <SelectTrigger><SelectValue placeholder="Choisir une société" /></SelectTrigger>
                <SelectContent>
                  {societes.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>{s.raison_sociale}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {!editing && (
              <p className="text-xs text-muted-foreground">
                Le plan comptable SYSCOHADA sera initialisé automatiquement pour ce magasin.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={() => void save()} disabled={saving}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/features/magasins/MagasinsModule.tsx
git commit -m "ui: module Magasins (table + dialog, seeder plan comptable)"
```

---

## Task 17: Brancher le shell (`AppShell.tsx`)

**Files:**
- Modify: `src/components/layout/AppShell.tsx`

- [ ] **Step 1: Remplacer le contenu du fichier**

```tsx
import React, { useEffect, useState } from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { PAGE_TITLES, type RouteId } from '@/lib/navigation';
import { brouillonsCount } from '@/lib/mock-data';
import { SocietesModule } from '@/features/societes/SocietesModule';
import { MagasinsModule } from '@/features/magasins/MagasinsModule';
import type { AuthUser, Magasin, Exercice } from '@/shared/ipc';

interface AppShellProps {
  user: AuthUser;
  onLogout: () => void;
}

function Placeholder({ route }: { route: RouteId }): React.JSX.Element {
  return (
    <div className="grid h-full place-items-center p-10">
      <div className="text-center">
        <h2 className="text-xl font-bold">{PAGE_TITLES[route]}</h2>
        <p className="mt-1 text-sm font-medium text-muted-foreground">
          Module à construire dans une prochaine itération.
        </p>
      </div>
    </div>
  );
}

export function AppShell({ user, onLogout }: AppShellProps): React.JSX.Element {
  const [route, setRoute] = useState<RouteId>('dashboard');
  const [magasins, setMagasins] = useState<Magasin[]>([]);
  const [magasin, setMagasin] = useState<Magasin | null>(null);
  const [exercices, setExercices] = useState<Exercice[]>([]);
  const [exercice, setExercice] = useState<Exercice | null>(null);

  // Charge la liste des magasins (référentiel global).
  async function loadMagasins() {
    const res = await window.api.magasins.list();
    if (res.success) {
      setMagasins(res.data);
      setMagasin((cur) => cur ?? res.data[0] ?? null);
    }
  }
  useEffect(() => { void loadMagasins(); }, []);

  // Charge les exercices du magasin courant.
  useEffect(() => {
    if (!magasin) { setExercices([]); setExercice(null); return; }
    let cancelled = false;
    void window.api.exercices.list(magasin.id).then((res) => {
      if (cancelled || !res.success) return;
      setExercices(res.data);
      setExercice(res.data.find((e) => e.statut === 'ouvert') ?? res.data[0] ?? null);
    });
    return () => { cancelled = true; };
  }, [magasin]);

  function renderRoute(): React.JSX.Element {
    switch (route) {
      case 'societes':
        return <SocietesModule user={user} onChanged={loadMagasins} />;
      case 'magasins':
        return <MagasinsModule user={user} onChanged={loadMagasins} />;
      default:
        return <Placeholder route={route} />;
    }
  }

  return (
    <SidebarProvider>
      <AppSidebar
        route={route}
        onNavigate={setRoute}
        badges={{ ecritures: magasin ? brouillonsCount(magasin.id) : 0 }}
      />
      <SidebarInset className="flex h-screen min-w-0 flex-col overflow-hidden">
        <Topbar
          route={route}
          magasin={magasin}
          magasins={magasins}
          onMagasinChange={setMagasin}
          exercice={exercice}
          exercices={exercices}
          onExerciceChange={setExercice}
          user={user}
          onLogout={onLogout}
        />
        <main className="flex-1 overflow-y-auto">{renderRoute()}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
```

- [ ] **Step 2: Adapter `Topbar.tsx` aux props nullable**

`Topbar` reçoit maintenant `magasin: Magasin | null` et `exercice: Exercice | null`. Lire `src/components/layout/Topbar.tsx` et :
- élargir le type des props `magasin`/`exercice` à `… | null` ;
- gérer l'absence (afficher « — » ou un libellé neutre quand `null`).
Ne pas changer la logique des callbacks.

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: PASS. Corriger toute incompatibilité de type dans `Topbar.tsx`.

- [ ] **Step 4: Build renderer**

Run: `node ./node_modules/vite/bin/vite.js build`
Expected: build OK (compile l'UI, surface les erreurs Tailwind/imports).

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/AppShell.tsx src/components/layout/Topbar.tsx
git commit -m "ui: shell branché sur les données réelles (societes/magasins/exercices)"
```

---

## Task 18: Vérification finale

- [ ] **Step 1: Suite complète**

Run: `npm run typecheck && npm run lint && npm test`
Expected: typecheck PASS, lint sans erreur sur les fichiers du module, tests PASS (plan-comptable + validation).

- [ ] **Step 2: Build renderer**

Run: `node ./node_modules/vite/bin/vite.js build`
Expected: PASS.

- [ ] **Step 3: Checklist de validation manuelle (base HFSQL réelle — côté utilisateur)**

Documenter pour l'utilisateur (pas exécutable ici, pas de serveur HFSQL) :
1. Exécuter `db/schema/002_societes_magasins.sql` et `003_comptes.sql` dans le Centre de contrôle HFSQL.
2. `npm start`, se connecter `admin` / `password`.
3. Menu Administration → Sociétés → créer une société.
4. Magasins → créer un magasin (choisir la société) → toast « plan comptable initialisé ».
5. Vérifier en base : 1 ligne `magasins`, 1 ligne `exercices`, 117 lignes `comptes` pour ce `magasin_id` (preuve que le commit transactionnel fonctionne).
6. Tenter de supprimer une société ayant un magasin → message de blocage.
7. Se connecter `user` / `password` (Comptable) → les boutons de création/édition/suppression sont absents.

- [ ] **Step 4: (Optionnel) Commit si ajustements**

Aucun commit si tout est déjà commité par tâche.

---

## Self-Review (effectué)

- **Couverture spec** : schéma (T1), types/IPC (T2,T12,T13), accès/commit (T4), seeder (T6), services CRUD + permissions + garde suppression (T8,T9,T10,T11), UI + shell (T15,T16,T17), vérif (T18). ✅
- **Types cohérents** : `Societe`/`Magasin`/`Exercice`/`SocieteInput`/`MagasinInput` définis en T2 et réutilisés partout ; `Exercice.magasin_id` aligné entre schéma (T1), service (T11) et mock-data (T14). ✅
- **Pas de placeholder** : chaque étape de code contient le code réel. ✅
- **Point d'attention exécution** : si un composant shadcn (`table`/`dialog`/`select`) manque, l'installer avant la tâche UI (réseau intermittent vers ui.shadcn.com — relancer si échec).
