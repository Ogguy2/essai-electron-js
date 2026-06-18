# Module Plan comptable / Comptes — Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`).
>
> ⚠️ **Commits** : INTERDICTION de toute mention d'IA (`Co-Authored-By: Claude…`, « Claude/AI »). Branche **`master`**. Conventions UI : boutons `<Button size="lg">` + icône lucide, validation `VALIDATION` **inline sous les champs** (jamais de toast), suppression via `AlertDialog`, **ne pas modifier `src/components/ui/*`** (sauf `npx shadcn add checkbox`). Services en **dossier par module**. Suivre le style des modules existants `src/features/societes/SocietesModule.tsx` et `src/features/magasins/MagasinsModule.tsx`.

**Goal:** Consultation + CRUD du plan comptable d'un magasin (table `comptes` déjà seedée), sans soldes, mutations Admin only.

**Architecture:** Règles SYSCOHADA pures dans `src/domain/compte.ts` ; service `main` `comptes/` ; IPC typé ; UI React groupée par classe (repliable) fidèle à `docs/design/referentiel.jsx`.

**Tech Stack:** Electron, TypeScript strict, `odbc`, React 19, shadcn/ui, Vitest.

---

## Task 1: Règles de domaine `src/domain/compte.ts` (TDD)

**Files:** Create `src/domain/compte.ts`, `src/domain/compte.test.ts`

- [ ] **Step 1: Test (échoue)**

```typescript
import { describe, it, expect } from 'vitest';
import { classeFromNumero, isNumeroValide, estAncreCollectif } from './compte';

describe('classeFromNumero', () => {
  it('retourne le premier chiffre comme classe', () => {
    expect(classeFromNumero('601')).toBe(6);
    expect(classeFromNumero('4111')).toBe(4);
  });
  it('retourne null si invalide', () => {
    expect(classeFromNumero('')).toBeNull();
    expect(classeFromNumero('0abc')).toBeNull();
    expect(classeFromNumero('0')).toBeNull();
  });
});

describe('isNumeroValide', () => {
  it('accepte 2 à 8 chiffres', () => {
    expect(isNumeroValide('10')).toBe(true);
    expect(isNumeroValide('41110001')).toBe(true);
  });
  it('refuse < 2, > 8, non-chiffres', () => {
    expect(isNumeroValide('1')).toBe(false);
    expect(isNumeroValide('123456789')).toBe(false);
    expect(isNumeroValide('60A')).toBe(false);
    expect(isNumeroValide('')).toBe(false);
  });
});

describe('estAncreCollectif', () => {
  it('vrai pour 4011 et 4111', () => {
    expect(estAncreCollectif('4011')).toBe(true);
    expect(estAncreCollectif('4111')).toBe(true);
  });
  it('faux sinon', () => {
    expect(estAncreCollectif('601')).toBe(false);
  });
});
```

- [ ] **Step 2: Lancer** `npx vitest run compte` → FAIL.

- [ ] **Step 3: Implémenter**

```typescript
/**
 * Règles de domaine — Plan comptable SYSCOHADA (logique pure, sans accès base).
 */

/** Comptes collectifs « ancres » des tiers (clients/fournisseurs). */
export const COMPTES_COLLECTIFS = ['4011', '4111'] as const;

/** Numéro valide : uniquement des chiffres, longueur 2 à 8. */
export function isNumeroValide(numero: string): boolean {
  return /^[0-9]{2,8}$/.test(numero);
}

/** Classe SYSCOHADA = premier chiffre (1–9), ou null si invalide. */
export function classeFromNumero(numero: string): number | null {
  if (!/^[1-9]/.test(numero)) return null;
  return Number(numero[0]);
}

/** Vrai si le numéro est un compte collectif ancre (non supprimable). */
export function estAncreCollectif(numero: string): boolean {
  return (COMPTES_COLLECTIFS as readonly string[]).includes(numero);
}
```

- [ ] **Step 4: Lancer** `npx vitest run compte` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/compte.ts src/domain/compte.test.ts
git commit -m "domain: règles de numérotation des comptes SYSCOHADA"
```

---

## Task 2: Types & canaux IPC `src/shared/ipc.ts`

**Files:** Modify `src/shared/ipc.ts`

- [ ] **Step 1: Types** (après l'interface `Exercice`)

```typescript
export interface Compte {
  id: number;
  magasin_id: number;
  numero: string;
  libelle: string;
  classe: number;
  collectif: boolean;
  lettrable: boolean;
}
export type CompteInput = Omit<Compte, 'id' | 'magasin_id'>;
```

- [ ] **Step 2: Canaux** (dans `IPC`, avant `} as const;`)

```typescript
  comptesList: 'comptes:list',
  comptesCreate: 'comptes:create',
  comptesUpdate: 'comptes:update',
  comptesDelete: 'comptes:delete',
```

- [ ] **Step 3: Surface `Api`** (ajouter à l'interface `Api`)

```typescript
  comptes: {
    list(magasinId: number): Promise<IpcResult<Compte[]>>;
    create(magasinId: number, input: CompteInput): Promise<IpcResult<Compte>>;
    update(id: number, input: CompteInput): Promise<IpcResult<Compte>>;
    delete(id: number): Promise<IpcResult<null>>;
  };
```

- [ ] **Step 4: Typecheck** — `npm run typecheck` échoue seulement sur `preload.ts` (Api incomplète, corrigé Task 6). Commit quand même.

- [ ] **Step 5: Commit**

```bash
git add src/shared/ipc.ts
git commit -m "ipc: types Compte et canaux comptes"
```

---

## Task 3: Validation `validateCompteInput` (TDD)

**Files:** Modify `src/main/services/common/validation.ts`, `src/main/services/common/validation.test.ts`

- [ ] **Step 1: Test (échoue)** — ajouter au fichier de test existant

```typescript
import { validateCompteInput } from './validation';

describe('validateCompteInput', () => {
  it('exige un numéro valide (2-8 chiffres)', () => {
    expect(validateCompteInput({ numero: '6', libelle: 'X', classe: 6, collectif: false, lettrable: false }))
      .toBe('Le numéro de compte doit comporter 2 à 8 chiffres.');
  });
  it('exige un intitulé', () => {
    expect(validateCompteInput({ numero: '601', libelle: '  ', classe: 6, collectif: false, lettrable: false }))
      .toBe("L'intitulé du compte est obligatoire.");
  });
  it('exige une classe cohérente avec le numéro', () => {
    expect(validateCompteInput({ numero: '601', libelle: 'Achats', classe: 5, collectif: false, lettrable: false }))
      .toBe('La classe doit correspondre au premier chiffre du numéro.');
  });
  it('accepte un compte valide', () => {
    expect(validateCompteInput({ numero: '601', libelle: 'Achats', classe: 6, collectif: false, lettrable: false }))
      .toBeNull();
  });
});
```

- [ ] **Step 2: Lancer** `npx vitest run validation` → FAIL.

- [ ] **Step 3: Implémenter** — ajouter à `validation.ts`

```typescript
import type { CompteInput } from '../../../shared/ipc';
import { isNumeroValide, classeFromNumero } from '../../../domain/compte';

export function validateCompteInput(input: CompteInput): string | null {
  if (!isNumeroValide(input.numero)) {
    return 'Le numéro de compte doit comporter 2 à 8 chiffres.';
  }
  if (!input.libelle || !input.libelle.trim()) {
    return "L'intitulé du compte est obligatoire.";
  }
  if (input.classe !== classeFromNumero(input.numero)) {
    return 'La classe doit correspondre au premier chiffre du numéro.';
  }
  return null;
}
```

> NB : `validation.ts` est dans `src/main/services/common/` ; les imports remontent de 3 niveaux vers `shared/` et `domain/` (`../../../`). Vérifier le chemin réel et ajuster si besoin.

- [ ] **Step 4: Lancer** `npx vitest run validation` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/main/services/common/validation.ts src/main/services/common/validation.test.ts
git commit -m "services: validation d'un compte (numéro/intitulé/classe)"
```

---

## Task 4: Service `src/main/services/comptes/index.ts`

**Files:** Create `src/main/services/comptes/index.ts`

- [ ] **Step 1: Implémenter**

```typescript
import type { Compte, CompteInput } from '../../../shared/ipc';
import { query, execute, nextId, sqlValue } from '../../db/connection';
import { requireAdmin } from '../auth';
import { validateCompteInput } from '../common/validation';
import { estAncreCollectif } from '../../../domain/compte';
import { AppError } from '../common/errors';

/** Service Plan comptable (processus principal). Mutations réservées à l'Admin. */

export async function list(magasinId: number): Promise<Compte[]> {
  return query<Compte>(
    `SELECT id, magasin_id, numero, libelle, classe, collectif, lettrable ` +
      `FROM comptes WHERE magasin_id = ${sqlValue(magasinId)} ORDER BY numero`,
  );
}

async function numeroExiste(magasinId: number, numero: string, exceptId?: number): Promise<boolean> {
  const extra = exceptId ? ` AND id <> ${sqlValue(exceptId)}` : '';
  const rows = await query<{ n: number }>(
    `SELECT COUNT(*) AS n FROM comptes WHERE magasin_id = ${sqlValue(magasinId)} ` +
      `AND numero = ${sqlValue(numero)}${extra}`,
  );
  return (rows[0]?.n ?? 0) > 0;
}

export async function create(magasinId: number, input: CompteInput): Promise<Compte> {
  requireAdmin();
  const err = validateCompteInput(input);
  if (err) throw new AppError('VALIDATION', err);
  if (await numeroExiste(magasinId, input.numero)) {
    throw new AppError('VALIDATION', 'Ce numéro de compte existe déjà pour ce magasin.');
  }
  const id = await nextId('comptes');
  await execute(
    `INSERT INTO comptes (id, magasin_id, numero, libelle, classe, collectif, lettrable) VALUES (` +
      `${sqlValue(id)}, ${sqlValue(magasinId)}, ${sqlValue(input.numero)}, ${sqlValue(input.libelle.trim())}, ` +
      `${sqlValue(input.classe)}, ${sqlValue(input.collectif)}, ${sqlValue(input.lettrable)})`,
  );
  return { id, magasin_id: magasinId, ...input, libelle: input.libelle.trim() };
}

export async function update(id: number, input: CompteInput): Promise<Compte> {
  requireAdmin();
  const err = validateCompteInput(input);
  if (err) throw new AppError('VALIDATION', err);
  // Récupère le magasin du compte pour vérifier l'unicité du numéro dans son périmètre.
  const rows = await query<{ magasin_id: number }>(
    `SELECT magasin_id FROM comptes WHERE id = ${sqlValue(id)}`,
  );
  const magasinId = rows[0]?.magasin_id;
  if (magasinId === undefined) throw new AppError('NOT_FOUND', 'Compte introuvable.');
  if (await numeroExiste(magasinId, input.numero, id)) {
    throw new AppError('VALIDATION', 'Ce numéro de compte existe déjà pour ce magasin.');
  }
  await execute(
    `UPDATE comptes SET numero = ${sqlValue(input.numero)}, libelle = ${sqlValue(input.libelle.trim())}, ` +
      `classe = ${sqlValue(input.classe)}, collectif = ${sqlValue(input.collectif)}, ` +
      `lettrable = ${sqlValue(input.lettrable)} WHERE id = ${sqlValue(id)}`,
  );
  return { id, magasin_id: magasinId, ...input, libelle: input.libelle.trim() };
}

export async function remove(id: number): Promise<void> {
  requireAdmin();
  const rows = await query<{ numero: string }>(
    `SELECT numero FROM comptes WHERE id = ${sqlValue(id)}`,
  );
  const numero = rows[0]?.numero;
  if (numero && estAncreCollectif(numero)) {
    throw new AppError('COMPTE_COLLECTIF', 'Compte collectif (ancre des tiers) : suppression interdite.');
  }
  // NB : ajouter un garde « utilisé dans une écriture » avec le module Écritures.
  await execute(`DELETE FROM comptes WHERE id = ${sqlValue(id)}`);
}
```

- [ ] **Step 2: Typecheck** — `npm run typecheck` (hors erreur preload connue). Corriger les chemins d'import si besoin (le service est dans `services/comptes/`, donc `../../db/connection`, `../auth`, `../common/...`, `../../../shared/ipc`, `../../../domain/compte`).

- [ ] **Step 3: Commit**

```bash
git add src/main/services/comptes/index.ts
git commit -m "services: CRUD comptes (unicité numéro, garde compte collectif)"
```

---

## Task 5: Handlers IPC `src/main/ipc.ts`

**Files:** Modify `src/main/ipc.ts`

- [ ] **Step 1: Import** (en haut)

```typescript
import * as comptes from './services/comptes';
import type { Compte, CompteInput } from '../shared/ipc';
```
(Ajouter `Compte`, `CompteInput` à l'import de types existant depuis `../shared/ipc`.)

- [ ] **Step 2: Handlers** (dans `registerIpcHandlers`, après les handlers exercices)

```typescript
  ipcMain.handle(IPC.comptesList, (_e, magasinId: number) =>
    wrap<Compte[]>(() => comptes.list(magasinId), 'comptes:list'));
  ipcMain.handle(IPC.comptesCreate, (_e, magasinId: number, input: CompteInput) =>
    wrap<Compte>(() => comptes.create(magasinId, input), 'comptes:create'));
  ipcMain.handle(IPC.comptesUpdate, (_e, id: number, input: CompteInput) =>
    wrap<Compte>(() => comptes.update(id, input), 'comptes:update'));
  ipcMain.handle(IPC.comptesDelete, (_e, id: number) =>
    wrap<null>(async () => { await comptes.remove(id); return null; }, 'comptes:delete'));
```

- [ ] **Step 3: Typecheck** → PASS (hors preload). **Commit**

```bash
git add src/main/ipc.ts
git commit -m "ipc: handlers comptes"
```

---

## Task 6: Preload `src/preload.ts`

**Files:** Modify `src/preload.ts`

- [ ] **Step 1: Relais** (dans l'objet `api`, après `exercices`)

```typescript
  comptes: {
    list: (magasinId) => ipcRenderer.invoke(IPC.comptesList, magasinId),
    create: (magasinId, input) => ipcRenderer.invoke(IPC.comptesCreate, magasinId, input),
    update: (id, input) => ipcRenderer.invoke(IPC.comptesUpdate, id, input),
    delete: (id) => ipcRenderer.invoke(IPC.comptesDelete, id),
  },
```

- [ ] **Step 2: Typecheck** → **PASS complet** (Api implémentée). **Commit**

```bash
git add src/preload.ts
git commit -m "preload: expose comptes"
```

---

## Task 7: Installer le composant shadcn `checkbox`

- [ ] **Step 1:** `npx shadcn@latest add checkbox` (réseau intermittent → relancer si `ENOTFOUND`). Si échec durable, signaler BLOCKED.
- [ ] **Step 2: Commit**

```bash
git add src/components/ui/checkbox.tsx
git commit -m "ui: ajoute le composant shadcn checkbox"
```

---

## Task 8: UI `src/features/comptes/ComptesModule.tsx`

**Files:** Create `src/features/comptes/ComptesModule.tsx`

Suivre le STYLE et les patrons de `src/features/societes/SocietesModule.tsx` (en-tête de page, `DropdownMenu` d'actions, `Dialog` stylé avec pastille icône + eyebrow + titre + sous-titre, footer Annuler `X` / Enregistrer `Save` en `size="lg"`, `formError` inline, `AlertDialog` de suppression, masquage si non-Admin). Spécificités ci-dessous.

- [ ] **Step 1: Implémenter**

```tsx
import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { BookOpen, Plus, Pencil, Trash2, MoreHorizontal, ChevronDown, Search, X, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { classeFromNumero } from '@/domain/compte';
import type { AuthUser, Compte, CompteInput, Magasin } from '@/shared/ipc';

const CLASSES: Record<number, string> = {
  1: 'Ressources durables', 2: 'Actif immobilisé', 3: 'Stocks', 4: 'Tiers',
  5: 'Trésorerie', 6: 'Charges', 7: 'Produits', 8: 'Autres charges/produits (HAO)',
  9: 'Comptabilité analytique',
};
const EMPTY: CompteInput = { numero: '', libelle: '', classe: 1, collectif: false, lettrable: false };

interface Props {
  user: AuthUser;
  magasin: Magasin | null;
}

export function ComptesModule({ user, magasin }: Props): React.JSX.Element {
  const isAdmin = user.role === 'Admin';
  const [rows, setRows] = useState<Compte[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');
  const [classeFilter, setClasseFilter] = useState<string>('all');
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({});
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Compte | null>(null);
  const [form, setForm] = useState<CompteInput>(EMPTY);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<Compte | null>(null);

  async function load() {
    if (!magasin) { setRows([]); return; }
    setLoading(true);
    const res = await window.api.comptes.list(magasin.id);
    if (res.success) setRows(res.data); else toast.error(res.error.message);
    setLoading(false);
  }
  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [magasin]);

  const filtered = useMemo(() => rows.filter((c) =>
    (classeFilter === 'all' || c.classe === Number(classeFilter)) &&
    (!q || `${c.numero} ${c.libelle}`.toLowerCase().includes(q.toLowerCase()))
  ), [rows, q, classeFilter]);

  const byClasse = useMemo(() => {
    const m = new Map<number, Compte[]>();
    for (const c of filtered) { (m.get(c.classe) ?? m.set(c.classe, []).get(c.classe)!).push(c); }
    return [...m.entries()].sort((a, b) => a[0] - b[0]);
  }, [filtered]);

  function openCreate() {
    setEditing(null); setForm(EMPTY); setFormError(null); setOpen(true);
  }
  function openEdit(c: Compte) {
    setEditing(c);
    setForm({ numero: c.numero, libelle: c.libelle, classe: c.classe, collectif: c.collectif, lettrable: c.lettrable });
    setFormError(null); setOpen(true);
  }
  function setNumero(numero: string) {
    const cl = classeFromNumero(numero);
    setForm((f) => ({ ...f, numero, classe: cl ?? f.classe }));
    setFormError(null);
  }

  async function save() {
    if (!magasin) return;
    setSaving(true);
    const res = editing
      ? await window.api.comptes.update(editing.id, form)
      : await window.api.comptes.create(magasin.id, form);
    setSaving(false);
    if (!res.success) {
      if (res.error.code === 'VALIDATION') setFormError(res.error.message);
      else toast.error(res.error.message);
      return;
    }
    toast.success(editing ? 'Compte modifié.' : 'Compte créé.');
    setOpen(false); await load();
  }

  async function confirmDelete() {
    if (!toDelete) return;
    const res = await window.api.comptes.delete(toDelete.id);
    setToDelete(null);
    if (!res.success) { toast.error(res.error.message); return; }
    toast.success('Compte supprimé.'); await load();
  }

  if (!magasin) {
    return (
      <div className="grid h-full place-items-center p-10 text-center">
        <p className="text-sm font-semibold text-muted-foreground">Sélectionnez un magasin pour afficher son plan comptable.</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Plan comptable</h2>
          <p className="mt-0.5 text-sm font-semibold text-muted-foreground">
            Référentiel SYSCOHADA — {rows.length} comptes pour {magasin.libelle}.
          </p>
        </div>
        {isAdmin && (
          <Button size="lg" onClick={openCreate}><Plus /> Nouveau compte</Button>
        )}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-56">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Rechercher un numéro ou un intitulé…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Select value={classeFilter} onValueChange={setClasseFilter}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les classes</SelectItem>
            {Object.entries(CLASSES).map(([k, v]) => (
              <SelectItem key={k} value={k}>Classe {k} — {v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading && <p className="text-sm text-muted-foreground">Chargement…</p>}
      {!loading && byClasse.length === 0 && <p className="text-sm text-muted-foreground">Aucun compte.</p>}

      <div className="flex flex-col gap-3">
        {byClasse.map(([classe, comptes]) => (
          <div key={classe} className="overflow-hidden rounded-lg border border-border bg-card">
            <button
              className="flex w-full items-center gap-2 px-4 py-3 text-left hover:bg-muted/50"
              onClick={() => setCollapsed((s) => ({ ...s, [classe]: !s[classe] }))}
            >
              <ChevronDown className={`size-4 text-muted-foreground transition-transform ${collapsed[classe] ? '-rotate-90' : ''}`} />
              <span className="font-bold">Classe {classe}</span>
              <span className="text-sm font-semibold text-muted-foreground">— {CLASSES[classe]}</span>
              <span className="ml-auto text-xs font-bold text-muted-foreground">{comptes.length} compte(s)</span>
            </button>
            {!collapsed[classe] && (
              <table className="w-full border-t border-border text-sm">
                <tbody>
                  {comptes.map((c) => (
                    <tr key={c.id} className="border-b border-border last:border-0">
                      <td className="w-28 px-4 py-2 font-mono font-bold text-primary">{c.numero}</td>
                      <td className="px-4 py-2 font-semibold">{c.libelle}</td>
                      <td className="px-4 py-2">
                        <div className="flex gap-1.5">
                          {c.collectif && <Badge variant="secondary">Collectif</Badge>}
                          {c.lettrable && <Badge variant="secondary">Lettrable</Badge>}
                        </div>
                      </td>
                      {isAdmin && (
                        <td className="w-12 px-4 py-2 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon-sm" aria-label="Actions"><MoreHorizontal /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEdit(c)}><Pencil /> Modifier</DropdownMenuItem>
                              <DropdownMenuItem variant="destructive" onClick={() => setToDelete(c)}><Trash2 /> Supprimer</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ))}
      </div>

      {/* Modal création/édition */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <div className="flex items-start gap-3">
              <span className="grid size-10 flex-none place-items-center rounded-lg bg-primary/10 text-primary"><BookOpen className="size-5" /></span>
              <div>
                <div className="text-[10.5px] font-bold uppercase tracking-wider text-primary">Plan comptable</div>
                <DialogTitle>{editing ? 'Modifier le compte' : 'Nouveau compte'}</DialogTitle>
                <p className="mt-0.5 text-sm text-muted-foreground">Ajouter un compte au plan comptable du magasin.</p>
              </div>
            </div>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="num">Numéro</Label>
                <Input id="num" className="font-mono" value={form.numero} autoFocus
                  onChange={(e) => setNumero(e.target.value)} placeholder="ex. 6181" />
              </div>
              <div className="grid gap-1.5">
                <Label>Classe</Label>
                <Select value={String(form.classe)} onValueChange={(v) => { setForm((f) => ({ ...f, classe: Number(v) })); setFormError(null); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.keys(CLASSES).map((k) => <SelectItem key={k} value={k}>Classe {k}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="lib">Intitulé</Label>
              <Input id="lib" value={form.libelle} onChange={(e) => { setForm((f) => ({ ...f, libelle: e.target.value })); setFormError(null); }} placeholder="ex. Transport sur achats" />
            </div>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 text-sm font-semibold">
                <Checkbox checked={form.collectif} onCheckedChange={(v) => setForm((f) => ({ ...f, collectif: v === true }))} /> Compte collectif
              </label>
              <label className="flex items-center gap-2 text-sm font-semibold">
                <Checkbox checked={form.lettrable} onCheckedChange={(v) => setForm((f) => ({ ...f, lettrable: v === true }))} /> Lettrable
              </label>
            </div>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" size="lg" onClick={() => setOpen(false)}><X /> Annuler</Button>
            <Button size="lg" onClick={() => void save()} disabled={saving || !form.numero || !form.libelle}>
              <Save /> {saving ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation suppression */}
      <AlertDialog open={toDelete !== null} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le compte ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le compte {toDelete?.numero} — {toDelete?.libelle} sera supprimé du plan comptable.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmDelete()}>Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
```

> Le `byClasse` ci-dessus utilise une astuce de Map ; si elle gêne le typecheck/lint, la réécrire en boucle claire (créer le tableau si absent puis push). Vérifier la signature de `Checkbox` (`onCheckedChange` reçoit `boolean | 'indeterminate'`).

- [ ] **Step 2: Typecheck + lint** → 0 erreur. Corriger le helper `byClasse` si nécessaire.

- [ ] **Step 3: Commit**

```bash
git add src/features/comptes/ComptesModule.tsx
git commit -m "ui: module Plan comptable (liste par classe, recherche, filtre, CRUD)"
```

---

## Task 9: Brancher le shell `src/components/layout/AppShell.tsx`

**Files:** Modify `src/components/layout/AppShell.tsx`

- [ ] **Step 1:** importer `ComptesModule` et ajouter le cas de route

```tsx
import { ComptesModule } from '@/features/comptes/ComptesModule';
```
Dans `renderRoute()`, ajouter avant `default` :
```tsx
      case 'plan':
        return <ComptesModule user={user} magasin={magasin} />;
```

- [ ] **Step 2: Typecheck + build** — `npm run typecheck` puis `node ./node_modules/vite/bin/vite.js build` → OK.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/AppShell.tsx
git commit -m "ui: route Plan comptable branchée dans le shell"
```

---

## Task 10: Vérification finale

- [ ] **Step 1:** `npm run typecheck && npm run lint && npm test` → tout vert (domain/compte + validation).
- [ ] **Step 2:** `node ./node_modules/vite/bin/vite.js build` → OK.
- [ ] **Step 3:** Checklist manuelle (base réelle, côté utilisateur) :
  1. Sélectionner un magasin → Plan comptable affiche les 117 comptes groupés par classe (repliable).
  2. Recherche + filtre par classe OK.
  3. Créer un compte (numéro 2–8 chiffres, unique) → apparaît dans la bonne classe.
  4. Doublon de numéro → message **inline** sous les champs (pas de toast).
  5. Supprimer un compte collectif (4011/4111) → bloqué (message).
  6. En Comptable : aucune action de mutation visible.

## Self-Review (effectué)
- Couverture spec : domaine (T1), types/IPC (T2,T5,T6), validation (T3), service CRUD + gardes (T4), UI groupée/filtre/CRUD (T8), shell (T9), vérif (T10). ✅
- Types cohérents : `Compte`/`CompteInput` définis T2, réutilisés T3/T4/T5/T6/T8. ✅
- Pas de soldes (décision spec). ✅
- Conventions : `size="lg"` + icônes, validation inline, AlertDialog, pas de modif `components/ui` hors `checkbox`. ✅
