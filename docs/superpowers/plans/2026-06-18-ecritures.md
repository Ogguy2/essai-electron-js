# Module Écritures — Implementation Plan

> subagent-driven-development. `- [ ]`. Commits SANS mention d'IA. Branche `master`.
> Conventions : services dossier-par-module ; types `src/types/` (façade `shared/ipc`) ; zod partagé ;
> `sqlValue` (de-accent) ; `toAsciiUpper` ; `toBool` ; ids AUTO_INCREMENT (`withTransaction` + MAX) ;
> montants ENTIERS FCFA ; RHF + zodResolver côté UI ; boutons `size="lg"`+icône ; `AlertDialog` ;
> NE PAS modifier `src/components/ui/*`. Gabarits : `src/main/services/tiers/index.ts` (transaction
> maître+détail), `src/features/comptes/ComptesModule.tsx`, `docs/design/ecritures.jsx` (UI cible).
> `new Date()` est OK ici (code main, pas un script de workflow).

---

## Task 1: Domaine `src/domain/ecriture.ts` (TDD, étendu)

**Files:** Modify `src/domain/ecriture.ts`, `src/domain/ecriture.test.ts`

- [ ] **Tests à AJOUTER** (ne pas casser les existants)
```typescript
import { soldeLigne, ligneValide, numeroRef, inverseLignes, dateDansPeriode } from './ecriture';

describe('lecture de signe & règles', () => {
  it('soldeLigne signé', () => {
    expect(soldeLigne({ debit: 1000, credit: 0 })).toBe(1000);
    expect(soldeLigne({ debit: 0, credit: 700 })).toBe(-700);
  });
  it('ligneValide : débit XOR crédit, positif', () => {
    expect(ligneValide({ debit: 100, credit: 0 })).toBe(true);
    expect(ligneValide({ debit: 0, credit: 100 })).toBe(true);
    expect(ligneValide({ debit: 0, credit: 0 })).toBe(false);
    expect(ligneValide({ debit: 100, credit: 100 })).toBe(false);
    expect(ligneValide({ debit: -5, credit: 0 })).toBe(false);
  });
  it('numeroRef', () => { expect(numeroRef('VTE', '2026', 1)).toBe('VTE-2026-0001'); });
  it('inverseLignes', () => {
    expect(inverseLignes([{ debit: 100, credit: 0 }])).toEqual([{ debit: 0, credit: 100 }]);
  });
  it('dateDansPeriode', () => {
    expect(dateDansPeriode('2026-06-01', '2026-01-01', '2026-12-31')).toBe(true);
    expect(dateDansPeriode('2027-01-01', '2026-01-01', '2026-12-31')).toBe(false);
  });
});
```
- [ ] `npx vitest run ecriture` → FAIL.
- [ ] **Implémenter** (ajouter au fichier, garder `totalDebit/totalCredit/estEquilibree`)
```typescript
/** Solde signé d'une ligne (débit − crédit). */
export function soldeLigne(l: { debit: number; credit: number }): number {
  return l.debit - l.credit;
}

/** Ligne valide : montants ≥ 0, débit XOR crédit, non nulle. */
export function ligneValide(l: { debit: number; credit: number }): boolean {
  if (l.debit < 0 || l.credit < 0) return false;
  if (l.debit > 0 && l.credit > 0) return false;
  return l.debit > 0 || l.credit > 0;
}

/** Référence : JOURNAL-EXERCICE-0001. */
export function numeroRef(journal: string, exerciceLibelle: string, seq: number): string {
  return `${journal}-${exerciceLibelle}-${String(seq).padStart(4, '0')}`;
}

/** Extourne : inverse débit/crédit de chaque ligne. */
export function inverseLignes<T extends { debit: number; credit: number }>(lignes: readonly T[]): T[] {
  return lignes.map((l) => ({ ...l, debit: l.credit, credit: l.debit }));
}

/** Date ISO dans la période [debut, fin]. */
export function dateDansPeriode(date: string, debut: string, fin: string): boolean {
  return date >= debut && date <= fin;
}
```
- [ ] `npx vitest run ecriture` → PASS. **Commit** `git commit -m "domain: lecture de signe + règles écriture (soldeLigne, ligneValide, ref, extourne, période)"`

---

## Task 2: Schéma SQL + db scripts

**Files:** Create `db/schema/006_ecritures.sql` ; Modify `scripts/db/lib.mjs`

- [ ] **`db/schema/006_ecritures.sql`** : les 2 tables `ecritures` + `ecriture_lignes` du spec (en-tête commenté style des autres).
- [ ] **`scripts/db/lib.mjs`** : mettre `'ecriture_lignes', 'ecritures'` en TÊTE de `DATA_TABLES` (avant `tiers`).
- [ ] **Commit** `git commit -m "db: schéma écritures (ecritures + ecriture_lignes) + purge db:fresh"`

---

## Task 3: Types + schémas zod + IPC + preload

**Files:** Modify `src/types/domain.ts`, `src/shared/schemas.ts`, `src/shared/ipc.ts`, `src/preload.ts`

- [ ] **`src/types/domain.ts`**
```typescript
export type StatutEcriture = 'brouillon' | 'validee' | 'invalidee';
export interface EcritureLigne {
  id: number; ecriture_id: number; compte: string; tiers: string | null;
  libelle: string; debit: number; credit: number; echeance: string | null; lettrage: string | null;
}
export interface Ecriture {
  id: number; magasin_id: number; exercice_id: number; journal: string; ref: string;
  date_ecriture: string; libelle: string; statut: StatutEcriture;
  reversal_of_id: number | null; validee_at: string | null; cree_par: string;
}
export interface EcritureListItem extends Ecriture { total_debit: number; total_credit: number; }
export interface EcritureAvecLignes extends EcritureListItem { lignes: EcritureLigne[]; }
export interface LigneInput {
  compte: string; tiers: string | null; libelle: string;
  debit: number; credit: number; echeance: string | null; lettrage: string | null;
}
export interface EcritureInput {
  exercice_id: number; journal: string; date_ecriture: string; libelle: string; lignes: LigneInput[];
}
```
Re-exporter ces types dans `shared/ipc.ts`.
- [ ] **`src/shared/schemas.ts`**
```typescript
export const ligneInputSchema = z
  .object({
    compte: z.string().trim().min(1, 'Compte obligatoire.'),
    tiers: z.string().trim().nullable(),
    libelle: z.string().trim(),
    debit: z.number().int().min(0),
    credit: z.number().int().min(0),
    echeance: z.string().nullable(),
    lettrage: z.string().nullable(),
  })
  .refine((l) => (l.debit > 0) !== (l.credit > 0), { message: 'Chaque ligne porte un débit OU un crédit.' });
export const ecritureInputSchema = z
  .object({
    exercice_id: z.number().int().positive(),
    journal: z.string().trim().min(1, 'Journal obligatoire.'),
    date_ecriture: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date invalide.'),
    libelle: z.string().trim().min(1, 'Libellé obligatoire.'),
    lignes: z.array(ligneInputSchema).min(2, 'Au moins 2 lignes.'),
  })
  .refine((e) => {
    const d = e.lignes.reduce((s, l) => s + l.debit, 0);
    const c = e.lignes.reduce((s, l) => s + l.credit, 0);
    return d === c && d > 0;
  }, { message: 'Écriture déséquilibrée (Σ débit ≠ Σ crédit).', path: ['lignes'] });
export type EcritureFormValues = z.infer<typeof ecritureInputSchema>;
```
+ tests (déséquilibre rejeté ; ligne débit+crédit rejetée ; cas valide).
- [ ] **`src/shared/ipc.ts`** : canaux `ecrituresList: 'ecritures:list'`, `ecrituresGet: 'ecritures:get'`,
  `ecrituresCreate`, `ecrituresUpdate`, `ecrituresValidate`, `ecrituresInvalidate`, `ecrituresReverse`,
  `ecrituresDelete` ; `Api.ecritures` :
```typescript
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
```
- [ ] **`src/preload.ts`** : exposer `ecritures` (8 méthodes).
- [ ] **Typecheck** (erreur résiduelle attendue jusqu'au branchement ipc/service). **Commit** `git commit -m "ipc: types Écriture, schémas zod et canaux ecritures"`

---

## Task 4: Service `src/main/services/ecritures/index.ts`

**Files:** Create `src/main/services/ecritures/index.ts`

- [ ] **Implémenter** (utilise les helpers domaine ; `currentSession`, `requireAuth`, `requireAdmin` depuis `../auth`) :
```typescript
import type {
  Ecriture, EcritureLigne, EcritureListItem, EcritureAvecLignes, EcritureInput, StatutEcriture,
} from '../../../shared/ipc';
import { query, execute, sqlValue, withTransaction } from '../../db/connection';
import { requireAuth, requireAdmin, currentSession } from '../auth';
import { ecritureInputSchema, firstZodError } from '../../../shared/schemas';
import { toAsciiUpper } from '../../../domain/text';
import { estAncreCollectif } from '../../../domain/compte';
import {
  estEquilibree, ligneValide, numeroRef, inverseLignes, dateDansPeriode, totalDebit, totalCredit,
} from '../../../domain/ecriture';
import { AppError } from '../common/errors';

function parseEcriture(input: EcritureInput): EcritureInput {
  const parsed = ecritureInputSchema.safeParse(input);
  if (!parsed.success) throw new AppError('VALIDATION', firstZodError(parsed.error));
  const e = parsed.data;
  return {
    exercice_id: e.exercice_id,
    journal: toAsciiUpper(e.journal),
    date_ecriture: e.date_ecriture,
    libelle: toAsciiUpper(e.libelle),
    lignes: e.lignes.map((l) => ({
      compte: toAsciiUpper(l.compte),
      tiers: l.tiers ? toAsciiUpper(l.tiers) : null,
      libelle: toAsciiUpper(l.libelle),
      debit: l.debit,
      credit: l.credit,
      echeance: l.echeance || null,
      lettrage: l.lettrage ? toAsciiUpper(l.lettrage) : null,
    })),
  };
}

function mapEcriture(r: Record<string, unknown>): Ecriture {
  return {
    id: Number(r.id), magasin_id: Number(r.magasin_id), exercice_id: Number(r.exercice_id),
    journal: String(r.journal ?? ''), ref: String(r.ref ?? ''),
    date_ecriture: String(r.date_ecriture ?? ''), libelle: String(r.libelle ?? ''),
    statut: String(r.statut ?? 'brouillon') as StatutEcriture,
    reversal_of_id: r.reversal_of_id == null ? null : Number(r.reversal_of_id),
    validee_at: r.validee_at == null ? null : String(r.validee_at),
    cree_par: String(r.cree_par ?? ''),
  };
}
function mapLigne(r: Record<string, unknown>): EcritureLigne {
  return {
    id: Number(r.id), ecriture_id: Number(r.ecriture_id), compte: String(r.compte ?? ''),
    tiers: r.tiers == null || r.tiers === '' ? null : String(r.tiers), libelle: String(r.libelle ?? ''),
    debit: Number(r.debit ?? 0), credit: Number(r.credit ?? 0),
    echeance: r.echeance == null || r.echeance === '' ? null : String(r.echeance),
    lettrage: r.lettrage == null || r.lettrage === '' ? null : String(r.lettrage),
  };
}

const E_COLS = 'id, magasin_id, exercice_id, journal, ref, date_ecriture, libelle, statut, reversal_of_id, validee_at, cree_par';
const L_COLS = 'id, ecriture_id, compte, tiers, libelle, debit, credit, echeance, lettrage';

export async function list(magasinId: number): Promise<EcritureListItem[]> {
  const heads = await query<Record<string, unknown>>(
    `SELECT ${E_COLS} FROM ecritures WHERE magasin_id = ${sqlValue(magasinId)} ORDER BY date_ecriture DESC, id DESC`,
  );
  if (!heads.length) return [];
  const ids = heads.map((h) => Number(h.id)).join(',');
  const sums = await query<{ ecriture_id: number; td: number; tc: number }>(
    `SELECT ecriture_id, SUM(debit) AS td, SUM(credit) AS tc FROM ecriture_lignes WHERE ecriture_id IN (${ids}) GROUP BY ecriture_id`,
  );
  const byId = new Map(sums.map((s) => [Number(s.ecriture_id), s]));
  return heads.map((h) => {
    const s = byId.get(Number(h.id));
    return { ...mapEcriture(h), total_debit: Number(s?.td ?? 0), total_credit: Number(s?.tc ?? 0) };
  });
}

export async function get(id: number): Promise<EcritureAvecLignes> {
  const rows = await query<Record<string, unknown>>(`SELECT ${E_COLS} FROM ecritures WHERE id = ${sqlValue(id)}`);
  if (!rows[0]) throw new AppError('NOT_FOUND', 'Écriture introuvable.');
  const e = mapEcriture(rows[0]);
  const ligneRows = await query<Record<string, unknown>>(
    `SELECT ${L_COLS} FROM ecriture_lignes WHERE ecriture_id = ${sqlValue(id)} ORDER BY id`,
  );
  const lignes = ligneRows.map(mapLigne);
  return { ...e, lignes, total_debit: totalDebit(lignes), total_credit: totalCredit(lignes) };
}

async function insertLignes(run: <T = unknown>(sql: string) => Promise<T[]>, ecritureId: number, lignes: EcritureInput['lignes']): Promise<void> {
  for (const l of lignes) {
    await run(
      `INSERT INTO ecriture_lignes (ecriture_id, compte, tiers, libelle, debit, credit, echeance, lettrage) VALUES (` +
        `${sqlValue(ecritureId)}, ${sqlValue(l.compte)}, ${sqlValue(l.tiers)}, ${sqlValue(l.libelle)}, ` +
        `${sqlValue(l.debit)}, ${sqlValue(l.credit)}, ${sqlValue(l.echeance)}, ${sqlValue(l.lettrage)})`,
    );
  }
}

export async function create(magasinId: number, input: EcritureInput): Promise<EcritureAvecLignes> {
  requireAuth();
  const d = parseEcriture(input);
  const user = currentSession()?.username ?? '';
  let id = 0;
  await withTransaction(async (run) => {
    await run(
      `INSERT INTO ecritures (magasin_id, exercice_id, journal, ref, date_ecriture, libelle, statut, reversal_of_id, validee_at, cree_par) VALUES (` +
        `${sqlValue(magasinId)}, ${sqlValue(d.exercice_id)}, ${sqlValue(d.journal)}, '', ${sqlValue(d.date_ecriture)}, ` +
        `${sqlValue(d.libelle)}, 'brouillon', NULL, NULL, ${sqlValue(user)})`,
    );
    id = Number((await run<{ id: number | null }>('SELECT MAX(id) AS id FROM ecritures'))[0]?.id ?? 0);
    await insertLignes(run, id, d.lignes);
  });
  return get(id);
}

export async function update(id: number, input: EcritureInput): Promise<EcritureAvecLignes> {
  requireAuth();
  const cur = await get(id);
  if (cur.statut !== 'brouillon') throw new AppError('IMMUABLE', 'Une écriture validée ne peut pas être modifiée.');
  const d = parseEcriture(input);
  await withTransaction(async (run) => {
    await run(
      `UPDATE ecritures SET exercice_id = ${sqlValue(d.exercice_id)}, journal = ${sqlValue(d.journal)}, ` +
        `date_ecriture = ${sqlValue(d.date_ecriture)}, libelle = ${sqlValue(d.libelle)} WHERE id = ${sqlValue(id)}`,
    );
    await run(`DELETE FROM ecriture_lignes WHERE ecriture_id = ${sqlValue(id)}`);
    await insertLignes(run, id, d.lignes);
  });
  return get(id);
}

export async function validate(id: number): Promise<EcritureAvecLignes> {
  requireAuth();
  const e = await get(id);
  if (e.statut !== 'brouillon') throw new AppError('IMMUABLE', 'Seul un brouillon peut être validé.');
  const exRows = await query<{ libelle: string; date_debut: string; date_fin: string; statut: string }>(
    `SELECT libelle, date_debut, date_fin, statut FROM exercices WHERE id = ${sqlValue(e.exercice_id)}`,
  );
  const ex = exRows[0];
  if (!ex) throw new AppError('VALIDATION', 'Exercice introuvable.');
  if (e.lignes.length < 2) throw new AppError('VALIDATION', 'Au moins 2 lignes sont requises.');
  for (const l of e.lignes) {
    if (!l.compte) throw new AppError('VALIDATION', 'Chaque ligne doit avoir un compte.');
    if (!ligneValide(l)) throw new AppError('VALIDATION', 'Chaque ligne doit porter un débit OU un crédit positif.');
    if (estAncreCollectif(l.compte) && !l.tiers) {
      throw new AppError('VALIDATION', `Le compte collectif ${l.compte} exige un tiers.`);
    }
  }
  if (!(estEquilibree(e.lignes) && totalDebit(e.lignes) > 0)) {
    throw new AppError('VALIDATION', 'Écriture déséquilibrée (Σ débit ≠ Σ crédit).');
  }
  if (ex.statut !== 'ouvert') throw new AppError('VALIDATION', "L'exercice est clôturé.");
  if (!dateDansPeriode(e.date_ecriture, ex.date_debut, ex.date_fin)) {
    throw new AppError('VALIDATION', "La date doit tomber dans l'exercice.");
  }
  const seqRows = await query<{ n: number }>(
    `SELECT COUNT(*) AS n FROM ecritures WHERE magasin_id = ${sqlValue(e.magasin_id)} ` +
      `AND exercice_id = ${sqlValue(e.exercice_id)} AND journal = ${sqlValue(e.journal)} AND statut = 'validee'`,
  );
  const ref = numeroRef(e.journal, ex.libelle, (seqRows[0]?.n ?? 0) + 1);
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  await execute(
    `UPDATE ecritures SET statut = 'validee', ref = ${sqlValue(ref)}, validee_at = ${sqlValue(now)}, ` +
      `cree_par = ${sqlValue(currentSession()?.username ?? '')} WHERE id = ${sqlValue(id)}`,
  );
  return get(id);
}

export async function remove(id: number): Promise<void> {
  requireAuth();
  const cur = await get(id);
  if (cur.statut !== 'brouillon') throw new AppError('IMMUABLE', 'Une écriture validée ne peut pas être supprimée.');
  await withTransaction(async (run) => {
    await run(`DELETE FROM ecriture_lignes WHERE ecriture_id = ${sqlValue(id)}`);
    await run(`DELETE FROM ecritures WHERE id = ${sqlValue(id)}`);
  });
}

export async function reverse(id: number): Promise<EcritureAvecLignes> {
  requireAuth();
  const e = await get(id);
  if (e.statut !== 'validee') throw new AppError('VALIDATION', "Seule une écriture validée peut être extournée.");
  const ex = (await query<{ libelle: string }>(`SELECT libelle FROM exercices WHERE id = ${sqlValue(e.exercice_id)}`))[0];
  const seqRows = await query<{ n: number }>(
    `SELECT COUNT(*) AS n FROM ecritures WHERE magasin_id = ${sqlValue(e.magasin_id)} ` +
      `AND exercice_id = ${sqlValue(e.exercice_id)} AND journal = ${sqlValue(e.journal)} AND statut = 'validee'`,
  );
  const ref = numeroRef(e.journal, ex?.libelle ?? '', (seqRows[0]?.n ?? 0) + 1);
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const user = currentSession()?.username ?? '';
  const inverses = inverseLignes(e.lignes);
  let newId = 0;
  await withTransaction(async (run) => {
    await run(
      `INSERT INTO ecritures (magasin_id, exercice_id, journal, ref, date_ecriture, libelle, statut, reversal_of_id, validee_at, cree_par) VALUES (` +
        `${sqlValue(e.magasin_id)}, ${sqlValue(e.exercice_id)}, ${sqlValue(e.journal)}, ${sqlValue(ref)}, ` +
        `${sqlValue(e.date_ecriture)}, ${sqlValue('EXTOURNE ' + e.ref)}, 'validee', ${sqlValue(e.id)}, ${sqlValue(now)}, ${sqlValue(user)})`,
    );
    newId = Number((await run<{ id: number | null }>('SELECT MAX(id) AS id FROM ecritures'))[0]?.id ?? 0);
    await insertLignes(run, newId, inverses.map((l) => ({
      compte: l.compte, tiers: l.tiers, libelle: l.libelle, debit: l.debit, credit: l.credit,
      echeance: l.echeance, lettrage: l.lettrage,
    })));
  });
  return get(newId);
}

export async function invalidate(id: number): Promise<void> {
  requireAdmin();
  const cur = await get(id);
  if (cur.statut !== 'validee') throw new AppError('VALIDATION', "Seule une écriture validée peut être invalidée.");
  await execute(`UPDATE ecritures SET statut = 'invalidee' WHERE id = ${sqlValue(id)}`);
}
```
- [ ] **Typecheck**. **Commit** `git commit -m "services: CRUD écritures + validation (équilibre, collectif, exercice) + extourne"`

---

## Task 5: Handlers IPC `src/main/ipc.ts`

- [ ] Importer `import * as ecritures from './services/ecritures';` + types `EcritureListItem, EcritureAvecLignes, EcritureInput`.
- [ ] Handlers (gabarit comptes/wrap) pour les 8 canaux : list/get/create/update/validate/invalidate/reverse/delete.
  (`validate`/`reverse`/`get`/`create`/`update` renvoient l'objet ; `invalidate`/`delete` → `null`.)
- [ ] **Typecheck → PASS complet**. **Commit** `git commit -m "ipc: handlers écritures"`

---

## Task 6: UI `src/features/ecritures/EcrituresModule.tsx`

**Files:** Create the module ; modify `AppShell.tsx`.

Maquette = `docs/design/ecritures.jsx`. Props `{ user: AuthUser; magasin: Magasin | null; exercice: Exercice | null }`.
Patrons RHF/garde-anti-race/AlertDialog = `ComptesModule.tsx`. Utiliser `useFieldArray` de react-hook-form
pour les lignes. Charger en parallèle les **comptes** (`window.api.comptes.list`), **journaux**
(`window.api.journaux.list`), **tiers** (`window.api.tiers.list`) du magasin pour les sélecteurs.

- [ ] **Liste** (`Table`) : colonnes Réf (`font-mono`, « — » si brouillon sans réf), Date, Journal (`Badge`),
  Libellé, Débit (`total_debit`), Crédit (`total_credit`), Statut (`Badge` : brouillon=secondary,
  validee=default, invalidee=destructive), Actions (`DropdownMenu` selon statut). Filtres : segmenté
  Toutes/Brouillons/Validées + `Select` journal + recherche (réf/libellé). Bouton **Nouvelle écriture**.
- [ ] **Saisie** (`Dialog` large, `sm:max-w-[900px]`) : `useForm<EcritureFormValues>` + `zodResolver(ecritureInputSchema)`,
  `useFieldArray({ name: 'lignes' })`, defaultValues `{ exercice_id: exercice?.id ?? 0, journal: '',
  date_ecriture: <aujourd'hui ISO>, libelle: '', lignes: [ligneVide, ligneVide] }`.
  - En-tête : Journal (`Select` sur journaux actifs), Date (`Input type="date"`), Libellé.
  - Tableau de lignes : pour chaque ligne — **Compte** (`Combobox` shadcn sur les comptes : numéro —
    libellé), **Tiers** (`Select` sur tiers ; requis/visible si le compte choisi est collectif —
    `estAncreCollectif(compte)`), **Libellé**, **Débit** (`Input type=number`, `valueAsNumber`),
    **Crédit** (idem), bouton supprimer (désactivé si ≤ 2 lignes). Bouton « + Ajouter une ligne ».
    Quand on saisit un débit, mettre le crédit à 0 et vice-versa (et inversement à l'affichage).
  - **Pied** live : Σdébit, Σcrédit, écart (rouge si ≠ 0), badge Équilibrée/Déséquilibrée
    (calcul depuis `watch('lignes')`).
  - Boutons : Annuler ; **Enregistrer en brouillon** (`create`/`update` puis ferme) ; **Valider**
    (create/update si besoin PUIS `window.api.ecritures.validate(id)` ; désactivé si déséquilibré).
    Erreur serveur (`VALIDATION`/`IMMUABLE`) → message en haut du modal (pas un toast).
- [ ] **Détail** (`Dialog`) : en-tête + table des lignes (compte, tiers, libellé, débit, crédit) ; actions
  selon statut — brouillon : Modifier / Valider / Supprimer (`AlertDialog`) ; validée : Extourner
  (`AlertDialog`) + Invalider (si `user.role === 'Admin'`, `AlertDialog`). Badge « Extourne » si
  `reversal_of_id`.
- [ ] Mutations ouvertes **Admin et Comptable**. `AppShell` : `case 'ecritures': return <EcrituresModule
  user={user} magasin={magasin} exercice={exercice} />;`.
- [ ] **Typecheck + lint + build**. **Commit(s)** `git commit -m "ui: module Écritures (saisie partie double, équilibre live, validation/extourne)"`

---

## Task 7: Vérification finale
- [ ] `npm run typecheck && npm run lint && npm test` verts ; build renderer OK.
- [ ] Checklist manuelle : `006_ecritures.sql` créé ; saisir déséquilibré → Valider bloqué ; équilibré →
  validée + réf `VTE-2026-0001` ; collectif sans tiers → refus ; date hors exercice ouvert → refus ;
  extourne d'une validée → inverse validée ; modifier/supprimer une validée → refus.

## Self-Review
- Couverture : domaine signé (T1), schéma (T2), types/IPC/zod (T3,T5), service CRUD+validation+extourne (T4),
  UI saisie+détail (T6). ✅ Lecture de signe : `soldeLigne`, `ligneValide` (XOR), montants entiers. ✅
- Permissions Admin+Comptable ; invalidation Admin. ✅ Immutabilité des validées. ✅
