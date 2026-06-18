import React, { useEffect, useMemo, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  Users, Plus, Pencil, Trash2, MoreHorizontal, Search, X, Save,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
import { tiersInputSchema, type TiersFormValues } from '@/shared/schemas';
import type { AuthUser, Magasin, Tiers } from '@/shared/ipc';

type Filtre = 'tous' | 'clients' | 'fournisseurs';

const DEFAULT_VALUES: TiersFormValues = {
  code: '',
  raison_sociale: '',
  est_client: true,
  est_fournisseur: false,
  telephone: '',
  adresse: '',
  registre_commerce: '',
  plafond_credit: 0,
  bloque: false,
};

interface Props {
  user: AuthUser;
  magasin: Magasin | null;
}

export function TiersModule({ user: _user, magasin }: Props): React.JSX.Element {
  const [rows, setRows] = useState<Tiers[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');
  const [filtre, setFiltre] = useState<Filtre>('tous');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Tiers | null>(null);
  const [toDelete, setToDelete] = useState<Tiers | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<TiersFormValues>({
    resolver: zodResolver(tiersInputSchema),
    defaultValues: DEFAULT_VALUES,
  });

  async function load() {
    if (!magasin) { setRows([]); return; }
    setLoading(true);
    const res = await window.api.tiers.list(magasin.id);
    if (res.success) setRows(res.data); else toast.error(res.error.message);
    setLoading(false);
  }

  // Garde anti-race : si l'utilisateur change de magasin pendant un list() lent,
  // on ignore la réponse périmée.
  useEffect(() => {
    if (!magasin) { setRows([]); return; }
    let cancelled = false;
    setLoading(true);
    void window.api.tiers.list(magasin.id).then((res) => {
      if (cancelled) return;
      if (res.success) setRows(res.data); else toast.error(res.error.message);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [magasin]);

  const filtered = useMemo(
    () =>
      rows.filter((t) => {
        if (filtre === 'clients' && !t.est_client) return false;
        if (filtre === 'fournisseurs' && !t.est_fournisseur) return false;
        if (q) {
          const needle = q.toLowerCase();
          if (!t.code.toLowerCase().includes(needle) && !t.raison_sociale.toLowerCase().includes(needle)) {
            return false;
          }
        }
        return true;
      }),
    [rows, q, filtre],
  );

  function openCreate() {
    setEditing(null);
    reset(DEFAULT_VALUES);
    setOpen(true);
  }

  function openEdit(t: Tiers) {
    setEditing(t);
    reset({
      code: t.code,
      raison_sociale: t.raison_sociale,
      est_client: t.est_client,
      est_fournisseur: t.est_fournisseur,
      telephone: t.telephone,
      adresse: t.adresse,
      registre_commerce: t.registre_commerce,
      plafond_credit: t.plafond_credit,
      bloque: t.bloque,
    });
    setOpen(true);
  }

  async function onValid(values: TiersFormValues) {
    if (!magasin) return;
    const res = editing
      ? await window.api.tiers.update(editing.id, values)
      : await window.api.tiers.create(magasin.id, values);
    if (!res.success) {
      if (res.error.code === 'VALIDATION') {
        setError('code', { message: res.error.message });
      } else {
        toast.error(res.error.message);
      }
      return;
    }
    toast.success(editing ? 'Tiers modifié.' : 'Tiers créé.');
    setOpen(false);
    await load();
  }

  async function confirmDelete() {
    if (!toDelete) return;
    const res = await window.api.tiers.delete(toDelete.id);
    setToDelete(null);
    if (!res.success) { toast.error(res.error.message); return; }
    toast.success('Tiers supprimé.');
    await load();
  }

  if (!magasin) {
    return (
      <div className="grid h-full place-items-center p-10 text-center">
        <p className="text-sm font-semibold text-muted-foreground">
          Sélectionnez un magasin pour afficher ses tiers.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 pb-16 max-w-[1480px] mx-auto">
      {/* En-tête de page */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight leading-tight">Tiers</h1>
          <p className="mt-1 text-sm font-semibold text-muted-foreground">
            {rows.length} tiers pour {magasin.libelle}.
          </p>
        </div>
        <Button size="lg" onClick={openCreate}>
          <Plus /> Nouveau tiers
        </Button>
      </div>

      {/* Filtres segmentés + recherche */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex gap-1.5">
          {(['tous', 'clients', 'fournisseurs'] as const).map((f) => (
            <Button
              key={f}
              size="sm"
              variant={filtre === f ? 'default' : 'outline'}
              onClick={() => setFiltre(f)}
            >
              {f === 'tous' ? 'Tous' : f === 'clients' ? 'Clients' : 'Fournisseurs'}
            </Button>
          ))}
        </div>
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Rechercher un code ou une raison sociale…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>

      {loading && <p className="text-sm text-muted-foreground">Chargement…</p>}
      {!loading && filtered.length === 0 && (
        <p className="text-sm text-muted-foreground">Aucun tiers.</p>
      )}

      {/* Tableau */}
      {!loading && filtered.length > 0 && (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-32">Code</TableHead>
                <TableHead>Raison sociale</TableHead>
                <TableHead className="w-36">Téléphone</TableHead>
                <TableHead className="w-44">Comptes</TableHead>
                <TableHead className="w-44 text-right">Plafond crédit</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-mono font-bold text-primary">{t.code}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{t.raison_sociale}</span>
                      {t.est_client && <Badge variant="secondary">Client</Badge>}
                      {t.est_fournisseur && <Badge variant="secondary">Fournisseur</Badge>}
                      {t.bloque && <Badge variant="destructive">Bloqué</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {t.telephone || '—'}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      {t.compte_client
                        ? <span className="font-mono text-xs text-muted-foreground">{t.compte_client}</span>
                        : null}
                      {t.compte_fournisseur
                        ? <span className="font-mono text-xs text-muted-foreground">{t.compte_fournisseur}</span>
                        : null}
                      {!t.compte_client && !t.compte_fournisseur && (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm">
                    {t.plafond_credit > 0
                      ? Math.round(t.plafond_credit).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' FCFA'
                      : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm" aria-label="Actions">
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(t)}>
                          <Pencil /> Modifier
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => setToDelete(t)}
                        >
                          <Trash2 /> Supprimer
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

      {/* Modal création / édition */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[560px]" showCloseButton={false}>
          <DialogHeader>
            <div className="flex items-start gap-[13px] border-b border-border pb-[18px] -mt-1">
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Users size={20} />
              </span>
              <div className="flex-1 min-w-0 pr-7">
                <p className="text-[10.5px] font-bold uppercase tracking-widest text-primary mb-1">
                  Tiers
                </p>
                <DialogTitle className="text-[17px] font-bold leading-tight">
                  {editing ? 'Modifier le tiers' : 'Nouveau tiers'}
                </DialogTitle>
                <p className="mt-1 text-[13px] font-medium text-muted-foreground leading-snug">
                  {editing
                    ? 'Modifiez les informations du tiers.'
                    : 'Ajouter un tiers (client, fournisseur ou les deux).'}
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
            id="tiers-form"
            onSubmit={handleSubmit(onValid)}
            className="flex flex-col gap-[14px] pb-2 pt-1"
          >
            {/* Code + Raison sociale */}
            <div className="grid grid-cols-2 gap-[14px]">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="tiers-code">Code</Label>
                <Input
                  id="tiers-code"
                  className="font-mono"
                  placeholder="ex. CLI001"
                  autoFocus
                  aria-invalid={errors.code ? 'true' : undefined}
                  {...register('code')}
                />
                {errors.code && (
                  <p className="text-sm text-destructive">{errors.code.message}</p>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="tiers-raison">Raison sociale</Label>
                <Input
                  id="tiers-raison"
                  placeholder="ex. Société X"
                  aria-invalid={errors.raison_sociale ? 'true' : undefined}
                  {...register('raison_sociale')}
                />
                {errors.raison_sociale && (
                  <p className="text-sm text-destructive">{errors.raison_sociale.message}</p>
                )}
              </div>
            </div>

            {/* Client / Fournisseur */}
            <div className="flex flex-col gap-1.5">
              <Label>Type</Label>
              <div className="flex gap-6">
                <Controller
                  name="est_client"
                  control={control}
                  render={({ field }) => (
                    <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={(v) => field.onChange(v === true)}
                      />
                      Client
                    </label>
                  )}
                />
                <Controller
                  name="est_fournisseur"
                  control={control}
                  render={({ field }) => (
                    <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={(v) => field.onChange(v === true)}
                      />
                      Fournisseur
                    </label>
                  )}
                />
              </div>
              {errors.est_client && (
                <p className="text-sm text-destructive">{errors.est_client.message}</p>
              )}
            </div>

            {/* Téléphone + RCCM */}
            <div className="grid grid-cols-2 gap-[14px]">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="tiers-tel">Téléphone</Label>
                <Input
                  id="tiers-tel"
                  placeholder="ex. +225 07 00 00 00"
                  aria-invalid={errors.telephone ? 'true' : undefined}
                  {...register('telephone')}
                />
                {errors.telephone && (
                  <p className="text-sm text-destructive">{errors.telephone.message}</p>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="tiers-rccm">RCCM</Label>
                <Input
                  id="tiers-rccm"
                  placeholder="ex. CI-ABJ-2020-B-01234"
                  aria-invalid={errors.registre_commerce ? 'true' : undefined}
                  {...register('registre_commerce')}
                />
                {errors.registre_commerce && (
                  <p className="text-sm text-destructive">{errors.registre_commerce.message}</p>
                )}
              </div>
            </div>

            {/* Adresse */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tiers-adresse">Adresse</Label>
              <Input
                id="tiers-adresse"
                placeholder="ex. Abidjan, Plateau"
                aria-invalid={errors.adresse ? 'true' : undefined}
                {...register('adresse')}
              />
              {errors.adresse && (
                <p className="text-sm text-destructive">{errors.adresse.message}</p>
              )}
            </div>

            {/* Plafond crédit + Bloqué */}
            <div className="grid grid-cols-2 gap-[14px] items-end">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="tiers-plafond">Plafond crédit (FCFA)</Label>
                <Input
                  id="tiers-plafond"
                  type="number"
                  min={0}
                  step={1}
                  aria-invalid={errors.plafond_credit ? 'true' : undefined}
                  {...register('plafond_credit', { valueAsNumber: true })}
                />
                {errors.plafond_credit && (
                  <p className="text-sm text-destructive">{errors.plafond_credit.message}</p>
                )}
              </div>
              <div className="flex flex-col gap-1.5 pb-0.5">
                <Label>Statut</Label>
                <Controller
                  name="bloque"
                  control={control}
                  render={({ field }) => (
                    <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={(v) => field.onChange(v === true)}
                      />
                      Tiers bloqué
                    </label>
                  )}
                />
              </div>
            </div>
          </form>

          <DialogFooter>
            <Button variant="outline" size="lg" onClick={() => setOpen(false)}>
              <X /> Annuler
            </Button>
            <Button
              size="lg"
              type="submit"
              form="tiers-form"
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
            <AlertDialogTitle>Supprimer le tiers ?</AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete &&
                `Le tiers ${toDelete.code} — ${toDelete.raison_sociale} sera archivé. Son historique et ses sous-comptes (4111/4011) seront conservés.`}
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
