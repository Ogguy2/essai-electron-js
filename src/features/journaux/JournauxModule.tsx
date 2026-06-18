import React, { useEffect, useMemo, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  NotebookText, Plus, Pencil, Trash2, MoreHorizontal, X, Save, ChevronRight,
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
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { journalInputSchema, type JournalFormValues } from '@/shared/schemas';
import { JOURNAL_TYPES } from '@/domain/journal';
import type { AuthUser, Journal, Magasin, EcritureListItem } from '@/shared/ipc';

function fmtFcfa(n: number): string {
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' FCFA';
}

const DEFAULT_VALUES: JournalFormValues = {
  code: '',
  libelle: '',
  type: 'OD',
  active: true,
};

interface Props {
  user: AuthUser;
  magasin: Magasin | null;
}

export function JournauxModule({ user, magasin }: Props): React.JSX.Element {
  const isAdmin = user.role === 'Admin';

  const [rows, setRows] = useState<Journal[]>([]);
  const [ecritures, setEcritures] = useState<EcritureListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Journal | null>(null);
  const [toDelete, setToDelete] = useState<Journal | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<JournalFormValues>({
    resolver: zodResolver(journalInputSchema),
    defaultValues: DEFAULT_VALUES,
  });

  async function load() {
    if (!magasin) { setRows([]); setEcritures([]); return; }
    setLoading(true);
    const [jRes, eRes] = await Promise.all([
      window.api.journaux.list(magasin.id),
      window.api.ecritures.list(magasin.id),
    ]);
    if (jRes.success) setRows(jRes.data); else toast.error(jRes.error.message);
    if (eRes.success) setEcritures(eRes.data);
    setLoading(false);
  }

  // Garde anti-race : si l'utilisateur change de magasin pendant un list() lent,
  // on ignore la réponse périmée.
  useEffect(() => {
    if (!magasin) { setRows([]); setEcritures([]); return; }
    let cancelled = false;
    setLoading(true);
    void Promise.all([
      window.api.journaux.list(magasin.id),
      window.api.ecritures.list(magasin.id),
    ]).then(([jRes, eRes]) => {
      if (cancelled) return;
      if (jRes.success) setRows(jRes.data); else toast.error(jRes.error.message);
      if (eRes.success) setEcritures(eRes.data);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [magasin]);

  function openCreate() {
    setEditing(null);
    reset(DEFAULT_VALUES);
    setOpen(true);
  }

  function openEdit(j: Journal) {
    setEditing(j);
    reset({
      code: j.code,
      libelle: j.libelle,
      type: j.type,
      active: j.active,
    });
    setOpen(true);
  }

  async function onValid(values: JournalFormValues) {
    if (!magasin) return;
    const res = editing
      ? await window.api.journaux.update(editing.id, values)
      : await window.api.journaux.create(magasin.id, values);
    if (!res.success) {
      if (res.error.code === 'VALIDATION') {
        setError('code', { message: res.error.message });
      } else {
        toast.error(res.error.message);
      }
      return;
    }
    toast.success(editing ? 'Journal modifié.' : 'Journal créé.');
    setOpen(false);
    await load();
  }

  async function confirmDelete() {
    if (!toDelete) return;
    const res = await window.api.journaux.delete(toDelete.id);
    setToDelete(null);
    if (!res.success) { toast.error(res.error.message); return; }
    toast.success('Journal supprimé.');
    await load();
  }

  function typeLibelle(code: string): string {
    return JOURNAL_TYPES.find((t) => t.code === code)?.libelle ?? code;
  }

  const stats = useMemo(() => {
    const actifs = rows.filter((j) => j.active).length;
    const total = rows.length;
    const totalMouvemente = ecritures
      .filter((e) => e.statut === 'validee')
      .reduce((s, e) => s + e.total_debit, 0);
    const volumeByJournal = new Map<string, number>();
    const countByJournal = new Map<string, number>();
    for (const e of ecritures) {
      volumeByJournal.set(e.journal, (volumeByJournal.get(e.journal) ?? 0) + e.total_debit);
      countByJournal.set(e.journal, (countByJournal.get(e.journal) ?? 0) + 1);
    }
    let maxVolume = 1;
    for (const v of volumeByJournal.values()) {
      if (v > maxVolume) maxVolume = v;
    }
    let mostActiveCode = '';
    let mostActiveCount = 0;
    for (const [code, cnt] of countByJournal.entries()) {
      if (cnt > mostActiveCount) { mostActiveCount = cnt; mostActiveCode = code; }
    }
    return { actifs, total, totalMouvemente, volumeByJournal, countByJournal, maxVolume, mostActiveCode, mostActiveCount };
  }, [rows, ecritures]);

  if (!magasin) {
    return (
      <div className="grid h-full place-items-center p-10 text-center">
        <p className="text-sm font-semibold text-muted-foreground">
          Sélectionnez un magasin pour afficher ses journaux.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 pb-16 max-w-[1480px] mx-auto">
      {/* En-tête de page */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight leading-tight">Journaux</h1>
          <p className="mt-1 text-sm font-semibold text-muted-foreground">
            {rows.length} journal{rows.length !== 1 ? 'x' : ''} pour {magasin.libelle}.
          </p>
        </div>
        {isAdmin && (
          <Button size="lg" onClick={openCreate}>
            <Plus /> Nouveau journal
          </Button>
        )}
      </div>

      {loading && <p className="text-sm text-muted-foreground">Chargement…</p>}
      {!loading && rows.length === 0 && (
        <p className="text-sm text-muted-foreground">Aucun journal.</p>
      )}

      {/* Rangée KPIs */}
      {!loading && rows.length > 0 && (
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4 mb-6">
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="text-[10.5px] font-extrabold uppercase tracking-widest text-muted-foreground mb-1">Journaux actifs</div>
            <div className="text-[22px] font-extrabold leading-tight">{stats.actifs} <span className="text-base font-bold text-muted-foreground">/ {stats.total}</span></div>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="text-[10.5px] font-extrabold uppercase tracking-widest text-muted-foreground mb-1">Ecritures classees</div>
            <div className="text-[22px] font-extrabold leading-tight">{ecritures.length}</div>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="text-[10.5px] font-extrabold uppercase tracking-widest text-muted-foreground mb-1">Total mouvemente</div>
            <div className="text-[18px] font-extrabold leading-tight truncate">{fmtFcfa(stats.totalMouvemente)}</div>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="text-[10.5px] font-extrabold uppercase tracking-widest text-muted-foreground mb-1">Journal le plus actif</div>
            {stats.mostActiveCode ? (
              <>
                <div className="text-[22px] font-extrabold font-mono leading-tight text-primary">{stats.mostActiveCode}</div>
                <div className="text-[12px] font-semibold text-muted-foreground">{stats.mostActiveCount} ecriture{stats.mostActiveCount !== 1 ? 's' : ''}</div>
              </>
            ) : (
              <div className="text-[15px] font-bold text-muted-foreground">—</div>
            )}
          </div>
        </div>
      )}

      {/* Grille de cartes */}
      {!loading && rows.length > 0 && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {rows.map((j) => {
            const count = stats.countByJournal.get(j.code) ?? 0;
            const volume = stats.volumeByJournal.get(j.code) ?? 0;
            const pct = Math.round((volume / stats.maxVolume) * 100);
            return (
              <div
                key={j.id}
                className="rounded-lg border border-border bg-card shadow-sm px-5 py-[18px] flex flex-col gap-3"
              >
                <div className="flex items-start gap-[13px]">
                  <span className="flex h-12 w-12 flex-none items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <NotebookText size={22} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-[18px] text-primary leading-tight">
                        {j.code}
                      </span>
                      {!j.active && <Badge variant="secondary">Inactif</Badge>}
                      {j.code === 'AN' && <Badge>Automatique</Badge>}
                    </div>
                    <div className="text-[14px] font-bold text-foreground mt-0.5 truncate">
                      {j.libelle}
                    </div>
                    <div className="text-[12.5px] font-bold text-muted-foreground mt-0.5">
                      {typeLibelle(j.type)} · {count} ecriture{count !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {isAdmin && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm" aria-label="Actions">
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem className="gap-2" onClick={() => openEdit(j)}>
                            <Pencil size={15} /> Modifier
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            className="gap-2"
                            onClick={() => setToDelete(j)}
                          >
                            <Trash2 size={15} /> Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                    <ChevronRight size={16} className="text-muted-foreground opacity-40 flex-none" />
                  </div>
                </div>
                {/* Volume mouvementé */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10.5px] font-extrabold uppercase tracking-widest text-muted-foreground">Volume mouvemente</span>
                    <span className="text-[12px] font-bold text-muted-foreground">{fmtFcfa(volume)}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal création / édition */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[520px]" showCloseButton={false}>
          <DialogHeader>
            <div className="flex items-start gap-[13px] border-b border-border pb-[18px] -mt-1">
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-primary/10 text-primary">
                <NotebookText size={20} />
              </span>
              <div className="flex-1 min-w-0 pr-7">
                <p className="text-[10.5px] font-bold uppercase tracking-widest text-primary mb-1">
                  Journaux
                </p>
                <DialogTitle className="text-[17px] font-bold leading-tight">
                  {editing ? 'Modifier le journal' : 'Nouveau journal'}
                </DialogTitle>
                <p className="mt-1 text-[13px] font-medium text-muted-foreground leading-snug">
                  {editing
                    ? 'Modifiez les informations du journal.'
                    : 'Créer un journal comptable pour ce magasin.'}
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
            id="journal-form"
            onSubmit={handleSubmit(onValid)}
            className="flex flex-col gap-[14px] pb-2 pt-1"
          >
            {/* Code */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="journal-code">Code</Label>
              <Input
                id="journal-code"
                className="font-mono"
                placeholder="ex. VTE"
                autoFocus
                aria-invalid={errors.code ? 'true' : undefined}
                {...register('code', {
                  onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                    setValue('code', e.target.value.toUpperCase());
                  },
                })}
              />
              {errors.code && (
                <p className="text-sm text-destructive">{errors.code.message}</p>
              )}
            </div>

            {/* Type */}
            <div className="flex flex-col gap-1.5">
              <Label>Type</Label>
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger aria-invalid={errors.type ? 'true' : undefined}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {JOURNAL_TYPES.map((t) => (
                        <SelectItem key={t.code} value={t.code}>
                          {t.code} — {t.libelle}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.type && (
                <p className="text-sm text-destructive">{errors.type.message}</p>
              )}
            </div>

            {/* Libellé */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="journal-libelle">Libellé</Label>
              <Input
                id="journal-libelle"
                placeholder="ex. Journal des ventes"
                aria-invalid={errors.libelle ? 'true' : undefined}
                {...register('libelle')}
              />
              {errors.libelle && (
                <p className="text-sm text-destructive">{errors.libelle.message}</p>
              )}
            </div>

            {/* Actif */}
            <Controller
              name="active"
              control={control}
              render={({ field }) => (
                <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={(v) => field.onChange(v === true)}
                  />
                  Journal actif
                </label>
              )}
            />
          </form>

          <DialogFooter>
            <Button variant="outline" size="lg" onClick={() => setOpen(false)}>
              <X /> Annuler
            </Button>
            <Button
              size="lg"
              type="submit"
              form="journal-form"
              disabled={isSubmitting}
            >
              <Save /> {isSubmitting ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AlertDialog suppression */}
      <AlertDialog
        open={toDelete !== null}
        onOpenChange={(o) => { if (!o) setToDelete(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le journal ?</AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete &&
                `Le journal ${toDelete.code} — ${toDelete.libelle} sera supprimé. Cette action est irréversible.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => void confirmDelete()}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
