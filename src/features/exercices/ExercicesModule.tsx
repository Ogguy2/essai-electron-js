import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  CalendarDays, Plus, Pencil, MoreHorizontal, X, Save,
  LockKeyhole, LockKeyholeOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CardListSkeleton } from '@/components/skeletons';
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
import { exerciceInputSchema, type ExerciceFormValues } from '@/shared/schemas';
import type { AuthUser, Exercice, Magasin } from '@/shared/ipc';

/** Formate une date ISO AAAA-MM-JJ en JJ/MM/AAAA. */
function fmtDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

const currentYear = new Date().getFullYear();
const DEFAULT_VALUES: ExerciceFormValues = {
  libelle: '',
  date_debut: `${currentYear}-01-01`,
  date_fin: `${currentYear}-12-31`,
};

interface Props {
  user: AuthUser;
  magasin: Magasin | null;
}

type ConfirmAction = { type: 'close' | 'reopen'; exercice: Exercice };

export function ExercicesModule({ user, magasin }: Props): React.JSX.Element {
  const isAdmin = user.role === 'Admin';

  const [rows, setRows] = useState<Exercice[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Exercice | null>(null);
  const [confirm, setConfirm] = useState<ConfirmAction | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<ExerciceFormValues>({
    resolver: zodResolver(exerciceInputSchema),
    defaultValues: DEFAULT_VALUES,
  });

  // Chargement avec garde anti-race.
  useEffect(() => {
    if (!magasin) { setRows([]); return; }
    let cancelled = false;
    setLoading(true);
    void window.api.exercices.list(magasin.id).then((res) => {
      if (cancelled) return;
      if (res.success) setRows(res.data); else toast.error(res.error.message);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [magasin]);

  async function load() {
    if (!magasin) { setRows([]); return; }
    const res = await window.api.exercices.list(magasin.id);
    if (res.success) setRows(res.data); else toast.error(res.error.message);
  }

  function openCreate() {
    setEditing(null);
    reset(DEFAULT_VALUES);
    setOpen(true);
  }

  function openEdit(ex: Exercice) {
    setEditing(ex);
    reset({ libelle: ex.libelle, date_debut: ex.date_debut, date_fin: ex.date_fin });
    setOpen(true);
  }

  async function onValid(values: ExerciceFormValues) {
    if (!magasin) return;
    const res = editing
      ? await window.api.exercices.update(editing.id, values)
      : await window.api.exercices.create(magasin.id, values);
    if (!res.success) {
      if (res.error.code === 'VALIDATION') {
        setError('libelle', { message: res.error.message });
      } else {
        toast.error(res.error.message);
      }
      return;
    }
    toast.success(editing ? 'Exercice modifié.' : 'Exercice créé.');
    setOpen(false);
    await load();
  }

  async function confirmAction() {
    if (!confirm) return;
    const res =
      confirm.type === 'close'
        ? await window.api.exercices.close(confirm.exercice.id)
        : await window.api.exercices.reopen(confirm.exercice.id);
    setConfirm(null);
    if (!res.success) { toast.error(res.error.message); return; }
    toast.success(confirm.type === 'close' ? 'Exercice clôturé.' : 'Exercice réouvert.');
    await load();
  }

  if (!magasin) {
    return (
      <div className="grid h-full place-items-center p-10 text-center">
        <p className="text-sm font-semibold text-muted-foreground">
          Sélectionnez un magasin pour afficher ses exercices.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 pb-16">
      {/* En-tête */}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight leading-tight flex items-center gap-2">
            <CalendarDays className="size-6 text-primary" />
            Exercices
          </h1>
          <p className="mt-1 text-sm font-semibold text-muted-foreground">
            {rows.length} exercice{rows.length !== 1 ? 's' : ''} pour {magasin.libelle}.
          </p>
        </div>
        {isAdmin && (
          <Button size="lg" onClick={openCreate}>
            <Plus /> Nouvel exercice
          </Button>
        )}
      </div>

      {loading && <CardListSkeleton count={3} className="flex flex-col gap-3" />}
      {!loading && rows.length === 0 && (
        <p className="text-sm text-muted-foreground">Aucun exercice pour ce magasin.</p>
      )}

      {!loading && rows.length > 0 && (
        <div className="flex flex-col gap-3">
          {[...rows].sort((a, b) => b.libelle.localeCompare(a.libelle)).map((ex) => (
            <div
              key={ex.id}
              className="flex items-center gap-4 rounded-lg border border-border bg-card px-5 py-4"
            >
              {/* Annee / libelle */}
              <div className="text-[28px] font-extrabold tabular-nums text-primary leading-none w-24 shrink-0">
                {ex.libelle}
              </div>

              {/* Info centrale */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  {ex.statut === 'ouvert' ? (
                    <Badge variant="default">Ouvert</Badge>
                  ) : (
                    <Badge variant="secondary">Cloture</Badge>
                  )}
                  {ex.statut === 'ouvert' && (
                    <Badge variant="outline" className="text-primary border-primary/40">Saisie active</Badge>
                  )}
                </div>
                <div className="text-[13px] font-semibold text-muted-foreground">
                  Du {fmtDate(ex.date_debut)} au {fmtDate(ex.date_fin)}
                </div>
              </div>

              {/* Actions */}
              {isAdmin && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm" aria-label="Actions">
                      <MoreHorizontal />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEdit(ex)}>
                      <Pencil /> Modifier
                    </DropdownMenuItem>
                    {ex.statut === 'ouvert' ? (
                      <DropdownMenuItem
                        onClick={() => setConfirm({ type: 'close', exercice: ex })}
                      >
                        <LockKeyhole /> Cloturer
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem
                        onClick={() => setConfirm({ type: 'reopen', exercice: ex })}
                      >
                        <LockKeyholeOpen /> Rouvrir
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal création / édition */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[480px]" showCloseButton={false}>
          <DialogHeader>
            <div className="flex items-start gap-[13px] border-b border-border pb-[18px] -mt-1">
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-primary/10 text-primary">
                <CalendarDays size={20} />
              </span>
              <div className="flex-1 min-w-0 pr-7">
                <p className="text-[10.5px] font-bold uppercase tracking-widest text-primary mb-1">
                  Exercices
                </p>
                <DialogTitle className="text-[17px] font-bold leading-tight">
                  {editing ? 'Modifier l\'exercice' : 'Nouvel exercice'}
                </DialogTitle>
                <p className="mt-1 text-[13px] font-medium text-muted-foreground leading-snug">
                  {editing
                    ? 'Modifiez les informations de l\'exercice.'
                    : 'Créer un nouvel exercice pour ce magasin.'}
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
            id="exercice-form"
            onSubmit={handleSubmit(onValid)}
            className="flex flex-col gap-[14px] pb-2 pt-1"
          >
            {/* Libellé */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="exercice-libelle">Libellé</Label>
              <Input
                id="exercice-libelle"
                placeholder="ex. Exercice 2025"
                autoFocus
                aria-invalid={errors.libelle ? 'true' : undefined}
                {...register('libelle')}
              />
              {errors.libelle && (
                <p className="text-sm text-destructive">{errors.libelle.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-[14px]">
              {/* Date de début */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="exercice-debut">Date de début</Label>
                <Input
                  id="exercice-debut"
                  type="date"
                  aria-invalid={errors.date_debut ? 'true' : undefined}
                  {...register('date_debut')}
                />
                {errors.date_debut && (
                  <p className="text-sm text-destructive">{errors.date_debut.message}</p>
                )}
              </div>

              {/* Date de fin */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="exercice-fin">Date de fin</Label>
                <Input
                  id="exercice-fin"
                  type="date"
                  aria-invalid={errors.date_fin ? 'true' : undefined}
                  {...register('date_fin')}
                />
                {errors.date_fin && (
                  <p className="text-sm text-destructive">{errors.date_fin.message}</p>
                )}
              </div>
            </div>
          </form>

          <DialogFooter>
            <Button variant="outline" size="lg" onClick={() => setOpen(false)}>
              <X /> Annuler
            </Button>
            <Button size="lg" type="submit" form="exercice-form" disabled={isSubmitting}>
              <Save /> {isSubmitting ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AlertDialog clôture / réouverture */}
      <AlertDialog
        open={confirm !== null}
        onOpenChange={(o) => { if (!o) setConfirm(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm?.type === 'close' ? 'Clôturer l\'exercice ?' : 'Rouvrir l\'exercice ?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.type === 'close'
                ? `L'exercice « ${confirm.exercice.libelle} » sera clôturé. Aucune nouvelle écriture ne pourra y être enregistrée.`
                : `L'exercice « ${confirm?.exercice.libelle} » sera réouvert.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmAction()}>
              {confirm?.type === 'close' ? 'Clôturer' : 'Rouvrir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
