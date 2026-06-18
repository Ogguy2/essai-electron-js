import React, { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  Plus, Save, X, Store, Building2, MoreHorizontal, Pencil, Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { magasinInputSchema, type MagasinFormValues } from '@/shared/schemas';
import type { AuthUser, Magasin, Societe } from '@/shared/ipc';

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
  const [open, setOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Magasin | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<MagasinFormValues>({
    resolver: zodResolver(magasinInputSchema),
    defaultValues: { libelle: '', societe_id: 0 },
  });

  const societeById = (id: number): Societe | undefined => societes.find((s) => s.id === id);

  async function load() {
    setLoading(true);
    const [mRes, sRes] = await Promise.all([
      window.api.magasins.list(),
      window.api.societes.list(),
    ]);
    if (mRes.success) setRows(mRes.data); else toast.error(mRes.error.message);
    if (sRes.success) setSocietes(sRes.data);
    setLoading(false);
  }
  useEffect(() => { void load(); }, []);

  function openCreate() {
    setEditing(null);
    reset({ libelle: '', societe_id: societes[0]?.id ?? 0 });
    setOpen(true);
  }
  function openEdit(m: Magasin) {
    setEditing(m);
    reset({ libelle: m.libelle, societe_id: m.societe_id });
    setOpen(true);
  }

  async function onValid(values: MagasinFormValues) {
    const res = editing
      ? await window.api.magasins.update(editing.id, values)
      : await window.api.magasins.create(values);
    if (!res.success) {
      if (res.error.code === 'VALIDATION') {
        setError('libelle', { message: res.error.message });
      } else {
        toast.error(res.error.message);
      }
      return;
    }
    toast.success(editing ? 'Magasin modifié.' : 'Magasin créé — plan comptable initialisé (117 comptes).');
    setOpen(false);
    await load();
    onChanged?.();
  }

  async function confirmDelete() {
    if (deleteTarget === null) return;
    const res = await window.api.magasins.delete(deleteTarget.id);
    setDeleteTarget(null);
    if (!res.success) { toast.error(res.error.message); return; }
    toast.success('Magasin supprimé.');
    await load();
    onChanged?.();
  }

  return (
    <div className="p-6 pb-16 max-w-[1480px] mx-auto">
      {/* En-tête de page */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight leading-tight">Magasins</h1>
          <p className="mt-1 text-sm font-semibold text-muted-foreground max-w-lg">
            Entités comptables isolées (comptes, journaux, écritures par magasin).
            L'identité légale est portée par la société de rattachement.
          </p>
        </div>
        {isAdmin && (
          <Button size="lg" onClick={openCreate}>
            <Plus /> Nouveau magasin
          </Button>
        )}
      </div>

      {/* Grille de cartes */}
      {loading ? (
        <p className="text-muted-foreground text-sm">Chargement…</p>
      ) : rows.length === 0 ? (
        <p className="text-muted-foreground text-sm">Aucun magasin.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {rows.map((m) => {
            const soc = societeById(m.societe_id);
            return (
              <div
                key={m.id}
                className="rounded-lg border border-border bg-card shadow-sm px-5 py-[18px]"
              >
                {/* Header de la carte */}
                <div className="flex items-start gap-[13px] mb-[14px]">
                  <span className="flex h-12 w-12 flex-none items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Store size={22} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[18px] font-semibold leading-tight truncate">{m.libelle}</div>
                    <div className="flex items-center gap-1 text-[12.5px] font-bold text-muted-foreground mt-0.5">
                      <Building2 size={13} className="flex-none" />
                      {soc ? soc.raison_sociale : '—'}
                    </div>
                  </div>
                  {isAdmin && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm" aria-label="Actions">
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem className="gap-2" onClick={() => openEdit(m)}>
                          <Pencil size={15} /> Modifier
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          className="gap-2"
                          onClick={() => setDeleteTarget(m)}
                        >
                          <Trash2 size={15} /> Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>

                {/* Infos légales (depuis la société) */}
                <div className="grid grid-cols-2 gap-x-5 gap-y-3 border-t border-border pt-[14px]">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-muted-foreground">RCCM (société)</span>
                    <b className="text-[13.5px] font-bold font-mono">{soc?.rccm || '—'}</b>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-muted-foreground">Téléphone</span>
                    <b className="text-[13.5px] font-bold">{soc?.telephone || '—'}</b>
                  </div>
                  <div className="col-span-2 flex flex-col gap-0.5">
                    <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-muted-foreground">Adresse (société)</span>
                    <b className="text-[13.5px] font-bold">{soc?.adresse || '—'}</b>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal création / édition */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[560px]" showCloseButton={false}>
          <DialogHeader>
            <div className="flex items-start gap-[13px] border-b border-border pb-[18px] -mt-1">
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Store size={20} />
              </span>
              <div className="flex-1 min-w-0 pr-7">
                <p className="text-[10.5px] font-bold uppercase tracking-widest text-primary mb-1">
                  {editing ? 'Magasin' : 'Nouvelle entité'}
                </p>
                <p className="text-[17px] font-bold leading-tight">
                  {editing ? 'Modifier le magasin' : 'Nouveau magasin'}
                </p>
                {!editing && (
                  <p className="mt-1 text-[13px] font-medium text-muted-foreground leading-snug">
                    Le plan comptable SYSCOHADA sera pré-chargé automatiquement.
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                className="absolute top-3 right-3"
                onClick={() => setOpen(false)}
              >
                <X />
                <span className="sr-only">Fermer</span>
              </Button>
            </div>
          </DialogHeader>

          <form
            id="magasin-form"
            onSubmit={handleSubmit(onValid)}
            className="flex flex-col gap-[14px] pb-2 pt-1"
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="lib">Libellé du magasin</Label>
              <Input
                id="lib"
                placeholder="ex. Siconex - Treichville"
                autoFocus
                aria-invalid={errors.libelle ? 'true' : undefined}
                {...register('libelle')}
              />
              {errors.libelle && (
                <p className="text-sm text-destructive">{errors.libelle.message}</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Société de rattachement</Label>
              <Controller
                name="societe_id"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value ? String(field.value) : undefined}
                    onValueChange={(v) => field.onChange(parseInt(v, 10))}
                  >
                    <SelectTrigger aria-invalid={errors.societe_id ? 'true' : undefined}>
                      <SelectValue placeholder="Choisir une société" />
                    </SelectTrigger>
                    <SelectContent>
                      {societes.map((s) => (
                        <SelectItem key={s.id} value={String(s.id)}>{s.raison_sociale}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.societe_id && (
                <p className="text-sm text-destructive">{errors.societe_id.message}</p>
              )}
              <p className="text-[11.5px] font-semibold text-muted-foreground">
                L'identité légale (RCCM, adresse, téléphone) du cartouche provient de cette société.
              </p>
            </div>
          </form>

          <DialogFooter>
            <Button variant="outline" size="lg" onClick={() => setOpen(false)}>
              <X /> Annuler
            </Button>
            <Button
              size="lg"
              type="submit"
              form="magasin-form"
              disabled={isSubmitting}
            >
              <Save /> {isSubmitting ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AlertDialog suppression */}
      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le magasin ?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && `Le magasin « ${deleteTarget.libelle} » et son plan comptable seront définitivement supprimés.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => void confirmDelete()}>
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
