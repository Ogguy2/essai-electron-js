import React, { useEffect, useMemo, useState } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  Plus, Pencil, Trash2, MoreHorizontal,
  Search, X, Save, CheckCircle, AlertTriangle,
  Eye, Pen, Check, BookOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter,
} from '@/components/ui/table';
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
} from '@/components/ui/combobox';
import { ecritureInputSchema, type EcritureFormValues } from '@/shared/schemas';
import { estAncreCollectif } from '@/domain/compte';
import type {
  AuthUser, Magasin, Exercice,
  EcritureListItem, EcritureAvecLignes, Compte, Journal, Tiers,
  StatutEcriture,
} from '@/shared/ipc';

// ─── helpers ──────────────────────────────────────────────────────────────────

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Format FCFA avec separateurs de milliers (espace ASCII). */
function fmtMontant(n: number): string {
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/** JJ/MM/AAAA */
function fmtDate(iso: string): string {
  if (!iso || iso.length < 10) return iso;
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

function ligneVide() {
  return { compte: '', tiers: null as string | null, libelle: '', debit: 0, credit: 0, echeance: null as string | null, lettrage: null as string | null };
}

const DEFAULT_VALUES = (exerciceId: number): EcritureFormValues => ({
  exercice_id: exerciceId,
  journal: '',
  date_ecriture: today(),
  libelle: '',
  lignes: [ligneVide(), ligneVide()],
});

// ─── statut badge ─────────────────────────────────────────────────────────────

function StatutBadge({ statut }: { statut: StatutEcriture }): React.JSX.Element {
  if (statut === 'validee') return <Badge variant="default" className="bg-green-600/15 text-green-700 dark:text-green-400 border-green-600/20 hover:bg-green-600/15">Validée</Badge>;
  if (statut === 'invalidee') return <Badge variant="destructive">Invalidée</Badge>;
  return <Badge variant="secondary">Brouillon</Badge>;
}

// ─── modal SAISIE ─────────────────────────────────────────────────────────────

interface SaisieProps {
  magasin: Magasin;
  exercice: Exercice | null;
  editing: EcritureAvecLignes | null;
  comptes: Compte[];
  journaux: Journal[];
  tiers: Tiers[];
  onClose: () => void;
  onSaved: () => void;
}

function ModalSaisie({ magasin, exercice, editing, comptes, journaux, tiers, onClose, onSaved }: SaisieProps): React.JSX.Element {
  const [serverError, setServerError] = useState<string | null>(null);

  const defaultValues = editing
    ? {
        exercice_id: editing.exercice_id,
        journal: editing.journal,
        date_ecriture: editing.date_ecriture,
        libelle: editing.libelle,
        lignes: editing.lignes.map((l) => ({
          compte: l.compte,
          tiers: l.tiers,
          libelle: l.libelle,
          debit: l.debit,
          credit: l.credit,
          echeance: l.echeance,
          lettrage: l.lettrage,
        })),
      }
    : DEFAULT_VALUES(exercice?.id ?? 0);

  const { register, handleSubmit, control, watch, setValue, formState: { errors, isSubmitting } } =
    useForm<EcritureFormValues>({
      resolver: zodResolver(ecritureInputSchema),
      defaultValues,
    });

  const { fields, append, remove } = useFieldArray({ control, name: 'lignes' });

  const lignesWatch = watch('lignes');
  const dateWatch = watch('date_ecriture');

  const totDebit = useMemo(
    () => lignesWatch.reduce((s, l) => s + (Number(l.debit) || 0), 0),
    [lignesWatch],
  );
  const totCredit = useMemo(
    () => lignesWatch.reduce((s, l) => s + (Number(l.credit) || 0), 0),
    [lignesWatch],
  );
  const ecart = Math.abs(totDebit - totCredit);
  const equilibree = totDebit === totCredit && totDebit > 0;

  const exerciceOk = exercice
    ? dateWatch >= exercice.date_debut && dateWatch <= exercice.date_fin && exercice.statut === 'ouvert'
    : false;

  async function submit(values: EcritureFormValues, validate: boolean) {
    setServerError(null);
    if (!magasin) return;
    let id: number | null = editing?.id ?? null;

    if (!editing) {
      const res = await window.api.ecritures.create(magasin.id, values);
      if (!res.success) {
        setServerError(res.error.message);
        return;
      }
      id = res.data.id;
    } else {
      const res = await window.api.ecritures.update(editing.id, values);
      if (!res.success) {
        setServerError(res.error.message);
        return;
      }
      id = res.data.id;
    }

    if (validate && id !== null) {
      const vRes = await window.api.ecritures.validate(id);
      if (!vRes.success) {
        setServerError(vRes.error.message);
        return;
      }
      toast.success('Écriture validée.');
    } else {
      toast.success(editing ? 'Écriture mise à jour.' : 'Brouillon enregistré.');
    }
    onSaved();
  }

  // journaux sans AN
  const journauxSaisie = journaux.filter((j) => j.code !== 'AN');

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-[940px] p-0 gap-0 flex flex-col max-h-[88vh]" showCloseButton={false}>
        {/* En-tête fixe */}
        <DialogHeader className="flex-none border-b border-border px-6 pt-5 pb-[18px]">
          <div className="flex items-start gap-[13px]">
            <span className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Pen size={18} />
            </span>
            <div className="flex-1 min-w-0 pr-7">
              <p className="text-[10.5px] font-extrabold uppercase tracking-widest text-primary mb-0.5">
                {editing ? 'Modification' : 'Saisie'} · partie double
              </p>
              <DialogTitle className="text-[17px] font-bold leading-tight">
                {editing ? "Modifier l'écriture" : 'Nouvelle écriture'}
              </DialogTitle>
              <p className="mt-0.5 text-[13px] font-medium text-muted-foreground leading-snug">
                {magasin.libelle}{exercice ? ` · Exercice ${exercice.libelle}` : ''}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              className="absolute top-3 right-3"
              onClick={onClose}
            >
              <X />
              <span className="sr-only">Fermer</span>
            </Button>
          </div>
        </DialogHeader>

        {/* Zone scrollable : erreur serveur + formulaire */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Erreur serveur */}
          {serverError && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 text-destructive px-3 py-2.5 text-sm font-semibold mb-3">
              <AlertTriangle size={15} className="flex-none" />
              {serverError}
            </div>
          )}

          <form
            id="ecriture-form"
            onSubmit={handleSubmit((v) => void submit(v, false))}
            className="flex flex-col gap-4 pt-1 pb-2"
          >
            {/* 3 champs en-tête */}
            <div className="flex flex-wrap gap-3">
              <div className="flex flex-col gap-1.5" style={{ width: 200 }}>
                <Label>Journal</Label>
                <Controller
                  name="journal"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger aria-invalid={errors.journal ? 'true' : undefined}>
                        <SelectValue placeholder="Choisir…" />
                      </SelectTrigger>
                      <SelectContent>
                        {journauxSaisie.map((j) => (
                          <SelectItem key={j.code} value={j.code}>
                            {j.code} — {j.libelle}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.journal && <p className="text-xs text-destructive">{errors.journal.message}</p>}
              </div>

              <div className="flex flex-col gap-1.5" style={{ width: 170 }}>
                <Label>Date d&apos;écriture</Label>
                <Input
                  type="date"
                  className={!exerciceOk && dateWatch ? 'border-amber-500 focus-visible:ring-amber-500' : ''}
                  aria-invalid={errors.date_ecriture ? 'true' : undefined}
                  {...register('date_ecriture')}
                />
                {errors.date_ecriture && <p className="text-xs text-destructive">{errors.date_ecriture.message}</p>}
              </div>

              <div className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
                <Label>Libellé de la pièce</Label>
                <Input
                  placeholder="ex. Facture FV-1062 — Boutique Adjamé"
                  aria-invalid={errors.libelle ? 'true' : undefined}
                  {...register('libelle')}
                />
                {errors.libelle && <p className="text-xs text-destructive">{errors.libelle.message}</p>}
              </div>
            </div>

            {/* Avertissement date hors exercice */}
            {!exerciceOk && dateWatch && (
              <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 px-3 py-2 text-sm font-bold -mt-1">
                <AlertTriangle size={15} className="flex-none" />
                Aucun exercice ouvert ne couvre cette date — la validation sera refusée.
              </div>
            )}

            {/* Lignes en grille */}
            <div className="flex flex-col gap-2">
              {/* En-tête grille */}
              <div className="grid gap-2 px-0.5" style={{ gridTemplateColumns: '1.5fr 1.3fr 1.4fr 110px 110px 34px' }}>
                <div className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">Compte</div>
                <div className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">Tiers</div>
                <div className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">Libellé ligne</div>
                <div className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground text-right">Débit</div>
                <div className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground text-right">Crédit</div>
                <div></div>
              </div>

              {/* Lignes */}
              {fields.map((field, i) => {
                const compteVal = lignesWatch[i]?.compte ?? '';
                const estCollectif = compteVal ? estAncreCollectif(compteVal) : false;
                const compteLibelle = compteVal
                  ? (comptes.find((c) => c.numero === compteVal)?.libelle ?? '')
                  : '';

                return (
                  <div key={field.id} className="grid gap-2 items-center" style={{ gridTemplateColumns: '1.5fr 1.3fr 1.4fr 110px 110px 34px' }}>
                    {/* Compte */}
                    <Controller
                      name={`lignes.${i}.compte`}
                      control={control}
                      render={({ field: cf }) => (
                        <Combobox<string>
                          value={cf.value || null}
                          onValueChange={(v) => {
                            cf.onChange(v ?? '');
                            if (!v || !estAncreCollectif(v)) {
                              setValue(`lignes.${i}.tiers`, null);
                            }
                          }}
                        >
                          <ComboboxInput
                            className="h-[38px] text-[13px]"
                            placeholder={compteVal ? `${compteVal}${compteLibelle ? ' — ' + compteLibelle : ''}` : 'Compte…'}
                            showClear={!!cf.value}
                          />
                          <ComboboxContent>
                            <ComboboxList>
                              <ComboboxEmpty>Aucun compte.</ComboboxEmpty>
                              {comptes.map((c) => (
                                <ComboboxItem key={c.numero} value={c.numero}>
                                  <span className="font-mono text-primary mr-1">{c.numero}</span>
                                  <span>{c.libelle}</span>
                                </ComboboxItem>
                              ))}
                            </ComboboxList>
                          </ComboboxContent>
                        </Combobox>
                      )}
                    />

                    {/* Tiers */}
                    <Controller
                      name={`lignes.${i}.tiers`}
                      control={control}
                      render={({ field: tf }) => (
                        <Select
                          value={tf.value ?? ''}
                          onValueChange={(v) => tf.onChange(v || null)}
                          disabled={!estCollectif}
                        >
                          <SelectTrigger
                            className="h-[38px] text-[13px]"
                            style={{ opacity: estCollectif ? 1 : 0.5 }}
                          >
                            <SelectValue placeholder={estCollectif ? 'Sélectionner…' : '—'} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">—</SelectItem>
                            {tiers.map((t) => (
                              <SelectItem key={t.code} value={t.code}>
                                {t.code} — {t.raison_sociale}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />

                    {/* Libellé ligne */}
                    <Input
                      className="h-[38px] text-[13px]"
                      placeholder="Libellé"
                      {...register(`lignes.${i}.libelle`)}
                    />

                    {/* Débit */}
                    <Input
                      className="h-[38px] text-[13px] text-right"
                      type="number"
                      min={0}
                      placeholder="0"
                      onDoubleClick={() => {
                        const otherDebit = lignesWatch.reduce((s, l, idx2) => idx2 === i ? s : s + (Number(l.debit) || 0), 0);
                        const otherCredit = lignesWatch.reduce((s, l, idx2) => idx2 === i ? s : s + (Number(l.credit) || 0), 0);
                        const ecartOther = otherCredit - otherDebit;
                        if (ecartOther > 0) {
                          setValue(`lignes.${i}.debit`, ecartOther);
                          setValue(`lignes.${i}.credit`, 0);
                        }
                      }}
                      {...register(`lignes.${i}.debit`, {
                        valueAsNumber: true,
                        onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                          const v = Number(e.target.value) || 0;
                          if (v > 0) setValue(`lignes.${i}.credit`, 0);
                        },
                      })}
                    />

                    {/* Crédit */}
                    <Input
                      className="h-[38px] text-[13px] text-right"
                      type="number"
                      min={0}
                      placeholder="0"
                      onDoubleClick={() => {
                        const otherDebit = lignesWatch.reduce((s, l, idx2) => idx2 === i ? s : s + (Number(l.debit) || 0), 0);
                        const otherCredit = lignesWatch.reduce((s, l, idx2) => idx2 === i ? s : s + (Number(l.credit) || 0), 0);
                        const ecartOther = otherDebit - otherCredit;
                        if (ecartOther > 0) {
                          setValue(`lignes.${i}.credit`, ecartOther);
                          setValue(`lignes.${i}.debit`, 0);
                        }
                      }}
                      {...register(`lignes.${i}.credit`, {
                        valueAsNumber: true,
                        onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                          const v = Number(e.target.value) || 0;
                          if (v > 0) setValue(`lignes.${i}.debit`, 0);
                        },
                      })}
                    />

                    {/* Supprimer */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      disabled={fields.length <= 2}
                      onClick={() => remove(i)}
                      aria-label="Supprimer la ligne"
                    >
                      <Trash2 className="size-3.5 text-destructive" />
                    </Button>
                  </div>
                );
              })}

              {errors.lignes && !Array.isArray(errors.lignes) && (
                <p className="text-xs text-destructive">{(errors.lignes as { message?: string }).message}</p>
              )}

              {/* Ajouter une ligne */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="self-start mt-1"
                onClick={() => append(ligneVide())}
              >
                <Plus className="size-4" /> Ajouter une ligne
              </Button>

              {/* Hint */}
              <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mt-0.5">
                <BookOpen size={13} className="flex-none" />
                Astuce : double-cliquez sur un champ montant pour équilibrer automatiquement la ligne.
              </p>
            </div>
          </form>
        </div>

        {/* Footer ancré */}
        <div className="flex-none border-t border-border px-6 py-4 flex items-center justify-between flex-wrap gap-4">
          {/* Balance à gauche */}
          <div className="flex items-center gap-6">
            <div className="flex flex-col gap-0.5">
              <span className="text-[10.5px] font-extrabold uppercase tracking-widest text-muted-foreground">Total débit</span>
              <span className="text-[15px] font-bold">{fmtMontant(totDebit)}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10.5px] font-extrabold uppercase tracking-widest text-muted-foreground">Total crédit</span>
              <span className="text-[15px] font-bold">{fmtMontant(totCredit)}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10.5px] font-extrabold uppercase tracking-widest text-muted-foreground">Écart</span>
              <span className={`text-[15px] font-bold ${ecart !== 0 ? 'text-destructive' : ''}`}>{fmtMontant(ecart)}</span>
            </div>
            {equilibree ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-green-600/15 text-green-700 dark:text-green-400 px-3 py-1.5 text-sm font-extrabold">
                <CheckCircle size={16} /> {'Équilibrée'}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/15 text-destructive px-3 py-1.5 text-sm font-extrabold">
                <AlertTriangle size={16} /> {'Déséquilibrée'}
              </span>
            )}
          </div>

          {/* Boutons à droite */}
          <div className="flex items-center gap-2.5">
            <Button variant="outline" size="lg" onClick={onClose}>
              <X /> Annuler
            </Button>
            <Button
              variant="outline"
              size="lg"
              type="submit"
              form="ecriture-form"
              disabled={isSubmitting}
            >
              <Save /> {isSubmitting ? 'Enregistrement…' : 'Brouillon'}
            </Button>
            <Button
              size="lg"
              disabled={isSubmitting || !equilibree}
              onClick={() => void handleSubmit((v) => submit(v, true))()}
            >
              <Check /> Valider
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── modal DÉTAIL ─────────────────────────────────────────────────────────────

type AlertAction = 'validate' | 'delete' | 'reverse' | 'invalidate';

interface DetailProps {
  ecriture: EcritureAvecLignes;
  user: AuthUser;
  comptes: Compte[];
  tiers: Tiers[];
  onClose: () => void;
  onEdit: () => void;
  onReload: () => void;
}

function ModalDetail({ ecriture, user, comptes, tiers, onClose, onEdit, onReload }: DetailProps): React.JSX.Element {
  const [pending, setPending] = useState<AlertAction | null>(null);

  const compteByNum = useMemo(() => new Map(comptes.map((c) => [c.numero, c])), [comptes]);
  const tiersByCode = useMemo(() => new Map(tiers.map((t) => [t.code, t])), [tiers]);

  const totDebit = ecriture.lignes.reduce((s, l) => s + l.debit, 0);
  const totCredit = ecriture.lignes.reduce((s, l) => s + l.credit, 0);

  async function doAction(action: AlertAction) {
    setPending(null);
    let err: string | null = null;
    if (action === 'validate') {
      const r = await window.api.ecritures.validate(ecriture.id);
      if (!r.success) err = r.error.message;
      else toast.success('Écriture validée.');
    } else if (action === 'delete') {
      const r = await window.api.ecritures.delete(ecriture.id);
      if (!r.success) err = r.error.message;
      else toast.success('Écriture supprimée.');
    } else if (action === 'reverse') {
      const r = await window.api.ecritures.reverse(ecriture.id);
      if (!r.success) err = r.error.message;
      else toast.success('Extourne créée.');
    } else if (action === 'invalidate') {
      const r = await window.api.ecritures.invalidate(ecriture.id);
      if (!r.success) err = r.error.message;
      else toast.success('Écriture invalidée.');
    }
    if (err) { toast.error(err); return; }
    onReload();
    onClose();
  }

  const alertMsg: Record<AlertAction, string> = {
    validate: 'Cette écriture sera validée et deviendra immuable.',
    delete: 'Ce brouillon sera définitivement supprimé. Cette action est irréversible.',
    reverse: `L'écriture ${ecriture.ref || ecriture.id} sera extournée (toutes les lignes inversées, nouvelle écriture validée).`,
    invalidate: `L'écriture ${ecriture.ref} sera invalidée. Cette action est réservée aux administrateurs.`,
  };
  const alertLabel: Record<AlertAction, string> = {
    validate: 'Valider',
    delete: 'Supprimer',
    reverse: 'Extourner',
    invalidate: 'Invalider',
  };

  return (
    <>
      <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
        <DialogContent className="sm:max-w-[760px]" showCloseButton={false}>
          <DialogHeader className="border-b border-border pb-[18px] -mt-1">
            <div className="flex items-start gap-[13px]">
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-primary/10 text-primary">
                <BookOpen size={20} />
              </span>
              <div className="flex-1 min-w-0 pr-7">
                <p className="text-[10.5px] font-extrabold uppercase tracking-widest text-primary mb-0.5">
                  Écriture comptable
                </p>
                <DialogTitle className="text-[17px] font-bold leading-tight font-mono">
                  {ecriture.ref || 'Brouillon'}
                </DialogTitle>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <StatutBadge statut={ecriture.statut} />
                  <Badge variant="outline">{ecriture.journal}</Badge>
                  {ecriture.reversal_of_id !== null && (
                    <Badge variant="secondary">Extourne</Badge>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                className="absolute top-3 right-3"
                onClick={onClose}
              >
                <X />
              </Button>
            </div>
          </DialogHeader>

          <p className="text-sm font-semibold text-muted-foreground -mb-2 px-0.5">
            {ecriture.libelle}
          </p>

          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Compte</TableHead>
                  <TableHead>Tiers</TableHead>
                  <TableHead>Libellé</TableHead>
                  <TableHead className="text-right">Débit</TableHead>
                  <TableHead className="text-right">Crédit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ecriture.lignes.map((l, idx) => {
                  const c = compteByNum.get(l.compte);
                  const t = l.tiers ? tiersByCode.get(l.tiers) : null;
                  return (
                    <TableRow key={idx}>
                      <TableCell>
                        <span className="font-mono text-primary">{l.compte}</span>
                        {c && <span className="ml-1.5 text-xs text-muted-foreground">{c.libelle}</span>}
                      </TableCell>
                      <TableCell>
                        {t ? (
                          <span className="font-semibold">{t.raison_sociale}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{l.libelle || '—'}</TableCell>
                      <TableCell className="text-right font-mono">
                        {l.debit > 0 ? fmtMontant(l.debit) : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {l.credit > 0 ? fmtMontant(l.credit) : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={3} className="font-bold">Totaux</TableCell>
                  <TableCell className="text-right font-mono font-bold">{fmtMontant(totDebit)}</TableCell>
                  <TableCell className="text-right font-mono font-bold">{fmtMontant(totCredit)}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>

          {/* Actions selon statut */}
          <div className="flex items-center justify-between gap-3 pt-2 flex-wrap">
            <div className="flex gap-2">
              {ecriture.statut === 'brouillon' && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setPending('delete')}
                >
                  <Trash2 /> Supprimer
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              {ecriture.statut === 'brouillon' && (
                <>
                  <Button variant="outline" size="sm" onClick={onEdit}>
                    <Pencil /> Modifier
                  </Button>
                  <Button size="sm" onClick={() => setPending('validate')}>
                    <CheckCircle /> Valider
                  </Button>
                </>
              )}
              {ecriture.statut === 'validee' && (
                <>
                  <Button variant="outline" size="sm" onClick={() => setPending('reverse')}>
                    Extourner
                  </Button>
                  {user.role === 'Admin' && (
                    <Button variant="destructive" size="sm" onClick={() => setPending('invalidate')}>
                      Invalider
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={pending !== null}
        onOpenChange={(o) => { if (!o) setPending(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pending === 'delete' ? 'Supprimer le brouillon ?' :
               pending === 'validate' ? "Valider l'écriture ?" :
               pending === 'reverse' ? "Extourner l'écriture ?" :
               "Invalider l'écriture ?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pending ? alertMsg[pending] : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              variant={pending === 'delete' || pending === 'invalidate' ? 'destructive' : 'default'}
              onClick={() => { if (pending) void doAction(pending); }}
            >
              {pending ? alertLabel[pending] : ''}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ─── module principal ─────────────────────────────────────────────────────────

type FiltreStatut = '' | 'brouillon' | 'validee';

interface Props {
  user: AuthUser;
  magasin: Magasin | null;
  exercice: Exercice | null;
}

export function EcrituresModule({ user, magasin, exercice }: Props): React.JSX.Element {
  const [rows, setRows] = useState<EcritureListItem[]>([]);
  const [comptes, setComptes] = useState<Compte[]>([]);
  const [journaux, setJournaux] = useState<Journal[]>([]);
  const [tiers, setTiers] = useState<Tiers[]>([]);
  const [loading, setLoading] = useState(false);

  // Filtres
  const [filtreStatut, setFiltreStatut] = useState<FiltreStatut>('');
  const [filtreJournal, setFiltreJournal] = useState('');
  const [q, setQ] = useState('');

  // Modals
  const [saisieOpen, setSaisieOpen] = useState(false);
  const [editingEcriture, setEditingEcriture] = useState<EcritureAvecLignes | null>(null);
  const [detailEcriture, setDetailEcriture] = useState<EcritureAvecLignes | null>(null);

  // Garde anti-race : si le magasin change pendant un load, on ignore la réponse périmée
  useEffect(() => {
    if (!magasin) {
      setRows([]); setComptes([]); setJournaux([]); setTiers([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all([
      window.api.ecritures.list(magasin.id),
      window.api.comptes.list(magasin.id),
      window.api.journaux.list(magasin.id),
      window.api.tiers.list(magasin.id),
    ]).then(([eRes, cRes, jRes, tRes]) => {
      if (cancelled) return;
      if (eRes.success) setRows(eRes.data); else toast.error(eRes.error.message);
      if (cRes.success) setComptes(cRes.data);
      if (jRes.success) setJournaux(jRes.data);
      if (tRes.success) setTiers(tRes.data);
      setLoading(false);
    }).catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [magasin]);

  async function reload() {
    if (magasin) {
      const eRes = await window.api.ecritures.list(magasin.id);
      if (eRes.success) setRows(eRes.data); else toast.error(eRes.error.message);
    }
  }

  async function openDetail(item: EcritureListItem) {
    const res = await window.api.ecritures.get(item.id);
    if (!res.success) { toast.error(res.error.message); return; }
    setDetailEcriture(res.data);
  }

  async function openEdit(item: EcritureListItem | EcritureAvecLignes) {
    // Si on passe déjà un EcritureAvecLignes depuis le détail, on l'utilise directement
    if ('lignes' in item) {
      setEditingEcriture(item);
      setDetailEcriture(null);
      setSaisieOpen(true);
      return;
    }
    const res = await window.api.ecritures.get(item.id);
    if (!res.success) { toast.error(res.error.message); return; }
    setEditingEcriture(res.data);
    setDetailEcriture(null);
    setSaisieOpen(true);
  }

  function openCreate() {
    setEditingEcriture(null);
    setSaisieOpen(true);
  }

  const filtered = useMemo(
    () =>
      rows.filter((e) =>
        (!filtreStatut || e.statut === filtreStatut) &&
        (!filtreJournal || e.journal === filtreJournal) &&
        (!q || `${e.ref} ${e.libelle}`.toLowerCase().includes(q.toLowerCase())),
      ),
    [rows, filtreStatut, filtreJournal, q],
  );

  const counts = useMemo(() => ({
    all: rows.length,
    brouillon: rows.filter((e) => e.statut === 'brouillon').length,
    validee: rows.filter((e) => e.statut === 'validee').length,
  }), [rows]);

  if (!magasin) {
    return (
      <div className="grid h-full place-items-center p-10 text-center">
        <p className="text-sm font-semibold text-muted-foreground">
          Sélectionnez un magasin pour afficher ses écritures.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 pb-16">
      {/* En-tête de page */}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight leading-tight">
            Écritures comptables
          </h1>
          <p className="mt-1 text-sm font-semibold text-muted-foreground">
            Saisie manuelle en partie double &mdash; {magasin.libelle}{exercice ? `, exercice ${exercice.libelle}.` : '.'}
          </p>
        </div>
        <Button size="lg" onClick={openCreate}>
          <Plus /> Nouvelle écriture
        </Button>
      </div>

      {/* Barre de filtres DANS UNE CARTE */}
      <div className="rounded-lg border border-border bg-card p-3.5 mb-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Segment Toutes / Validées / Brouillons */}
          <div className="inline-flex rounded-lg bg-secondary p-1 gap-0.5">
            {([
              ['', 'Toutes', counts.all],
              ['validee', 'Validées', counts.validee],
              ['brouillon', 'Brouillons', counts.brouillon],
            ] as [FiltreStatut, string, number][]).map(([v, lbl, n]) => (
              <button
                key={v}
                onClick={() => setFiltreStatut(v)}
                className={`rounded-md px-3 py-1.5 text-sm font-bold transition-colors ${
                  filtreStatut === v
                    ? 'bg-card shadow-sm text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {lbl} <span className="opacity-60">· {n}</span>
              </button>
            ))}
          </div>

          {/* Filtre journal */}
          <Select value={filtreJournal || '_all'} onValueChange={(v) => setFiltreJournal(v === '_all' ? '' : v)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Tous les journaux</SelectItem>
              {journaux.map((j) => (
                <SelectItem key={j.code} value={j.code}>
                  {j.code} — {j.libelle}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Recherche */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Rechercher une référence, un libellé…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>
      </div>

      {loading && <p className="text-sm text-muted-foreground mb-4">Chargement…</p>}

      {/* Tableau DANS UNE CARTE */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {!loading && filtered.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-semibold text-muted-foreground">
              {rows.length === 0
                ? 'Aucune écriture. Créez-en une nouvelle pour commencer.'
                : 'Aucune écriture ne correspond à ces filtres.'}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Référence</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Libellé</TableHead>
                <TableHead>Journal</TableHead>
                <TableHead className="text-right">Débit</TableHead>
                <TableHead className="text-right">Crédit</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((e) => (
                <TableRow
                  key={e.id}
                  className="cursor-pointer"
                  onClick={() => void openDetail(e)}
                >
                  <TableCell className="font-mono text-primary">
                    {e.ref || <span className="text-muted-foreground text-sm">— brouillon —</span>}
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {fmtDate(e.date_ecriture)}
                  </TableCell>
                  <TableCell className="max-w-[260px] truncate">{e.libelle}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{e.journal}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono">{fmtMontant(e.total_debit)}</TableCell>
                  <TableCell className="text-right font-mono">{fmtMontant(e.total_credit)}</TableCell>
                  <TableCell>
                    <StatutBadge statut={e.statut} />
                  </TableCell>
                  <TableCell onClick={(ev) => ev.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm" aria-label="Actions">
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" style={{ minWidth: 190 }}>
                        <DropdownMenuItem onClick={() => void openDetail(e)}>
                          <Eye className="size-4" /> Détail
                        </DropdownMenuItem>
                        {e.statut === 'brouillon' && (
                          <DropdownMenuItem onClick={() => void openEdit(e)}>
                            <Pencil className="size-4" /> Modifier
                          </DropdownMenuItem>
                        )}
                        {e.statut === 'brouillon' && (
                          <DropdownMenuItem onClick={async () => {
                            const full = await window.api.ecritures.get(e.id);
                            if (full.success) {
                              const r = await window.api.ecritures.validate(e.id);
                              if (!r.success) toast.error(r.error.message);
                              else { toast.success('Écriture validée.'); void reload(); }
                            }
                          }}>
                            <Check className="size-4" /> Valider
                          </DropdownMenuItem>
                        )}
                        {e.statut === 'validee' && (
                          <DropdownMenuItem onClick={async () => {
                            const r = await window.api.ecritures.reverse(e.id);
                            if (!r.success) toast.error(r.error.message);
                            else { toast.success('Extourne créée.'); void reload(); }
                          }}>
                            Extourner
                          </DropdownMenuItem>
                        )}
                        {e.statut === 'brouillon' && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={async () => {
                                const r = await window.api.ecritures.delete(e.id);
                                if (!r.success) toast.error(r.error.message);
                                else { toast.success('Écriture supprimée.'); void reload(); }
                              }}
                            >
                              <Trash2 className="size-4" /> Supprimer
                            </DropdownMenuItem>
                          </>
                        )}
                        {e.statut === 'validee' && user.role === 'Admin' && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={async () => {
                                const r = await window.api.ecritures.invalidate(e.id);
                                if (!r.success) toast.error(r.error.message);
                                else { toast.success('Écriture invalidée.'); void reload(); }
                              }}
                            >
                              Invalider
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Modal saisie */}
      {saisieOpen && (
        <ModalSaisie
          magasin={magasin}
          exercice={exercice}
          editing={editingEcriture}
          comptes={comptes}
          journaux={journaux}
          tiers={tiers}
          onClose={() => { setSaisieOpen(false); setEditingEcriture(null); }}
          onSaved={() => { setSaisieOpen(false); setEditingEcriture(null); void reload(); }}
        />
      )}

      {/* Modal détail */}
      {detailEcriture && (
        <ModalDetail
          ecriture={detailEcriture}
          user={user}
          comptes={comptes}
          tiers={tiers}
          onClose={() => setDetailEcriture(null)}
          onEdit={() => { void openEdit(detailEcriture); }}
          onReload={() => void reload()}
        />
      )}
    </div>
  );
}
