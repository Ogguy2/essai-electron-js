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
import { TableSkeleton } from '@/components/skeletons';
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

      {loading && (
        <TableSkeleton columns={['w-32', 'flex-1', 'w-48', 'w-20', 'w-16', 'w-8']} />
      )}
      {!loading && rows.length === 0 && (
        <p className="text-sm text-muted-foreground">Aucun utilisateur.</p>
      )}

      {!loading && rows.length > 0 && (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom d&apos;utilisateur</TableHead>
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
                  Créer un nouveau compte d&apos;accès à SicoCompte.
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
              <Label htmlFor="cu-username">Nom d&apos;utilisateur</Label>
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
                  Modifier l&apos;utilisateur
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
                <Label>Nom d&apos;utilisateur</Label>
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
            <AlertDialogTitle>Désactiver l&apos;utilisateur ?</AlertDialogTitle>
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
