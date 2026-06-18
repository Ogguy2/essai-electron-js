import React, { useEffect, useMemo, useState } from 'react';
import { Link2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { Magasin, Compte, Tiers, LigneLettrable } from '@/shared/ipc';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtFcfa(n: number): string {
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' FCFA';
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

  // Calcul panneau de selection
  const selectionDetails = useMemo(() => {
    const selectedLignes = lignes.filter((l) => selection.has(l.ligne_id));
    const sumDebit = selectedLignes.reduce((a, l) => a + l.debit, 0);
    const sumCredit = selectedLignes.reduce((a, l) => a + l.credit, 0);
    const ecart = sumDebit - sumCredit;
    const hasLettrees = selectedLignes.some((l) => l.lettrage !== null);
    return { count: selectedLignes.length, sumDebit, sumCredit, ecart, hasLettrees, selectedLignes };
  }, [lignes, selection]);

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

  async function handleLettrer() {
    if (selection.size === 0) return;
    setLettrant(true);
    const res = await window.api.lettrage.lettrer([...selection]);
    setLettrant(false);
    if (!res.success) {
      toast.error(res.error.message);
      return;
    }
    toast.success(`Lettrage ${res.data} applique avec succes.`);
    setSelection(new Set());
    // Recharge les lignes
    if (magasin && selectedCompte) {
      const tiersArg = selectedTiers && selectedTiers !== '_all' ? selectedTiers : undefined;
      const r = await window.api.lettrage.lignes(magasin.id, selectedCompte, tiersArg);
      if (r.success) setLignes(r.data);
    }
  }

  async function handleDelettrer() {
    const ids = selectionDetails.selectedLignes
      .filter((l) => l.lettrage !== null)
      .map((l) => l.ligne_id);
    if (ids.length === 0) return;
    setDelettrantDialogOpen(false);
    const res = await window.api.lettrage.delettrer(ids);
    if (!res.success) {
      toast.error(res.error.message);
      return;
    }
    toast.success('Delettrage effectue.');
    setSelection(new Set());
    if (magasin && selectedCompte) {
      const tiersArg = selectedTiers && selectedTiers !== '_all' ? selectedTiers : undefined;
      const r = await window.api.lettrage.lignes(magasin.id, selectedCompte, tiersArg);
      if (r.success) setLignes(r.data);
    }
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

  return (
    <div className="p-6 pb-16">
      {/* En-tete */}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight leading-tight flex items-center gap-2">
            <Link2 size={24} className="text-primary" />
            Lettrage
          </h1>
          <p className="mt-1 text-sm font-semibold text-muted-foreground">
            Rapprochement des lignes de comptes — {magasin.libelle}
          </p>
        </div>
      </div>

      {/* Filtres */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="w-80">
          <Select value={selectedCompte} onValueChange={(v) => { setSelectedCompte(v); setSelection(new Set()); }}>
            <SelectTrigger>
              <SelectValue placeholder="Choisir un compte lettrable" />
            </SelectTrigger>
            <SelectContent>
              {comptes.length === 0 && (
                <SelectItem value="_none" disabled>Aucun compte lettrable</SelectItem>
              )}
              {comptes.map((c) => (
                <SelectItem key={c.numero} value={c.numero}>
                  {c.numero} - {c.libelle}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-60">
          <Select value={selectedTiers} onValueChange={(v) => { setSelectedTiers(v); setSelection(new Set()); }}>
            <SelectTrigger>
              <SelectValue placeholder="Tous les tiers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Tous les tiers</SelectItem>
              {tiersList.map((t) => (
                <SelectItem key={t.code} value={t.code}>
                  {t.code} - {t.raison_sociale}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Panneau de selection */}
      {selectionDetails.count > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-4 rounded-lg border border-border bg-muted/30 px-4 py-3">
          <span className="text-sm font-bold">
            {selectionDetails.count} ligne{selectionDetails.count > 1 ? 's' : ''} selectionnee{selectionDetails.count > 1 ? 's' : ''}
          </span>
          <span className="text-sm tabular-nums">
            <span className="font-semibold text-muted-foreground">Debit :</span>{' '}
            <span className="font-bold">{fmtFcfa(selectionDetails.sumDebit)}</span>
          </span>
          <span className="text-sm tabular-nums">
            <span className="font-semibold text-muted-foreground">Credit :</span>{' '}
            <span className="font-bold">{fmtFcfa(selectionDetails.sumCredit)}</span>
          </span>
          <span className={`text-sm font-bold tabular-nums ${selectionDetails.ecart !== 0 ? 'text-destructive' : 'text-green-600 dark:text-green-400'}`}>
            Ecart : {fmtFcfa(Math.abs(selectionDetails.ecart))}{selectionDetails.ecart !== 0 ? '' : ' '}
          </span>
          {equilibre && (
            <Badge className="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 border-green-300">
              Equilibre parfait
            </Badge>
          )}
          <div className="ml-auto flex gap-2">
            {selectionDetails.hasLettrees && (
              <Button
                size="lg"
                variant="outline"
                onClick={() => setDelettrantDialogOpen(true)}
              >
                Delettrer
              </Button>
            )}
            <Button
              size="lg"
              disabled={selectionDetails.count === 0 || lettrant}
              onClick={() => void handleLettrer()}
            >
              <Link2 />
              {lettrant ? 'Lettrage...' : 'Lettrer'}
            </Button>
          </div>
        </div>
      )}

      {/* Table des lignes */}
      {loadingLignes && <p className="text-sm text-muted-foreground">Chargement...</p>}
      {!loadingLignes && (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="w-10 px-4 py-2.5">
                  <Checkbox
                    checked={allChecked}
                    ref={(el) => {
                      if (el) (el as HTMLButtonElement & { indeterminate?: boolean }).indeterminate = someChecked;
                    }}
                    onCheckedChange={toggleAll}
                    aria-label="Tout selectionner"
                  />
                </th>
                <th className="px-4 py-2.5 text-left font-bold">Date</th>
                <th className="px-4 py-2.5 text-left font-bold">Reference</th>
                <th className="px-4 py-2.5 text-left font-bold">Tiers</th>
                <th className="px-4 py-2.5 text-left font-bold">Libelle</th>
                <th className="px-4 py-2.5 text-right font-bold">Debit</th>
                <th className="px-4 py-2.5 text-right font-bold">Credit</th>
                <th className="px-4 py-2.5 text-left font-bold">Lettrage</th>
              </tr>
            </thead>
            <tbody>
              {lignes.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm font-semibold text-muted-foreground">
                    {selectedCompte
                      ? 'Aucune ligne lettrable sur ce compte.'
                      : 'Selectionnez un compte lettrable.'}
                  </td>
                </tr>
              )}
              {lignes.map((l) => (
                <tr
                  key={l.ligne_id}
                  className={`border-b border-border last:border-0 cursor-pointer hover:bg-muted/20 ${selection.has(l.ligne_id) ? 'bg-primary/5' : ''}`}
                  onClick={() => toggleLine(l.ligne_id)}
                >
                  <td className="w-10 px-4 py-2" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selection.has(l.ligne_id)}
                      onCheckedChange={() => toggleLine(l.ligne_id)}
                      aria-label={`Selectionner ligne ${l.ligne_id}`}
                    />
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-muted-foreground">{fmtDate(l.date)}</td>
                  <td className="px-4 py-2 font-mono text-xs font-bold text-primary">{l.ref}</td>
                  <td className="px-4 py-2 font-medium">{l.tiers ?? '-'}</td>
                  <td className="px-4 py-2 font-medium max-w-[200px] truncate">{l.libelle}</td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {l.debit ? fmtFcfa(l.debit) : '-'}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {l.credit ? fmtFcfa(l.credit) : '-'}
                  </td>
                  <td className="px-4 py-2">
                    {l.lettrage ? (
                      <Badge variant="outline" className="text-green-700 border-green-400 dark:text-green-400">
                        {l.lettrage}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Bouton lettrer flottant si rien de selectionne */}
      {selectionDetails.count === 0 && lignes.length > 0 && (
        <div className="mt-4 flex justify-end">
          <Button size="lg" disabled>
            <Link2 />
            Lettrer (selectionnez des lignes)
          </Button>
        </div>
      )}

      {/* AlertDialog delettrage */}
      <AlertDialog open={delettrantDialogOpen} onOpenChange={setDelettrantDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delettrer les lignes ?</AlertDialogTitle>
            <AlertDialogDescription>
              {selectionDetails.selectedLignes.filter((l) => l.lettrage !== null).length} ligne(s) lettrée(s) seront délettrées.
              Cette action est réversible (vous pourrez relettrer plus tard).
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
