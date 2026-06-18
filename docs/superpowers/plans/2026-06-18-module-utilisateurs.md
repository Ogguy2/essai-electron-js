# Module Utilisateurs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the full Users module (module Utilisateurs) for SicoCompte — CRUD on `app_users` table, Admin-only, with a complete React UI using react-hook-form + zod.

**Architecture:** The module follows the exact same 4-layer pattern as `comptes`: domain types → service (`src/main/services/users/`) → IPC bridge (shared/ipc + preload + main/ipc) → React UI (`src/features/utilisateurs/`). The `app_users` table already exists in HFSQL. Passwords are hashed with bcryptjs in the main process and never reach the renderer.

**Tech Stack:** TypeScript strict, Electron IPC, node-odbc/HFSQL, bcryptjs, Zod, react-hook-form + zodResolver, shadcn/ui (Table, Dialog, AlertDialog, Select, Badge, DropdownMenu, Checkbox), lucide-react.

---

## File Map

| File | Create / Modify | Responsibility |
|------|-----------------|----------------|
| `src/types/domain.ts` | Modify | Add `User`, `UserCreateInput`, `UserUpdateInput` types |
| `src/shared/ipc.ts` | Modify | Re-export new types; add IPC channel constants; extend `Api` interface |
| `src/shared/schemas.ts` | Modify | Add `userCreateSchema`, `userUpdateSchema`, `passwordSchema` + inferred types |
| `src/shared/schemas.test.ts` | Modify | Add 3 tests for new schemas |
| `src/main/services/users/index.ts` | Create | Service: list, create, update, setPassword, remove (soft delete) |
| `src/main/ipc.ts` | Modify | Register 5 users IPC handlers |
| `src/preload.ts` | Modify | Expose `window.api.users` via contextBridge |
| `src/features/utilisateurs/UtilisateursModule.tsx` | Create | React UI: table + 3 modals + AlertDialog |
| `src/components/layout/AppShell.tsx` | Modify | Route `utilisateurs` → `<UtilisateursModule>` |

---

## Task 1: Domain types + Zod schemas + tests

**Files:**
- Modify: `src/types/domain.ts`
- Modify: `src/shared/schemas.ts`
- Modify: `src/shared/schemas.test.ts`

- [ ] **Step 1.1 — Add domain types to `src/types/domain.ts`**

Open `src/types/domain.ts`. After the `UpdateReadyPayload` interface (line 81), append:

```typescript
export interface User {
  id: number;
  username: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
}

export interface UserCreateInput {
  username: string;
  name: string;
  email: string;
  role: Role;
  password: string;
}

export interface UserUpdateInput {
  name: string;
  email: string;
  role: Role;
  active: boolean;
}
```

- [ ] **Step 1.2 — Add Zod schemas to `src/shared/schemas.ts`**

At the end of `src/shared/schemas.ts`, append:

```typescript
/** Création d'un utilisateur. */
export const userCreateSchema = z.object({
  username: z
    .string()
    .trim()
    .min(1, "Le nom d'utilisateur est obligatoire.")
    .max(50, 'Nom d\'utilisateur trop long (50 max).'),
  name: z.string().trim().min(1, 'Le nom est obligatoire.'),
  email: z.string().trim(),
  role: z.enum(['Admin', 'Comptable']),
  password: z.string().min(6, 'Mot de passe : 6 caractères minimum.'),
});
export type UserCreateFormValues = z.infer<typeof userCreateSchema>;

/** Modification d'un utilisateur (username et password hors scope). */
export const userUpdateSchema = z.object({
  name: z.string().trim().min(1, 'Le nom est obligatoire.'),
  email: z.string().trim(),
  role: z.enum(['Admin', 'Comptable']),
  active: z.boolean(),
});
export type UserUpdateFormValues = z.infer<typeof userUpdateSchema>;

/** Changement de mot de passe. */
export const passwordSchema = z.object({
  password: z.string().min(6, 'Mot de passe : 6 caractères minimum.'),
});
export type PasswordFormValues = z.infer<typeof passwordSchema>;
```

- [ ] **Step 1.3 — Add tests to `src/shared/schemas.test.ts`**

Add at the end of `src/shared/schemas.test.ts` (after the last `});`):

```typescript
import { userCreateSchema, userUpdateSchema, passwordSchema } from './schemas';

describe('userCreateSchema', () => {
  const base = {
    username: 'jdupont',
    name: 'Jean Dupont',
    email: 'jd@example.com',
    role: 'Comptable' as const,
    password: 'secret1',
  };

  it('refuse un username vide', () => {
    const res = userCreateSchema.safeParse({ ...base, username: '  ' });
    expect(res.success).toBe(false);
    if (!res.success) expect(firstZodError(res.error)).toBe("Le nom d'utilisateur est obligatoire.");
  });

  it('refuse un mot de passe trop court', () => {
    const res = userCreateSchema.safeParse({ ...base, password: '123' });
    expect(res.success).toBe(false);
    if (!res.success) expect(firstZodError(res.error)).toBe('Mot de passe : 6 caractères minimum.');
  });

  it('accepte une saisie valide et nettoie username', () => {
    const res = userCreateSchema.safeParse({ ...base, username: '  jdupont  ' });
    expect(res.success).toBe(true);
    if (res.success) expect(res.data.username).toBe('jdupont');
  });
});

describe('passwordSchema', () => {
  it('refuse moins de 6 caractères', () => {
    const res = passwordSchema.safeParse({ password: '12345' });
    expect(res.success).toBe(false);
    if (!res.success) expect(firstZodError(res.error)).toBe('Mot de passe : 6 caractères minimum.');
  });

  it('accepte un mot de passe valide', () => {
    const res = passwordSchema.safeParse({ password: 'abcdef' });
    expect(res.success).toBe(true);
  });
});
```

Note: The import for `userCreateSchema`, `userUpdateSchema`, `passwordSchema` and `firstZodError` should come from `'./schemas'` — `firstZodError` is already imported at the top of the test file, so only add the new schema imports.

- [ ] **Step 1.4 — Run tests to verify they pass**

```
npx vitest run src/shared/schemas.test.ts
```

Expected: All tests green (including the 3 new `userCreateSchema` + `passwordSchema` suites).

- [ ] **Step 1.5 — Typecheck**

```
npm run typecheck
```

Expected: 0 errors.

- [ ] **Step 1.6 — Commit**

```
git add src/types/domain.ts src/shared/schemas.ts src/shared/schemas.test.ts
git commit -m "feat(users): types domaine, schémas zod et tests"
```

---

## Task 2: Re-export types + extend IPC contract

**Files:**
- Modify: `src/shared/ipc.ts`

- [ ] **Step 2.1 — Add re-exports and IPC channels in `src/shared/ipc.ts`**

In the re-exports block (around line 18–33), add `User`, `UserCreateInput`, `UserUpdateInput` to the export list:

```typescript
export type {
  Role,
  AuthUser,
  Societe,
  SocieteInput,
  Magasin,
  MagasinInput,
  Exercice,
  Compte,
  CompteInput,
  Journal,
  JournalInput,
  Tiers,
  TiersInput,
  User,
  UserCreateInput,
  UserUpdateInput,
  UpdateReadyPayload,
} from '../types/domain';
```

- [ ] **Step 2.2 — Add the local imports for the new types**

In the local imports block (around line 37–51), add:

```typescript
import type {
  AuthUser,
  UpdateReadyPayload,
  Societe,
  SocieteInput,
  Magasin,
  MagasinInput,
  Exercice,
  Compte,
  CompteInput,
  Journal,
  JournalInput,
  Tiers,
  TiersInput,
  User,
  UserCreateInput,
  UserUpdateInput,
} from '../types/domain';
```

- [ ] **Step 2.3 — Add IPC channel constants**

In the `IPC` const object (after `tiersDelete: 'tiers:delete'`, before `} as const`), append:

```typescript
  usersList: 'users:list',
  usersCreate: 'users:create',
  usersUpdate: 'users:update',
  usersSetPassword: 'users:set-password',
  usersDelete: 'users:delete',
```

- [ ] **Step 2.4 — Extend the Api interface**

In the `Api` interface (after the `tiers` block, before the closing `}`), append:

```typescript
  users: {
    list(): Promise<IpcResult<User[]>>;
    create(input: UserCreateInput): Promise<IpcResult<User>>;
    update(id: number, input: UserUpdateInput): Promise<IpcResult<User>>;
    setPassword(id: number, password: string): Promise<IpcResult<null>>;
    delete(id: number): Promise<IpcResult<null>>;
  };
```

- [ ] **Step 2.5 — Typecheck**

```
npm run typecheck
```

Expected: 0 errors (the Api interface will fail to match `preload.ts` until Task 3, but the types themselves are valid).

Actually, TypeScript will error because `preload.ts` exposes an object typed as `Api` but doesn't have `users` yet. Run typecheck after Task 3 instead. Skip for now.

- [ ] **Step 2.6 — Commit (schema + ipc contract only)**

```
git add src/shared/ipc.ts
git commit -m "feat(users): contrat IPC (canaux + interface Api)"
```

---

## Task 3: Service main process

**Files:**
- Create: `src/main/services/users/index.ts`

- [ ] **Step 3.1 — Create `src/main/services/users/index.ts`**

Create the file with the full service implementation:

```typescript
import bcrypt from 'bcryptjs';
import type { User, UserCreateInput, UserUpdateInput } from '../../../shared/ipc';
import { query, execute, insertReturningId, sqlValue, toBool } from '../../db/connection';
import { requireAdmin, currentSession } from '../auth';
import { userCreateSchema, userUpdateSchema, passwordSchema, firstZodError } from '../../../shared/schemas';
import { AppError } from '../common/errors';

/** Service Utilisateurs (processus principal). Toutes les mutations sont Admin. */

export async function list(): Promise<User[]> {
  const rows = await query<Record<string, unknown>>(
    `SELECT id, username, name, email, role, active FROM app_users ORDER BY username`,
  );
  return rows.map((r) => ({
    id: Number(r.id),
    username: String(r.username ?? ''),
    name: String(r.name ?? ''),
    email: String(r.email ?? ''),
    role: String(r.role ?? 'Comptable') as User['role'],
    active: toBool(r.active),
  }));
}

async function usernameExiste(username: string, exceptId?: number): Promise<boolean> {
  const extra = exceptId !== undefined ? ` AND id <> ${sqlValue(exceptId)}` : '';
  const rows = await query<{ n: number }>(
    `SELECT COUNT(*) AS n FROM app_users WHERE username = ${sqlValue(username)}${extra}`,
  );
  return (rows[0]?.n ?? 0) > 0;
}

export async function create(input: UserCreateInput): Promise<User> {
  requireAdmin();
  const parsed = userCreateSchema.safeParse(input);
  if (!parsed.success) throw new AppError('VALIDATION', firstZodError(parsed.error));
  const data = parsed.data;
  if (await usernameExiste(data.username)) {
    throw new AppError('VALIDATION', "Ce nom d'utilisateur existe déjà.");
  }
  const hash = bcrypt.hashSync(data.password, 10);
  const id = await insertReturningId(
    `INSERT INTO app_users (username, password_hash, name, email, role, active) VALUES (` +
      `${sqlValue(data.username)}, ${sqlValue(hash)}, ${sqlValue(data.name)}, ` +
      `${sqlValue(data.email)}, ${sqlValue(data.role)}, 1)`,
    'app_users',
  );
  return {
    id,
    username: data.username,
    name: data.name,
    email: data.email,
    role: data.role,
    active: true,
  };
}

export async function update(id: number, input: UserUpdateInput): Promise<User> {
  requireAdmin();
  const parsed = userUpdateSchema.safeParse(input);
  if (!parsed.success) throw new AppError('VALIDATION', firstZodError(parsed.error));
  const data = parsed.data;
  const rows = await query<{ username: string }>(
    `SELECT username FROM app_users WHERE id = ${sqlValue(id)}`,
  );
  if (!rows[0]) throw new AppError('NOT_FOUND', 'Utilisateur introuvable.');
  const username = rows[0].username;
  await execute(
    `UPDATE app_users SET name = ${sqlValue(data.name)}, email = ${sqlValue(data.email)}, ` +
      `role = ${sqlValue(data.role)}, active = ${data.active ? '1' : '0'} WHERE id = ${sqlValue(id)}`,
  );
  return { id, username, name: data.name, email: data.email, role: data.role, active: data.active };
}

export async function setPassword(id: number, password: string): Promise<void> {
  requireAdmin();
  const parsed = passwordSchema.safeParse({ password });
  if (!parsed.success) throw new AppError('VALIDATION', firstZodError(parsed.error));
  const hash = bcrypt.hashSync(parsed.data.password, 10);
  const rows = await query<{ id: number }>(
    `SELECT id FROM app_users WHERE id = ${sqlValue(id)}`,
  );
  if (!rows[0]) throw new AppError('NOT_FOUND', 'Utilisateur introuvable.');
  await execute(
    `UPDATE app_users SET password_hash = ${sqlValue(hash)} WHERE id = ${sqlValue(id)}`,
  );
}

export async function remove(id: number): Promise<void> {
  requireAdmin();
  const session = currentSession();
  // Garde : empêcher de se désactiver soi-même.
  const rows = await query<{ username: string }>(
    `SELECT username FROM app_users WHERE id = ${sqlValue(id)}`,
  );
  if (!rows[0]) throw new AppError('NOT_FOUND', 'Utilisateur introuvable.');
  if (session && session.username === rows[0].username) {
    throw new AppError('FORBIDDEN', 'Vous ne pouvez pas désactiver votre propre compte.');
  }
  await execute(`UPDATE app_users SET active = 0 WHERE id = ${sqlValue(id)}`);
}
```

- [ ] **Step 3.2 — Typecheck**

```
npm run typecheck
```

Expected: 0 errors from `src/main/services/users/index.ts` (may still have 1 error from preload not having `users` yet — that's resolved in Task 4).

- [ ] **Step 3.3 — Commit**

```
git add src/main/services/users/index.ts
git commit -m "feat(users): service main (list/create/update/setPassword/remove)"
```

---

## Task 4: IPC handlers + preload bridge

**Files:**
- Modify: `src/main/ipc.ts`
- Modify: `src/preload.ts`

- [ ] **Step 4.1 — Register handlers in `src/main/ipc.ts`**

At the top of `src/main/ipc.ts`, add the users import alongside the other service imports:

```typescript
import * as users from './services/users';
```

Also add the new types to the type imports from `'../shared/ipc'`:

```typescript
import { IPC, type AuthUser, type IpcResult, type Societe, type Magasin, type Exercice, type SocieteInput, type MagasinInput, type Compte, type CompteInput, type Journal, type JournalInput, type Tiers, type TiersInput, type User, type UserCreateInput, type UserUpdateInput } from '../shared/ipc';
```

At the end of the `registerIpcHandlers()` function body (just before the closing `}`), append:

```typescript
  ipcMain.handle(IPC.usersList, () =>
    wrap<User[]>(() => users.list(), 'users:list'));
  ipcMain.handle(IPC.usersCreate, (_e, input: UserCreateInput) =>
    wrap<User>(() => users.create(input), 'users:create'));
  ipcMain.handle(IPC.usersUpdate, (_e, id: number, input: UserUpdateInput) =>
    wrap<User>(() => users.update(id, input), 'users:update'));
  ipcMain.handle(IPC.usersSetPassword, (_e, id: number, password: string) =>
    wrap<null>(async () => { await users.setPassword(id, password); return null; }, 'users:set-password'));
  ipcMain.handle(IPC.usersDelete, (_e, id: number) =>
    wrap<null>(async () => { await users.remove(id); return null; }, 'users:delete'));
```

- [ ] **Step 4.2 — Expose in `src/preload.ts`**

In `src/preload.ts`, in the `api` object (after the `tiers` block, before the `};`), append:

```typescript
  users: {
    list: () => ipcRenderer.invoke(IPC.usersList),
    create: (input) => ipcRenderer.invoke(IPC.usersCreate, input),
    update: (id, input) => ipcRenderer.invoke(IPC.usersUpdate, id, input),
    setPassword: (id, password) => ipcRenderer.invoke(IPC.usersSetPassword, id, password),
    delete: (id) => ipcRenderer.invoke(IPC.usersDelete, id),
  },
```

- [ ] **Step 4.3 — Typecheck (full pass)**

```
npm run typecheck
```

Expected: 0 errors. All three layers (ipc.ts, preload.ts, Api interface) now agree.

- [ ] **Step 4.4 — Commit**

```
git add src/main/ipc.ts src/preload.ts
git commit -m "feat(users): handlers IPC et pont preload"
```

---

## Task 5: React UI — UtilisateursModule

**Files:**
- Create: `src/features/utilisateurs/UtilisateursModule.tsx`
- Modify: `src/components/layout/AppShell.tsx`

- [ ] **Step 5.1 — Create `src/features/utilisateurs/UtilisateursModule.tsx`**

```typescript
import React, { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  Settings, Plus, Pencil, KeyRound, UserX, MoreHorizontal, Save, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  userCreateSchema, userUpdateSchema, passwordSchema,
  type UserCreateFormValues, type UserUpdateFormValues, type PasswordFormValues,
} from '@/shared/schemas';
import type { AuthUser, User } from '@/shared/ipc';

interface Props {
  user: AuthUser;
}

export function UtilisateursModule({ user }: Props): React.JSX.Element {
  if (user.role !== 'Admin') {
    return (
      <div className="grid h-full place-items-center p-10 text-center">
        <p className="text-sm font-semibold text-muted-foreground">
          Réservé aux administrateurs.
        </p>
      </div>
    );
  }

  const [rows, setRows] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  // Modal état
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<User | null>(null);
  const [pwdTarget, setPwdTarget] = useState<User | null>(null);
  const [disableTarget, setDisableTarget] = useState<User | null>(null);

  // Forms
  const createForm = useForm<UserCreateFormValues>({
    resolver: zodResolver(userCreateSchema),
    defaultValues: { username: '', name: '', email: '', role: 'Comptable', password: '' },
  });
  const editForm = useForm<UserUpdateFormValues>({
    resolver: zodResolver(userUpdateSchema),
    defaultValues: { name: '', email: '', role: 'Comptable', active: true },
  });
  const pwdForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { password: '' },
  });

  async function load() {
    setLoading(true);
    const res = await window.api.users.list();
    if (res.success) setRows(res.data); else toast.error(res.error.message);
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  // --- Création ---
  async function onCreateValid(values: UserCreateFormValues) {
    const res = await window.api.users.create(values);
    if (!res.success) {
      if (res.error.code === 'VALIDATION') {
        createForm.setError('username', { message: res.error.message });
      } else {
        toast.error(res.error.message);
      }
      return;
    }
    toast.success('Utilisateur créé.');
    setCreateOpen(false);
    createForm.reset();
    await load();
  }

  // --- Édition ---
  function openEdit(u: User) {
    editForm.reset({ name: u.name, email: u.email, role: u.role, active: u.active });
    setEditTarget(u);
  }

  async function onEditValid(values: UserUpdateFormValues) {
    if (!editTarget) return;
    const res = await window.api.users.update(editTarget.id, values);
    if (!res.success) {
      toast.error(res.error.message);
      return;
    }
    toast.success('Utilisateur modifié.');
    setEditTarget(null);
    await load();
  }

  // --- Changement de mot de passe ---
  function openPwd(u: User) {
    pwdForm.reset({ password: '' });
    setPwdTarget(u);
  }

  async function onPwdValid(values: PasswordFormValues) {
    if (!pwdTarget) return;
    const res = await window.api.users.setPassword(pwdTarget.id, values.password);
    if (!res.success) {
      if (res.error.code === 'VALIDATION') {
        pwdForm.setError('password', { message: res.error.message });
      } else {
        toast.error(res.error.message);
      }
      return;
    }
    toast.success('Mot de passe modifié.');
    setPwdTarget(null);
  }

  // --- Désactivation ---
  async function confirmDisable() {
    if (!disableTarget) return;
    const res = await window.api.users.delete(disableTarget.id);
    setDisableTarget(null);
    if (!res.success) { toast.error(res.error.message); return; }
    toast.success('Utilisateur désactivé.');
    await load();
  }

  return (
    <div className="p-6 pb-16">
      {/* En-tête */}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight leading-tight flex items-center gap-2">
            <Settings size={22} />
            Utilisateurs
          </h1>
          <p className="mt-1 text-sm font-semibold text-muted-foreground">
            {rows.length} compte{rows.length !== 1 ? 's' : ''} — accès réservé aux administrateurs.
          </p>
        </div>
        <Button size="lg" onClick={() => { createForm.reset(); setCreateOpen(true); }}>
          <Plus /> Nouvel utilisateur
        </Button>
      </div>

      {loading && <p className="text-sm text-muted-foreground">Chargement…</p>}
      {!loading && rows.length === 0 && (
        <p className="text-sm text-muted-foreground">Aucun utilisateur.</p>
      )}

      {!loading && rows.length > 0 && (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom d'utilisateur</TableHead>
                <TableHead>Nom</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead>État</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-mono font-semibold">{u.username}</TableCell>
                  <TableCell className="font-semibold">{u.name}</TableCell>
                  <TableCell className="text-muted-foreground">{u.email || '—'}</TableCell>
                  <TableCell>
                    <Badge variant={u.role === 'Admin' ? 'default' : 'secondary'}>
                      {u.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.active ? 'default' : 'outline'}>
                      {u.active ? 'Actif' : 'Inactif'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm" aria-label="Actions">
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(u)}>
                          <Pencil /> Modifier
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openPwd(u)}>
                          <KeyRound /> Changer le mot de passe
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => setDisableTarget(u)}
                        >
                          <UserX /> Désactiver
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Modal : Créer un utilisateur */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[480px]" showCloseButton={false}>
          <DialogHeader>
            <div className="flex items-start gap-[13px] border-b border-border pb-[18px] -mt-1">
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Settings size={20} />
              </span>
              <div className="flex-1 min-w-0 pr-7">
                <p className="text-[10.5px] font-bold uppercase tracking-widest text-primary mb-1">
                  Utilisateurs
                </p>
                <DialogTitle className="text-[17px] font-bold leading-tight">
                  Nouvel utilisateur
                </DialogTitle>
                <p className="mt-1 text-[13px] font-medium text-muted-foreground leading-snug">
                  Créer un nouveau compte d'accès à SicoCompte.
                </p>
              </div>
              <Button variant="ghost" size="icon-sm" className="absolute top-3 right-3"
                onClick={() => setCreateOpen(false)}>
                <X /><span className="sr-only">Fermer</span>
              </Button>
            </div>
          </DialogHeader>

          <form
            id="user-create-form"
            onSubmit={createForm.handleSubmit(onCreateValid)}
            className="flex flex-col gap-[14px] pb-2 pt-1"
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cu-username">Nom d'utilisateur</Label>
              <Input
                id="cu-username"
                className="font-mono"
                autoFocus
                aria-invalid={createForm.formState.errors.username ? 'true' : undefined}
                {...createForm.register('username')}
              />
              {createForm.formState.errors.username && (
                <p className="text-sm text-destructive">{createForm.formState.errors.username.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cu-name">Nom complet</Label>
              <Input
                id="cu-name"
                aria-invalid={createForm.formState.errors.name ? 'true' : undefined}
                {...createForm.register('name')}
              />
              {createForm.formState.errors.name && (
                <p className="text-sm text-destructive">{createForm.formState.errors.name.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cu-email">Email</Label>
              <Input id="cu-email" type="email" {...createForm.register('email')} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Rôle</Label>
              <Controller
                name="role"
                control={createForm.control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Admin">Admin</SelectItem>
                      <SelectItem value="Comptable">Comptable</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cu-password">Mot de passe</Label>
              <Input
                id="cu-password"
                type="password"
                aria-invalid={createForm.formState.errors.password ? 'true' : undefined}
                {...createForm.register('password')}
              />
              {createForm.formState.errors.password && (
                <p className="text-sm text-destructive">{createForm.formState.errors.password.message}</p>
              )}
            </div>
          </form>

          <DialogFooter>
            <Button variant="outline" size="lg" onClick={() => setCreateOpen(false)}>
              <X /> Annuler
            </Button>
            <Button size="lg" type="submit" form="user-create-form"
              disabled={createForm.formState.isSubmitting}>
              <Save /> {createForm.formState.isSubmitting ? 'Enregistrement…' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal : Modifier un utilisateur */}
      <Dialog open={editTarget !== null} onOpenChange={(o) => { if (!o) setEditTarget(null); }}>
        <DialogContent className="sm:max-w-[480px]" showCloseButton={false}>
          <DialogHeader>
            <div className="flex items-start gap-[13px] border-b border-border pb-[18px] -mt-1">
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Pencil size={20} />
              </span>
              <div className="flex-1 min-w-0 pr-7">
                <p className="text-[10.5px] font-bold uppercase tracking-widest text-primary mb-1">
                  Utilisateurs
                </p>
                <DialogTitle className="text-[17px] font-bold leading-tight">
                  Modifier l'utilisateur
                </DialogTitle>
                {editTarget && (
                  <p className="mt-1 text-[13px] font-medium text-muted-foreground leading-snug font-mono">
                    {editTarget.username}
                  </p>
                )}
              </div>
              <Button variant="ghost" size="icon-sm" className="absolute top-3 right-3"
                onClick={() => setEditTarget(null)}>
                <X /><span className="sr-only">Fermer</span>
              </Button>
            </div>
          </DialogHeader>

          <form
            id="user-edit-form"
            onSubmit={editForm.handleSubmit(onEditValid)}
            className="flex flex-col gap-[14px] pb-2 pt-1"
          >
            {/* Username en lecture seule */}
            {editTarget && (
              <div className="flex flex-col gap-1.5">
                <Label>Nom d'utilisateur</Label>
                <Input value={editTarget.username} readOnly className="font-mono bg-muted" />
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="eu-name">Nom complet</Label>
              <Input
                id="eu-name"
                autoFocus
                aria-invalid={editForm.formState.errors.name ? 'true' : undefined}
                {...editForm.register('name')}
              />
              {editForm.formState.errors.name && (
                <p className="text-sm text-destructive">{editForm.formState.errors.name.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="eu-email">Email</Label>
              <Input id="eu-email" type="email" {...editForm.register('email')} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Rôle</Label>
              <Controller
                name="role"
                control={editForm.control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Admin">Admin</SelectItem>
                      <SelectItem value="Comptable">Comptable</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <Controller
              name="active"
              control={editForm.control}
              render={({ field }) => (
                <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={(v) => field.onChange(v === true)}
                  />
                  Compte actif
                </label>
              )}
            />
          </form>

          <DialogFooter>
            <Button variant="outline" size="lg" onClick={() => setEditTarget(null)}>
              <X /> Annuler
            </Button>
            <Button size="lg" type="submit" form="user-edit-form"
              disabled={editForm.formState.isSubmitting}>
              <Save /> {editForm.formState.isSubmitting ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal : Changer le mot de passe */}
      <Dialog open={pwdTarget !== null} onOpenChange={(o) => { if (!o) setPwdTarget(null); }}>
        <DialogContent className="sm:max-w-[400px]" showCloseButton={false}>
          <DialogHeader>
            <div className="flex items-start gap-[13px] border-b border-border pb-[18px] -mt-1">
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-primary/10 text-primary">
                <KeyRound size={20} />
              </span>
              <div className="flex-1 min-w-0 pr-7">
                <p className="text-[10.5px] font-bold uppercase tracking-widest text-primary mb-1">
                  Utilisateurs
                </p>
                <DialogTitle className="text-[17px] font-bold leading-tight">
                  Changer le mot de passe
                </DialogTitle>
                {pwdTarget && (
                  <p className="mt-1 text-[13px] font-medium text-muted-foreground leading-snug font-mono">
                    {pwdTarget.username}
                  </p>
                )}
              </div>
              <Button variant="ghost" size="icon-sm" className="absolute top-3 right-3"
                onClick={() => setPwdTarget(null)}>
                <X /><span className="sr-only">Fermer</span>
              </Button>
            </div>
          </DialogHeader>

          <form
            id="user-pwd-form"
            onSubmit={pwdForm.handleSubmit(onPwdValid)}
            className="flex flex-col gap-[14px] pb-2 pt-1"
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pwd-password">Nouveau mot de passe</Label>
              <Input
                id="pwd-password"
                type="password"
                autoFocus
                aria-invalid={pwdForm.formState.errors.password ? 'true' : undefined}
                {...pwdForm.register('password')}
              />
              {pwdForm.formState.errors.password && (
                <p className="text-sm text-destructive">{pwdForm.formState.errors.password.message}</p>
              )}
            </div>
          </form>

          <DialogFooter>
            <Button variant="outline" size="lg" onClick={() => setPwdTarget(null)}>
              <X /> Annuler
            </Button>
            <Button size="lg" type="submit" form="user-pwd-form"
              disabled={pwdForm.formState.isSubmitting}>
              <Save /> {pwdForm.formState.isSubmitting ? 'Enregistrement…' : 'Modifier'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AlertDialog : Désactiver */}
      <AlertDialog
        open={disableTarget !== null}
        onOpenChange={(o) => { if (!o) setDisableTarget(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Désactiver l'utilisateur ?</AlertDialogTitle>
            <AlertDialogDescription>
              {disableTarget &&
                `Le compte « ${disableTarget.username} » sera désactivé. L'historique est conservé.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => void confirmDisable()}
            >
              Désactiver
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
```

- [ ] **Step 5.2 — Wire route in `src/components/layout/AppShell.tsx`**

Add the import at the top of `src/components/layout/AppShell.tsx` (alongside the other module imports):

```typescript
import { UtilisateursModule } from '@/features/utilisateurs/UtilisateursModule';
```

In the `renderRoute()` function, add a `case` before `default`:

```typescript
      case 'utilisateurs':
        return <UtilisateursModule user={user} />;
```

- [ ] **Step 5.3 — Full typecheck**

```
npm run typecheck
```

Expected: 0 errors.

- [ ] **Step 5.4 — Lint**

```
npm run lint
```

Expected: 0 warnings/errors.

- [ ] **Step 5.5 — Run all tests**

```
npx vitest run
```

Expected: All green (new schema tests pass, existing tests unaffected).

- [ ] **Step 5.6 — Vite renderer build validation**

```
node ./node_modules/vite/bin/vite.js build
```

Expected: Build succeeds (0 errors). This validates Tailwind imports, TypeScript resolution, and all shadcn/ui component imports.

- [ ] **Step 5.7 — Commit**

```
git add src/features/utilisateurs/UtilisateursModule.tsx src/components/layout/AppShell.tsx
git commit -m "feat(users): module UI Utilisateurs et branchement dans AppShell"
```

---

## Self-Review Checklist

**Spec coverage:**
- [x] `app_users` table (no new schema file)
- [x] `list()` → SELECT id/username/name/email/role/active, `active: toBool()`
- [x] `usernameExiste()` helper (COUNT)
- [x] `create()`: requireAdmin, safeParse, unicité username, bcrypt.hashSync, insertReturningId
- [x] `update()`: requireAdmin, safeParse, UPDATE name/email/role/active (NOT username/password)
- [x] `setPassword()`: requireAdmin, passwordSchema, bcrypt.hashSync
- [x] `remove()`: soft delete (active=0), self-disable guard via currentSession()
- [x] IPC channels: `users:list`, `users:create`, `users:update`, `users:set-password`, `users:delete`
- [x] preload: all 5 methods exposed on `window.api.users`
- [x] UI: Table with all columns (username font-mono, Badge role, Badge active)
- [x] UI: 3 modals (create/edit/password) + AlertDialog (disable)
- [x] UI: non-Admin guard message
- [x] UI: VALIDATION errors → setError on field; other errors → toast
- [x] AppShell: `case 'utilisateurs'` added
- [x] `password_hash` never exits the main process
- [x] No `toAsciiUpper` applied (spec: username/email case-sensitive, sqlValue deaccents already)
- [x] No `src/components/ui/` files touched
- [x] bcryptjs: import is `import bcrypt from 'bcryptjs'` (already a dep)
- [x] Schemas test file updated with 3+ new tests

**Placeholder scan:** No TBD/TODO in the plan. All code blocks are complete.

**Type consistency:**
- `User.role` typed as `User['role']` (picks up `Role = 'Admin' | 'Comptable'` from domain)
- `userCreateSchema` / `UserCreateFormValues` used consistently in create form
- `userUpdateSchema` / `UserUpdateFormValues` used consistently in edit form
- `passwordSchema` / `PasswordFormValues` used consistently in password form
- `window.api.users.setPassword(id, password)` matches `Api.users.setPassword(id: number, password: string)`
- `IPC.usersSetPassword` used in both preload and ipc.ts handlers
