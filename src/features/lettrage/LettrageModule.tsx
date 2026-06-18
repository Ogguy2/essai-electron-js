import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle, Info, Link2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { TableSkeleton } from '@/components/skeletons';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { nextLettrageCode } from '@/domain/reporting';
import type { Magasin, Compte, Tiers, LigneLettrable } from '@/shared/ipc';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtFcfa(n: number): string {
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' FCFA';
}

function fmtFcfaShort(n: number): string {
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

function fmtDate(s: string): string {
  if (!s) return '-';
  const [y, m, d] = s.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

// ---------------------------------------------------------------------------
// LettrageModule
// ---------------------------------------------------------------------------

interface Props {
  magasin: Magasin | null;
}

export function LettrageModule({ magasin }: Props): React.JSX.Element {
  const [comptes, setComptes] = useState<Compte[]>([]);
  const [tiersList, setTiersList] = useState<Tiers[]>([]);
  const [selectedCompte, setSelectedCompte] = useState<string>('');
  const [selectedTiers, setSelectedTiers] = useState<string>('');
  const [lignes, setLignes] = useState<LigneLettrable[]>([]);
  const [loadingLignes, setLoadingLignes] = useState(false);
  const [selection, setSelection] = useState<Set<number>>(new Set());
  const [lettrant, setLettrant] = useState(false);
  const [delettrantDialogOpen, setDelettrantDialogOpen] = useState(false);
  const [delettrantGroupCode, setDelettrantGroupCode] = useState<string | null>(null);

  // Charge comptes lettrables + tiers
  useEffect(() => {
    if (!magasin) {
      setComptes([]);
      setTiersList([]);
      setSelectedCompte('');
      setSelectedTiers('');
      setLignes([]);
      return;
    }
    let cancelled = false;
    void Promise.all([
      window.api.comptes.list(magasin.id),
      window.api.tiers.list(magasin.id),
    ]).then(([cRes, tRes]) => {
      if (cancelled) return;
      if (cRes.success) {
        const lettrables = cRes.data.filter((c) => c.lettrable);
        setComptes(lettrables);
        setSelectedCompte(lettrables[0]?.numero ?? '');
      } else {
        toast.error(cRes.error.message);
      }
      if (tRes.success) setTiersList(tRes.data);
      else toast.error(tRes.error.message);
    });
    return () => { cancelled = true; };
  }, [magasin]);

  // Charge les lignes lettrables au changement de compte ou tiers
  useEffect(() => {
    if (!magasin || !selectedCompte) {
      setLignes([]);
      return;
    }
    let cancelled = false;
    setLoadingLignes(true);
    setSelection(new Set());
    const tiersArg = selectedTiers && selectedTiers !== '_all' ? selectedTiers : undefined;
    void window.api.lettrage.lignes(magasin.id, selectedCompte, tiersArg).then((res) => {
      if (cancelled) return;
      if (res.success) setLignes(res.data);
      else toast.error(res.error.message);
      setLoadingLignes(false);
    });
    return () => { cancelled = true; };
  }, [magasin, selectedCompte, selectedTiers]);

  // Prochain code de lettrage
  const prochainCode = useMemo(
    () => nextLettrageCode(lignes.map((l) => l.lettrage).filter((v): v is string => v !== null)),
    [lignes],
  );

  // Groupes lettres : lignes ayant un code de lettrage, regroupees par code
  const groupesLettres = useMemo(() => {
    const map = new Map<string, LigneLettrable[]>();
    for (const l of lignes) {
      if (l.lettrage) {
        const bucket = map.get(l.lettrage);
        if (bucket) bucket.push(l);
        else map.set(l.lettrage, [l]);
      }
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [lignes]);

  // Calcul panneau de selection
  const selectionDetails = useMemo(() => {
    const selectedLignes = lignes.filter((l) => selection.has(l.ligne_id));
    const sumDebit = selectedLignes.reduce((a, l) => a + l.debit, 0);
    const sumCredit = selectedLignes.reduce((a, l) => a + l.credit, 0);
    const ecart = sumDebit - sumCredit;
    const hasLettrees = selectedLignes.some((l) => l.lettrage !== null);
    return { count: selectedLignes.length, sumDebit, sumCredit, ecart, hasLettrees, selectedLignes };
  }, [lignes, selection]);

  // Map tiers par code pour la colonne tiers du tableau
  const tiersByCode = useMemo(() => {
    const m = new Map<string, Tiers>();
    for (const t of tiersList) m.set(t.code, t);
    return m;
  }, [tiersList]);

  // Tiers filtres selon le compte selectionne
  const tiersOfCompte = useMemo(() => {
    if (selectedCompte.startsWith('4111')) return tiersList.filter((t) => t.est_client);
    if (selectedCompte.startsWith('4011')) return tiersList.filter((t) => t.est_fournisseur);
    return tiersList;
  }, [selectedCompte, tiersList]);

  const showTiersFilter = selectedCompte.startsWith('4111') || selectedCompte.startsWith('4011');

  function toggleLine(ligneId: number) {
    setSelection((prev) => {
      const next = new Set(prev);
      if (next.has(ligneId)) next.delete(ligneId);
      else next.add(ligneId);
      return next;
    });
  }

  function toggleAll() {
    if (selection.size === lignes.length) {
      setSelection(new Set());
    } else {
      setSelection(new Set(lignes.map((l) => l.ligne_id)));
    }
  }

  async function reloadLignes() {
    if (!magasin || !selectedCompte) return;
    const tiersArg = selectedTiers && selectedTiers !== '_all' ? selectedTiers : undefined;
    const r = await window.api.lettrage.lignes(magasin.id, selectedCompte, tiersArg);
    if (r.success) setLignes(r.data);
  }

  async function handleLettrer() {
    if (selection.size === 0) return;
    setLettrant(true);
    const res = await window.api.lettrage.lettrer([...selection]);
    setLettrant(false);
    if (!res.success) {
      toast.error(res.error.message);
      return;
    }
    toast.success(`Lignes lettrees "${res.data}"`);
    setSelection(new Set());
    await reloadLignes();
  }

  async function handleDelettrer() {
    const ids = delettrantGroupCode !== null
      ? (groupesLettres.find(([code]) => code === delettrantGroupCode)?.[1] ?? []).map((l) => l.ligne_id)
      : selectionDetails.selectedLignes.filter((l) => l.lettrage !== null).map((l) => l.ligne_id);
    if (ids.length === 0) return;
    setDelettrantDialogOpen(false);
    setDelettrantGroupCode(null);
    const res = await window.api.lettrage.delettrer(ids);
    if (!res.success) {
      toast.error(res.error.message);
      return;
    }
    toast.success('Delettrage effectue.');
    setSelection(new Set());
    await reloadLignes();
  }

  if (!magasin) {
    return (
      <div className="grid h-full place-items-center p-10 text-center">
        <p className="text-sm font-semibold text-muted-foreground">
          Selectionnez un magasin pour acceder au lettrage.
        </p>
      </div>
    );
  }

  const allChecked = lignes.length > 0 && selection.size === lignes.length;
  const someChecked = selection.size > 0 && selection.size < lignes.length;
  const equilibre = selectionDetails.ecart === 0 && selectionDetails.count >= 2;
  const lettreCount = lignes.filter((l) => l.lettrage !== null).length;

  return (
    <div className="p-6 pb-16">
      {/* En-tete */}
      <div className="mb-5">
        <h1 className="text-2xl font-extrabold tracking-tight leading-tight">
          Lettrage
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Rapprochez factures et reglements sur un meme compte tiers pour solder les creances et dettes.
        </p>
      </div>

      {/* Grille 2 colonnes : tableau | panneau sticky */}
      <div className="grid gap-4 items-start lg:grid-cols-[1fr_320px]">

        {/* Colonne gauche */}
        <div className="flex flex-col gap-4">

          {/* Carte filtres */}
          <div className="rounded-lg border bg-card p-3.5">
            <div className="flex flex-wrap items-center gap-3">
              <div style={{ width: 280 }}>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                  Compte a lettrer
                </label>
                <Select
                  value={selectedCompte}
                  onValueChange={(v) => {
                    setSelectedCompte(v);
                    setSelectedTiers('');
                    setSelection(new Set());
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choisir un compte lettrable" />
                  </SelectTrigger>
                  <SelectContent>
                    {comptes.length === 0 && (
                      <SelectItem value="_none" disabled>Aucun compte lettrable</SelectItem>
                    )}
                    {comptes.map((c) => (
                      <SelectItem key={c.numero} value={c.numero}>
                        {c.numero} — {c.libelle}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {showTiersFilter && (
                <div style={{ width: 260 }}>
                  <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                    Tiers (optionnel)
                  </label>
                  <Select
                    value={selectedTiers || '_all'}
                    onValueChange={(v) => {
                      setSelectedTiers(v === '_all' ? '' : v);
                      setSelection(new Set());
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Tous les tiers" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_all">Tous les tiers</SelectItem>
                      {tiersOfCompte.map((t) => (
                        <SelectItem key={t.code} value={t.code}>
                          {t.code} — {t.raison_sociale}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Legende */}
              <div className="ml-auto flex items-center gap-4 text-xs font-bold text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block size-2.5 rounded-full bg-green-500" />
                  Lettre
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block size-2.5 rounded-full bg-border" />
                  Non lettre
                </span>
              </div>
            </div>
          </div>

          {/* Carte tableau */}
          <div className="rounded-lg border bg-card overflow-hidden">
            {/* En-tete carte */}
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div className="text-sm font-bold">
                Lignes du compte{' '}
                <span className="font-mono text-primary">{selectedCompte || '...'}</span>
                {' '}
                <span className="font-semibold text-muted-foreground">
                  &middot; {lignes.length} ligne{lignes.length !== 1 ? 's' : ''},{' '}
                  {lettreCount} lettree{lettreCount !== 1 ? 's' : ''}
                </span>
              </div>
            </div>

            {loadingLignes ? (
              <TableSkeleton
                card={false}
                columns={['w-8', 'w-24', 'w-20', 'w-28', 'flex-1', 'w-24', 'w-24', 'w-16']}
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-10 px-4">
                      <Checkbox
                        checked={allChecked}
                        ref={(el) => {
                          if (el) {
                            (el as HTMLButtonElement & { indeterminate?: boolean }).indeterminate = someChecked;
                          }
                        }}
                        onCheckedChange={toggleAll}
                        aria-label="Tout selectionner"
                      />
                    </TableHead>
                    <TableHead className="px-4 font-bold">Date</TableHead>
                    <TableHead className="px-4 font-bold">Piece</TableHead>
                    <TableHead className="px-4 font-bold">Tiers</TableHead>
                    <TableHead className="px-4 font-bold">Libelle</TableHead>
                    <TableHead className="px-4 text-right font-bold">Debit</TableHead>
                    <TableHead className="px-4 text-right font-bold">Credit</TableHead>
                    <TableHead className="px-4 font-bold">Let.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lignes.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="px-4 py-8 text-center text-sm font-semibold text-muted-foreground"
                      >
                        {selectedCompte
                          ? 'Aucune ligne lettrable sur ce compte.'
                          : 'Selectionnez un compte lettrable.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    lignes.map((l) => {
                      const tiersObj = l.tiers ? tiersByCode.get(l.tiers) : null;
                      const isSelected = selection.has(l.ligne_id);
                      return (
                        <TableRow
                          key={l.ligne_id}
                          className={`cursor-pointer ${isSelected ? 'bg-primary/10 hover:bg-primary/10' : 'hover:bg-muted/20'}`}
                          onClick={() => toggleLine(l.ligne_id)}
                        >
                          <TableCell
                            className="w-10 px-4"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleLine(l.ligne_id)}
                              aria-label={`Selectionner ligne ${l.ligne_id}`}
                            />
                          </TableCell>
                          <TableCell className="px-4 text-muted-foreground whitespace-nowrap">
                            {fmtDate(l.date)}
                          </TableCell>
                          <TableCell className="px-4 font-mono text-xs font-bold text-primary">
                            {l.ref}
                          </TableCell>
                          <TableCell className="px-4 font-medium">
                            {tiersObj ? tiersObj.raison_sociale : <span className="text-muted-foreground">&mdash;</span>}
                          </TableCell>
                          <TableCell className="px-4 font-medium max-w-[200px] truncate">
                            {l.libelle}
                          </TableCell>
                          <TableCell className="px-4 text-right tabular-nums">
                            {l.debit ? fmtFcfa(l.debit) : <span className="text-muted-foreground">&mdash;</span>}
                          </TableCell>
                          <TableCell className="px-4 text-right tabular-nums">
                            {l.credit ? fmtFcfa(l.credit) : <span className="text-muted-foreground">&mdash;</span>}
                          </TableCell>
                          <TableCell className="px-4">
                            {l.lettrage ? (
                              <Badge
                                variant="outline"
                                className="text-green-700 border-green-400 dark:text-green-400"
                              >
                                {l.lettrage}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">&mdash;</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            )}
          </div>
        </div>

        {/* Colonne droite — sticky */}
        <div className="flex flex-col gap-4">

          {/* Carte Selection */}
          <div className="rounded-lg border bg-card p-4 lg:sticky lg:top-4">
            <div className="mb-3.5 text-sm font-bold">Selection</div>

            {selectionDetails.count === 0 ? (
              <p className="text-[13.5px] font-semibold leading-snug text-muted-foreground">
                Cochez des lignes du meme compte pour calculer leur solde et les lettrer.
              </p>
            ) : (
              <>
                {/* Lignes de sommes */}
                <div className="flex items-center justify-between py-1 text-[13.5px] font-bold">
                  <span className="text-muted-foreground">Lignes selectionnees</span>
                  <span className="text-[14.5px]">{selectionDetails.count}</span>
                </div>
                <div className="flex items-center justify-between py-1 text-[13.5px] font-bold">
                  <span className="text-muted-foreground">&Sigma; Debit</span>
                  <span className="tabular-nums text-[14.5px]">{fmtFcfaShort(selectionDetails.sumDebit)}</span>
                </div>
                <div className="flex items-center justify-between py-1 text-[13.5px] font-bold">
                  <span className="text-muted-foreground">&Sigma; Credit</span>
                  <span className="tabular-nums text-[14.5px]">{fmtFcfaShort(selectionDetails.sumCredit)}</span>
                </div>
                <div className="flex items-center justify-between py-1 text-[13.5px] font-bold">
                  <span className="text-muted-foreground">Ecart</span>
                  <span
                    className={`tabular-nums text-[14.5px] ${selectionDetails.ecart !== 0 ? 'text-destructive' : 'text-green-600 dark:text-green-400'}`}
                  >
                    {fmtFcfaShort(Math.abs(selectionDetails.ecart))}
                  </span>
                </div>

                <Separator className="my-3" />

                {/* Pastille d'etat */}
                <div
                  className={`flex items-center gap-2.5 rounded-[10px] px-3 py-[11px] ${equilibre ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}
                >
                  {equilibre
                    ? <CheckCircle size={17} />
                    : <Info size={17} />
                  }
                  <div>
                    <div className="text-[13.5px] font-extrabold leading-tight">
                      {equilibre ? 'Equilibre parfait' : 'Lettrage partiel'}
                    </div>
                    <div className="text-[12px] font-semibold leading-tight">
                      {equilibre ? 'Statut : lettre' : 'Solde non nul — statut : partiel'}
                    </div>
                  </div>
                </div>

                {/* Prochain code */}
                <div className="mt-3 text-[13px] font-bold text-muted-foreground">
                  Prochain code :{' '}
                  <span className="font-mono text-base font-extrabold text-primary">
                    {prochainCode}
                  </span>
                </div>

                {/* Boutons */}
                <Button
                  size="lg"
                  className="mt-3.5 w-full cursor-pointer"
                  disabled={selectionDetails.count === 0 || lettrant}
                  onClick={() => void handleLettrer()}
                >
                  <Link2 />
                  {lettrant ? 'Lettrage...' : `Lettrer "${prochainCode}"`}
                </Button>
                <Button
                  size="lg"
                  variant="ghost"
                  className="mt-2 w-full cursor-pointer"
                  onClick={() => setSelection(new Set())}
                >
                  Reinitialiser
                </Button>
              </>
            )}
          </div>

          {/* Carte Groupes lettres */}
          {groupesLettres.length > 0 && (
            <div className="rounded-lg border bg-card overflow-hidden">
              <div className="border-b px-4 py-3">
                <div className="text-sm font-bold">Groupes lettres</div>
              </div>
              <div className="p-1.5 flex flex-col">
                {groupesLettres.map(([code, gLignes], idx) => {
                  const sumD = gLignes.reduce((a, l) => a + l.debit, 0);
                  const sumC = gLignes.reduce((a, l) => a + l.credit, 0);
                  const eq = Math.abs(sumD - sumC) < 0.005;
                  return (
                    <div
                      key={code}
                      className={`flex items-center gap-2.5 px-3 py-2.5 ${idx > 0 ? 'border-t' : ''}`}
                    >
                      <Badge
                        variant="outline"
                        className={
                          eq
                            ? 'text-green-700 border-green-400 dark:text-green-400 font-bold'
                            : 'text-amber-700 border-amber-400 dark:text-amber-400 font-bold'
                        }
                      >
                        {code}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-bold leading-tight">
                          {gLignes.length} ligne{gLignes.length > 1 ? 's' : ''}{' '}
                          &middot; {fmtFcfaShort(sumD)} FCFA
                        </div>
                        <div className={`text-[11.5px] font-semibold leading-tight ${eq ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
                          {eq ? 'Lettre' : 'Partiel'}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="cursor-pointer shrink-0"
                        title="Delettrer"
                        onClick={() => {
                          setDelettrantGroupCode(code);
                          setDelettrantDialogOpen(true);
                        }}
                      >
                        <X className="size-3.5" />
                        Delettrer
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* AlertDialog delettrage */}
      <AlertDialog
        open={delettrantDialogOpen}
        onOpenChange={(o) => {
          setDelettrantDialogOpen(o);
          if (!o) setDelettrantGroupCode(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delettrer les lignes ?</AlertDialogTitle>
            <AlertDialogDescription>
              {delettrantGroupCode !== null
                ? `Le groupe « ${delettrantGroupCode} » sera deletre (${(groupesLettres.find(([c]) => c === delettrantGroupCode)?.[1] ?? []).length} ligne(s)). Cette action est reversible.`
                : `${selectionDetails.selectedLignes.filter((l) => l.lettrage !== null).length} ligne(s) lettree(s) seront deletrees. Cette action est reversible (vous pourrez relettrer plus tard).`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleDelettrer()}>
              Delettrer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
