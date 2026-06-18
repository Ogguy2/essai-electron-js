import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  Plus, Save, X, Building2, MoreHorizontal, Pencil, Trash2, Store,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CardListSkeleton } from '@/components/skeletons';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { societeInputSchema, type SocieteFormValues } from '@/shared/schemas';
import type { AuthUser, Magasin, Societe } from '@/shared/ipc';

const DEFAULT_VALUES: SocieteFormValues = { raison_sociale: '', rccm: '', adresse: '', telephone: '' };

interface Props {
  user: AuthUser;
  onChanged?: () => void;
}

export function SocietesModule({ user, onChanged }: Props): React.JSX.Element {
  const isAdmin = user.role === 'Admin';
  const [rows, setRows] = useState<Societe[]>([]);
  const [magasins, setMagasins] = useState<Magasin[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Societe | null>(null);
  const [open, setOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Societe | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<SocieteFormValues>({
    resolver: zodResolver(societeInputSchema),
    defaultValues: DEFAULT_VALUES,
  });

  async function load() {
    setLoading(true);
    const [sRes, mRes] = await Promise.all([
      window.api.societes.list(),
      window.api.magasins.list(),
    ]);
    if (sRes.success) setRows(sRes.data); else toast.error(sRes.error.message);
    if (mRes.success) setMagasins(mRes.data);
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  function openCreate() {
    setEditing(null);
    reset(DEFAULT_VALUES);
    setOpen(true);
  }
  function openEdit(s: Societe) {
    setEditing(s);
    reset({ raison_sociale: s.raison_sociale, rccm: s.rccm, adresse: s.adresse, telephone: s.telephone });
    setOpen(true);
  }

  async function onValid(values: SocieteFormValues) {
    const res = editing
      ? await window.api.societes.update(editing.id, values)
      : await window.api.societes.create(values);
    if (!res.success) {
      if (res.error.code === 'VALIDATION') {
        setError('raison_sociale', { message: res.error.message });
      } else {
        toast.error(res.error.message);
      }
      return;
    }
    toast.success(editing ? 'Société modifiée.' : 'Société créée.');
    setOpen(false);
    await load();
    onChanged?.();
  }

  async function confirmDelete() {
    if (deleteTarget === null) return;
    const res = await window.api.societes.delete(deleteTarget.id);
    setDeleteTarget(null);
    if (!res.success) { toast.error(res.error.message); return; }
    toast.success('Société supprimée.');
    await load();
    onChanged?.();
  }

  const magsOf = (sid: number) => magasins.filter((m) => m.societe_id === sid);

  return (
    <div className="p-6 pb-16 max-w-[1480px] mx-auto">
      {/* En-tête de page */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight leading-tight">Sociétés</h1>
          <p className="mt-1 text-sm font-semibold text-muted-foreground max-w-lg">
            Entité légale — porte la raison sociale, le RCCM, l'adresse et le cartouche des états PDF.
            Une société regroupe un ou plusieurs magasins.
          </p>
        </div>
        {isAdmin && (
          <Button size="lg" onClick={openCreate}>
            <Plus /> Nouvelle société
          </Button>
        )}
      </div>

      {/* Grille de cartes */}
      {loading ? (
        <CardListSkeleton count={4} className="grid grid-cols-1 gap-4 xl:grid-cols-2" />
      ) : rows.length === 0 ? (
        <p className="text-muted-foreground text-sm">Aucune société.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {rows.map((s) => {
            const mags = magsOf(s.id);
            return (
              <div
                key={s.id}
                className="rounded-lg border border-border bg-card shadow-sm px-5 py-[18px]"
              >
                {/* Header de la carte */}
                <div className="flex items-start gap-[13px] mb-[14px]">
                  <span className="flex h-12 w-12 flex-none items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Building2 size={22} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[18px] font-semibold leading-tight truncate">{s.raison_sociale}</div>
                    <div className="text-[12.5px] font-bold text-muted-foreground mt-0.5">
                      {mags.length} magasin{mags.length !== 1 ? 's' : ''} · consolidation disponible
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
                        <DropdownMenuItem className="gap-2" onClick={() => openEdit(s)}>
                          <Pencil size={15} /> Modifier
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          className="gap-2"
                          onClick={() => setDeleteTarget(s)}
                        >
                          <Trash2 size={15} /> Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>

                {/* Infos légales */}
                <div className="grid grid-cols-2 gap-x-5 gap-y-3 border-t border-border pt-[14px]">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-muted-foreground">RCCM</span>
                    <b className="text-[13.5px] font-bold font-mono">{s.rccm || '—'}</b>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-muted-foreground">Téléphone</span>
                    <b className="text-[13.5px] font-bold">{s.telephone || '—'}</b>
                  </div>
                  <div className="col-span-2 flex flex-col gap-0.5">
                    <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-muted-foreground">Adresse</span>
                    <b className="text-[13.5px] font-bold">{s.adresse || '—'}</b>
                  </div>
                </div>

                {/* Chips magasins rattachés */}
                <div className="flex flex-wrap gap-[7px] border-t border-border mt-[14px] pt-[14px]">
                  {mags.length > 0 ? (
                    mags.map((m) => (
                      <span
                        key={m.id}
                        className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-1 text-xs font-bold text-secondary-foreground"
                      >
                        <Store size={13} />
                        {m.libelle.replace('Siconex - ', '')}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs font-bold text-muted-foreground">Aucun magasin rattaché</span>
                  )}
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
                <Building2 size={20} />
              </span>
              <div className="flex-1 min-w-0 pr-7">
                <p className="text-[10.5px] font-bold uppercase tracking-widest text-primary mb-1">
                  {editing ? 'Société' : 'Nouvelle entité légale'}
                </p>
                <p className="text-[17px] font-bold leading-tight">
                  {editing ? 'Modifier la société' : 'Nouvelle société'}
                </p>
                <p className="mt-1 text-[13px] font-medium text-muted-foreground leading-snug">
                  Seule la raison sociale est obligatoire. Ces informations alimentent le cartouche des états.
                </p>
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
            id="societe-form"
            onSubmit={handleSubmit(onValid)}
            className="flex flex-col gap-[14px] pb-2 pt-1"
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="rs">Raison sociale</Label>
              <Input
                id="rs"
                placeholder="ex. SICONEX SARL"
                autoFocus
                aria-invalid={errors.raison_sociale ? 'true' : undefined}
                {...register('raison_sociale')}
              />
              {errors.raison_sociale && (
                <p className="text-sm text-destructive">{errors.raison_sociale.message}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-[14px]">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="rccm">RCCM</Label>
                <Input
                  id="rccm"
                  placeholder="CI-ABJ-…"
                  className="font-mono"
                  {...register('rccm')}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="tel">Téléphone</Label>
                <Input
                  id="tel"
                  placeholder="+225 …"
                  {...register('telephone')}
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="adr">Adresse</Label>
              <Input
                id="adr"
                placeholder="Quartier, ville"
                {...register('adresse')}
              />
            </div>
          </form>

          <DialogFooter>
            <Button variant="outline" size="lg" onClick={() => setOpen(false)}>
              <X /> Annuler
            </Button>
            <Button
              size="lg"
              type="submit"
              form="societe-form"
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
            <AlertDialogTitle>Supprimer la société ?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && `La société « ${deleteTarget.raison_sociale} » sera supprimée. Cette action est irréversible.`}
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
