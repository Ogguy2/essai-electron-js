import React, { useEffect, useMemo, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  BookOpen, Plus, Pencil, Trash2, MoreHorizontal,
  ChevronDown, Search, X, Save,
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
import { compteInputSchema, type CompteFormValues } from '@/shared/schemas';
import { classeFromNumero } from '@/domain/compte';
import type { AuthUser, Compte, Magasin } from '@/shared/ipc';

const CLASSES: Record<number, string> = {
  1: 'Ressources durables',
  2: 'Actif immobilisé',
  3: 'Stocks',
  4: 'Tiers',
  5: 'Trésorerie',
  6: 'Charges',
  7: 'Produits',
  8: 'Autres charges / produits (HAO)',
  9: 'Comptabilité analytique',
};

const DEFAULT_VALUES: CompteFormValues = {
  numero: '',
  libelle: '',
  classe: 1,
  collectif: false,
  lettrable: false,
};

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
  const [toDelete, setToDelete] = useState<Compte | null>(null);

  const form = useForm<CompteFormValues>({
    resolver: zodResolver(compteInputSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors, isSubmitting },
    setError,
  } = form;

  async function load() {
    if (!magasin) { setRows([]); return; }
    setLoading(true);
    const res = await window.api.comptes.list(magasin.id);
    if (res.success) setRows(res.data); else toast.error(res.error.message);
    setLoading(false);
  }

  // Chargement sur changement de magasin, avec garde anti-race : si l'utilisateur
  // change de magasin pendant un list() lent, on ignore la réponse périmée.
  useEffect(() => {
    if (!magasin) { setRows([]); return; }
    let cancelled = false;
    setLoading(true);
    void window.api.comptes.list(magasin.id).then((res) => {
      if (cancelled) return;
      if (res.success) setRows(res.data); else toast.error(res.error.message);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [magasin]);

  const filtered = useMemo(
    () =>
      rows.filter(
        (c) =>
          (classeFilter === 'all' || c.classe === Number(classeFilter)) &&
          (!q || `${c.numero} ${c.libelle}`.toLowerCase().includes(q.toLowerCase())),
      ),
    [rows, q, classeFilter],
  );

  const byClasse = useMemo(() => {
    const m = new Map<number, Compte[]>();
    for (const c of filtered) {
      const bucket = m.get(c.classe);
      if (bucket) {
        bucket.push(c);
      } else {
        m.set(c.classe, [c]);
      }
    }
    return [...m.entries()].sort((a, b) => a[0] - b[0]);
  }, [filtered]);

  function toggleCollapsed(classe: number) {
    setCollapsed((s) => ({ ...s, [classe]: !s[classe] }));
  }

  function openCreate() {
    setEditing(null);
    reset(DEFAULT_VALUES);
    setOpen(true);
  }

  function openEdit(c: Compte) {
    setEditing(c);
    reset({
      numero: c.numero,
      libelle: c.libelle,
      classe: c.classe,
      collectif: c.collectif,
      lettrable: c.lettrable,
    });
    setOpen(true);
  }

  async function onValid(values: CompteFormValues) {
    if (!magasin) return;
    const res = editing
      ? await window.api.comptes.update(editing.id, values)
      : await window.api.comptes.create(magasin.id, values);
    if (!res.success) {
      if (res.error.code === 'VALIDATION') {
        setError('numero', { message: res.error.message });
      } else {
        toast.error(res.error.message);
      }
      return;
    }
    toast.success(editing ? 'Compte modifié.' : 'Compte créé.');
    setOpen(false);
    await load();
  }

  async function confirmDelete() {
    if (!toDelete) return;
    const res = await window.api.comptes.delete(toDelete.id);
    setToDelete(null);
    if (!res.success) { toast.error(res.error.message); return; }
    toast.success('Compte supprimé.');
    await load();
  }

  if (!magasin) {
    return (
      <div className="grid h-full place-items-center p-10 text-center">
        <p className="text-sm font-semibold text-muted-foreground">
          Sélectionnez un magasin pour afficher son plan comptable.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 pb-16">
      {/* En-tête de page */}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight leading-tight">Plan comptable</h1>
          <p className="mt-1 text-sm font-semibold text-muted-foreground">
            Référentiel SYSCOHADA — {rows.length} compte{rows.length !== 1 ? 's' : ''} pour{' '}
            {magasin.libelle}.
          </p>
        </div>
        {isAdmin && (
          <Button size="lg" onClick={openCreate}>
            <Plus /> Nouveau compte
          </Button>
        )}
      </div>

      {/* Barre de recherche + filtre */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Rechercher un numéro ou un intitulé…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <Select value={classeFilter} onValueChange={setClasseFilter}>
          <SelectTrigger className="w-60">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les classes</SelectItem>
            {Object.entries(CLASSES).map(([k, v]) => (
              <SelectItem key={k} value={k}>
                Classe {k} — {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading && <p className="text-sm text-muted-foreground">Chargement…</p>}
      {!loading && byClasse.length === 0 && (
        <p className="text-sm text-muted-foreground">Aucun compte.</p>
      )}

      {/* Liste groupée par classe */}
      <div className="flex flex-col gap-3">
        {byClasse.map(([classe, comptes]) => (
          <div key={classe} className="overflow-hidden rounded-lg border border-border bg-card">
            <button
              type="button"
              className="flex w-full items-center gap-2 px-4 py-3 text-left hover:bg-muted/50"
              onClick={() => toggleCollapsed(classe)}
            >
              <ChevronDown
                className={`size-4 text-muted-foreground transition-transform${collapsed[classe] ? ' -rotate-90' : ''}`}
              />
              <span className="font-bold">Classe {classe}</span>
              <span className="text-sm font-semibold text-muted-foreground">
                — {CLASSES[classe]}
              </span>
              <span className="ml-auto text-xs font-bold text-muted-foreground">
                {comptes.length} compte{comptes.length !== 1 ? 's' : ''}
              </span>
            </button>

            {!collapsed[classe] && (
              <table className="w-full border-t border-border text-sm">
                <tbody>
                  {comptes.map((c) => (
                    <tr key={c.id} className="border-b border-border last:border-0">
                      <td className="w-28 px-4 py-2 font-mono font-bold text-primary">
                        {c.numero}
                      </td>
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
                              <Button variant="ghost" size="icon-sm" aria-label="Actions">
                                <MoreHorizontal />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEdit(c)}>
                                <Pencil /> Modifier
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() => setToDelete(c)}
                              >
                                <Trash2 /> Supprimer
                              </DropdownMenuItem>
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

      {/* Modal création / édition */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[560px]" showCloseButton={false}>
          <DialogHeader>
            <div className="flex items-start gap-[13px] border-b border-border pb-[18px] -mt-1">
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-primary/10 text-primary">
                <BookOpen size={20} />
              </span>
              <div className="flex-1 min-w-0 pr-7">
                <p className="text-[10.5px] font-bold uppercase tracking-widest text-primary mb-1">
                  Plan comptable
                </p>
                <DialogTitle className="text-[17px] font-bold leading-tight">
                  {editing ? 'Modifier le compte' : 'Nouveau compte'}
                </DialogTitle>
                <p className="mt-1 text-[13px] font-medium text-muted-foreground leading-snug">
                  {editing
                    ? 'Modifiez les informations du compte.'
                    : 'Ajouter un compte au plan comptable du magasin.'}
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
            id="compte-form"
            onSubmit={handleSubmit(onValid)}
            className="flex flex-col gap-[14px] pb-2 pt-1"
          >
            <div className="grid grid-cols-2 gap-[14px]">
              {/* Numéro */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="compte-numero">Numéro</Label>
                <Input
                  id="compte-numero"
                  className="font-mono"
                  placeholder="ex. 6181"
                  autoFocus
                  aria-invalid={errors.numero ? 'true' : undefined}
                  {...register('numero', {
                    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                      const v = e.target.value;
                      setValue('numero', v);
                      const cl = classeFromNumero(v);
                      if (cl !== null) setValue('classe', cl);
                    },
                  })}
                />
                {errors.numero && (
                  <p className="text-sm text-destructive">{errors.numero.message}</p>
                )}
              </div>

              {/* Classe */}
              <div className="flex flex-col gap-1.5">
                <Label>Classe</Label>
                <Controller
                  name="classe"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={String(field.value)}
                      onValueChange={(v) => field.onChange(Number(v))}
                    >
                      <SelectTrigger aria-invalid={errors.classe ? 'true' : undefined}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.keys(CLASSES).map((k) => (
                          <SelectItem key={k} value={k}>
                            Classe {k}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.classe && (
                  <p className="text-sm text-destructive">{errors.classe.message}</p>
                )}
              </div>
            </div>

            {/* Intitulé */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="compte-libelle">Intitulé</Label>
              <Input
                id="compte-libelle"
                placeholder="ex. Transport sur achats"
                aria-invalid={errors.libelle ? 'true' : undefined}
                {...register('libelle')}
              />
              {errors.libelle && (
                <p className="text-sm text-destructive">{errors.libelle.message}</p>
              )}
            </div>

            {/* Collectif + Lettrable */}
            <div className="flex gap-6">
              <Controller
                name="collectif"
                control={control}
                render={({ field }) => (
                  <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={(v) => field.onChange(v === true)}
                    />
                    Compte collectif
                  </label>
                )}
              />
              <Controller
                name="lettrable"
                control={control}
                render={({ field }) => (
                  <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={(v) => field.onChange(v === true)}
                    />
                    Lettrable
                  </label>
                )}
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
              form="compte-form"
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
            <AlertDialogTitle>Supprimer le compte ?</AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete &&
                `Le compte ${toDelete.numero} — ${toDelete.libelle} sera supprimé du plan comptable. Cette action est irréversible.`}
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
