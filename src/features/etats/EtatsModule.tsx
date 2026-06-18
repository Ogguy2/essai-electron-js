import React, { useEffect, useState } from 'react';
import { BarChart3, Printer, TrendingUp, TrendingDown } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import type {
  Magasin, Compte, LigneBalance, MouvementGL, Resultat, LigneEcheance, Tiers,
} from '@/shared/ipc';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtFcfa(n: number): string {
  const raw = n.toLocaleString('fr-FR');
  // Supprime les espaces insécables (U+202F, U+00A0) introduits par fr-FR
  return raw.split('').filter((c) => c.charCodeAt(0) !== 0x202f && c.charCodeAt(0) !== 0xa0).join('') + ' FCFA';
}

function fmtDate(s: string): string {
  if (!s) return '—';
  const [y, m, d] = s.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

const CLASSES: Record<number, string> = {
  1: 'Ressources durables',
  2: 'Actif immobilisé',
  3: 'Stocks',
  4: 'Tiers',
  5: 'Trésorerie',
  6: 'Charges',
  7: 'Produits',
  8: 'HAO',
  9: 'Analytique',
};

const ANTERIORITE_LABELS: Record<string, string> = {
  non_echu: 'Non échu',
  '0_30': '0–30 j',
  '31_60': '31–60 j',
  '61_90': '61–90 j',
  plus_90: '+90 j',
};

const ANTERIORITE_ORDER: LigneEcheance['anteriorite'][] = [
  'non_echu', '0_30', '31_60', '61_90', 'plus_90',
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface BalanceTableProps {
  rows: LigneBalance[];
}

export function BalanceTable({ rows }: BalanceTableProps): React.JSX.Element {
  // Group by classe
  const byClasse = new Map<number, LigneBalance[]>();
  for (const r of rows) {
    const bucket = byClasse.get(r.classe);
    if (bucket) bucket.push(r);
    else byClasse.set(r.classe, [r]);
  }
  const sorted = [...byClasse.entries()].sort((a, b) => a[0] - b[0]);

  const total = rows.reduce(
    (a, r) => ({
      debit: a.debit + r.debit,
      credit: a.credit + r.credit,
      solde_debiteur: a.solde_debiteur + r.solde_debiteur,
      solde_crediteur: a.solde_crediteur + r.solde_crediteur,
    }),
    { debit: 0, credit: 0, solde_debiteur: 0, solde_crediteur: 0 },
  );

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="px-4 py-2.5 text-left font-bold">N° compte</th>
            <th className="px-4 py-2.5 text-left font-bold">Intitulé</th>
            <th className="px-4 py-2.5 text-right font-bold">Mvt débit</th>
            <th className="px-4 py-2.5 text-right font-bold">Mvt crédit</th>
            <th className="px-4 py-2.5 text-right font-bold">Solde débiteur</th>
            <th className="px-4 py-2.5 text-right font-bold">Solde créditeur</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(([classe, lignes]) => {
            const st = lignes.reduce(
              (a, r) => ({
                debit: a.debit + r.debit,
                credit: a.credit + r.credit,
                solde_debiteur: a.solde_debiteur + r.solde_debiteur,
                solde_crediteur: a.solde_crediteur + r.solde_crediteur,
              }),
              { debit: 0, credit: 0, solde_debiteur: 0, solde_crediteur: 0 },
            );
            return (
              <React.Fragment key={classe}>
                {/* Ligne d'en-tête de classe */}
                <tr className="bg-muted/30 border-b border-border">
                  <td colSpan={6} className="px-4 py-1.5 text-xs font-extrabold uppercase tracking-widest text-muted-foreground">
                    Classe {classe} — {CLASSES[classe] ?? ''}
                  </td>
                </tr>
                {lignes.map((r) => (
                  <tr key={r.numero} className="border-b border-border last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-2 font-mono font-bold text-primary">{r.numero}</td>
                    <td className="px-4 py-2 font-semibold">{r.libelle}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{fmtFcfa(r.debit)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{fmtFcfa(r.credit)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {r.solde_debiteur ? fmtFcfa(r.solde_debiteur) : '—'}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {r.solde_crediteur ? fmtFcfa(r.solde_crediteur) : '—'}
                    </td>
                  </tr>
                ))}
                {/* Sous-total classe */}
                <tr className="border-b border-border bg-muted/40 font-bold">
                  <td className="px-4 py-2" />
                  <td className="px-4 py-2 text-xs font-extrabold uppercase tracking-wide text-muted-foreground">
                    Sous-total classe {classe}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">{fmtFcfa(st.debit)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{fmtFcfa(st.credit)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{fmtFcfa(st.solde_debiteur)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{fmtFcfa(st.solde_crediteur)}</td>
                </tr>
              </React.Fragment>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="bg-primary/5 font-extrabold border-t-2 border-primary/30">
            <td className="px-4 py-3" />
            <td className="px-4 py-3 text-sm uppercase tracking-wide">Total général</td>
            <td className="px-4 py-3 text-right tabular-nums">{fmtFcfa(total.debit)}</td>
            <td className="px-4 py-3 text-right tabular-nums">{fmtFcfa(total.credit)}</td>
            <td className="px-4 py-3 text-right tabular-nums">{fmtFcfa(total.solde_debiteur)}</td>
            <td className="px-4 py-3 text-right tabular-nums">{fmtFcfa(total.solde_crediteur)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

interface ResultatViewProps {
  res: Resultat;
}

export function ResultatView({ res }: ResultatViewProps): React.JSX.Element {
  const benefice = res.resultat >= 0;
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4">
        {/* Charges */}
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="bg-destructive/10 text-destructive px-4 py-2.5 text-sm font-extrabold">
            Charges (classe 6)
          </div>
          <table className="w-full text-sm">
            <tbody>
              {res.charges_detail.map((c) => (
                <tr key={c.numero} className="border-b border-border last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-2 font-mono font-bold text-primary">{c.numero}</td>
                  <td className="px-4 py-2 font-semibold">{c.libelle}</td>
                  <td className="px-4 py-2 text-right tabular-nums font-medium">
                    {fmtFcfa(c.debit - c.credit)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-muted/40 font-bold border-t border-border">
                <td colSpan={2} className="px-4 py-2.5 text-xs font-extrabold uppercase tracking-wide">
                  Total charges
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">{fmtFcfa(res.charges)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Produits */}
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="bg-green-500/10 text-green-700 dark:text-green-400 px-4 py-2.5 text-sm font-extrabold">
            Produits (classe 7)
          </div>
          <table className="w-full text-sm">
            <tbody>
              {res.produits_detail.map((c) => (
                <tr key={c.numero} className="border-b border-border last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-2 font-mono font-bold text-primary">{c.numero}</td>
                  <td className="px-4 py-2 font-semibold">{c.libelle}</td>
                  <td className="px-4 py-2 text-right tabular-nums font-medium">
                    {fmtFcfa(c.credit - c.debit)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-muted/40 font-bold border-t border-border">
                <td colSpan={2} className="px-4 py-2.5 text-xs font-extrabold uppercase tracking-wide">
                  Total produits
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">{fmtFcfa(res.produits)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Résultat net */}
      <div
        className={`flex items-center justify-between rounded-xl px-6 py-4 text-white ${benefice ? 'bg-green-600' : 'bg-destructive'}`}
      >
        <div className="flex items-center gap-3">
          {benefice ? <TrendingUp size={22} /> : <TrendingDown size={22} />}
          <span className="text-base font-extrabold">Résultat net de l'exercice</span>
        </div>
        <div className="font-mono text-lg font-bold">
          {fmtFcfa(res.resultat)}{' '}
          <span className="ml-2 font-extrabold tracking-wide">
            {benefice ? 'BÉNÉFICE' : 'PERTE'}
          </span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tableau Grand livre partagé (compte ou tiers)
// ---------------------------------------------------------------------------

interface GrandLivreTableProps {
  rows: MouvementGL[];
  loading: boolean;
}

function GrandLivreTable({ rows, loading }: GrandLivreTableProps): React.JSX.Element {
  const totDebit = rows.reduce((a, r) => a + r.debit, 0);
  const totCredit = rows.reduce((a, r) => a + r.credit, 0);
  const dernierSolde = rows.length > 0 ? rows[rows.length - 1].solde_progressif : 0;

  if (loading) return <p className="text-sm text-muted-foreground">Chargement…</p>;

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="px-4 py-2.5 text-left font-bold">Date</th>
            <th className="px-4 py-2.5 text-left font-bold">Jnl</th>
            <th className="px-4 py-2.5 text-left font-bold">Réf</th>
            <th className="px-4 py-2.5 text-left font-bold">Libellé</th>
            <th className="px-4 py-2.5 text-right font-bold">Débit</th>
            <th className="px-4 py-2.5 text-right font-bold">Crédit</th>
            <th className="px-4 py-2.5 text-right font-bold">Solde progressif</th>
            <th className="px-4 py-2.5 text-left font-bold">Let.</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={8} className="px-4 py-8 text-center text-sm font-semibold text-muted-foreground">
                Aucun mouvement.
              </td>
            </tr>
          )}
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/20">
              <td className="px-4 py-2 text-muted-foreground whitespace-nowrap">{fmtDate(r.date)}</td>
              <td className="px-4 py-2">
                <Badge variant="secondary">{r.journal}</Badge>
              </td>
              <td className="px-4 py-2 font-mono text-xs font-bold">{r.ref}</td>
              <td className="px-4 py-2 font-medium">{r.ligne_libelle}</td>
              <td className="px-4 py-2 text-right tabular-nums">
                {r.debit ? fmtFcfa(r.debit) : '—'}
              </td>
              <td className="px-4 py-2 text-right tabular-nums">
                {r.credit ? fmtFcfa(r.credit) : '—'}
              </td>
              <td className={`px-4 py-2 text-right tabular-nums font-medium ${r.solde_progressif < 0 ? 'text-destructive' : ''}`}>
                {fmtFcfa(r.solde_progressif)}
              </td>
              <td className="px-4 py-2">
                {r.lettrage ? (
                  <Badge variant="outline" className="text-green-700 border-green-400 dark:text-green-400">
                    {r.lettrage}
                  </Badge>
                ) : (
                  '—'
                )}
              </td>
            </tr>
          ))}
        </tbody>
        {rows.length > 0 && (
          <tfoot>
            <tr className="bg-primary/5 font-extrabold border-t-2 border-primary/30">
              <td colSpan={4} className="px-4 py-3 text-xs uppercase tracking-wide">
                Totaux · solde {dernierSolde < 0 ? 'créditeur' : 'débiteur'}
              </td>
              <td className="px-4 py-3 text-right tabular-nums">{fmtFcfa(totDebit)}</td>
              <td className="px-4 py-3 text-right tabular-nums">{fmtFcfa(totCredit)}</td>
              <td className="px-4 py-3 text-right tabular-nums">{fmtFcfa(Math.abs(dernierSolde))}</td>
              <td />
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Balance
// ---------------------------------------------------------------------------

function TabBalance({ magasin }: { magasin: Magasin }): React.JSX.Element {
  const [rows, setRows] = useState<LigneBalance[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void window.api.reporting.balance(magasin.id).then((res) => {
      if (cancelled) return;
      if (res.success) setRows(res.data);
      else toast.error(res.error.message);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [magasin]);

  if (loading) return <p className="text-sm text-muted-foreground">Chargement…</p>;
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">Aucun mouvement.</p>;
  return <BalanceTable rows={rows} />;
}

// ---------------------------------------------------------------------------
// Tab: Grand livre
// ---------------------------------------------------------------------------

function TabGrandLivre({ magasin }: { magasin: Magasin }): React.JSX.Element {
  const [comptes, setComptes] = useState<Compte[]>([]);
  const [compte, setCompte] = useState<string>('');
  const [rows, setRows] = useState<MouvementGL[]>([]);
  const [loading, setLoading] = useState(false);

  // Charge la liste des comptes
  useEffect(() => {
    let cancelled = false;
    void window.api.comptes.list(magasin.id).then((res) => {
      if (cancelled) return;
      if (res.success) {
        setComptes(res.data);
        setCompte(res.data[0]?.numero ?? '');
      } else {
        toast.error(res.error.message);
      }
    });
    return () => { cancelled = true; };
  }, [magasin]);

  // Charge les mouvements quand le compte change
  useEffect(() => {
    if (!compte) return;
    let cancelled = false;
    setLoading(true);
    void window.api.reporting.grandLivre(magasin.id, { compte }).then((res) => {
      if (cancelled) return;
      if (res.success) setRows(res.data);
      else toast.error(res.error.message);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [magasin, compte]);

  return (
    <div className="flex flex-col gap-4">
      <div className="w-80">
        <Select value={compte} onValueChange={setCompte}>
          <SelectTrigger>
            <SelectValue placeholder="Sélectionner un compte" />
          </SelectTrigger>
          <SelectContent>
            {comptes.map((c) => (
              <SelectItem key={c.numero} value={c.numero}>
                {c.numero} — {c.libelle}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <GrandLivreTable rows={rows} loading={loading} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Grand livre auxiliaire
// ---------------------------------------------------------------------------

function TabGrandLivreAux({ magasin }: { magasin: Magasin }): React.JSX.Element {
  const [tiersList, setTiersList] = useState<Tiers[]>([]);
  const [tiers, setTiers] = useState<string>('');
  const [rows, setRows] = useState<MouvementGL[]>([]);
  const [loading, setLoading] = useState(false);

  // Charge la liste des tiers
  useEffect(() => {
    let cancelled = false;
    void window.api.tiers.list(magasin.id).then((res) => {
      if (cancelled) return;
      if (res.success) {
        const actifs = res.data.filter((t) => !t.archived);
        setTiersList(actifs);
        setTiers(actifs[0]?.code ?? '');
      } else {
        toast.error(res.error.message);
      }
    });
    return () => { cancelled = true; };
  }, [magasin]);

  // Charge les mouvements quand le tiers change
  useEffect(() => {
    if (!tiers) return;
    let cancelled = false;
    setLoading(true);
    void window.api.reporting.grandLivre(magasin.id, { tiers }).then((res) => {
      if (cancelled) return;
      if (res.success) setRows(res.data);
      else toast.error(res.error.message);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [magasin, tiers]);

  return (
    <div className="flex flex-col gap-4">
      <div className="w-80">
        <Select value={tiers} onValueChange={setTiers}>
          <SelectTrigger>
            <SelectValue placeholder="Sélectionner un tiers" />
          </SelectTrigger>
          <SelectContent>
            {tiersList.map((t) => (
              <SelectItem key={t.code} value={t.code}>
                {t.code} — {t.raison_sociale}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {tiersList.length === 0 && !loading && (
        <p className="text-sm text-muted-foreground">Aucun tiers enregistré.</p>
      )}
      {tiersList.length > 0 && <GrandLivreTable rows={rows} loading={loading} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Résultat
// ---------------------------------------------------------------------------

function TabResultat({ magasin }: { magasin: Magasin }): React.JSX.Element {
  const [res, setRes] = useState<Resultat | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void window.api.reporting.resultat(magasin.id).then((r) => {
      if (cancelled) return;
      if (r.success) setRes(r.data);
      else toast.error(r.error.message);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [magasin]);

  if (loading) return <p className="text-sm text-muted-foreground">Chargement…</p>;
  if (!res) return <p className="text-sm text-muted-foreground">Aucune donnée.</p>;
  return <ResultatView res={res} />;
}

// ---------------------------------------------------------------------------
// Tab: Échéancier
// ---------------------------------------------------------------------------

function TabEcheancier({ magasin }: { magasin: Magasin }): React.JSX.Element {
  const [rows, setRows] = useState<LigneEcheance[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void window.api.reporting.echeancier(magasin.id).then((res) => {
      if (cancelled) return;
      if (res.success) setRows(res.data);
      else toast.error(res.error.message);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [magasin]);

  function anterioriteVariant(a: LigneEcheance['anteriorite']): 'secondary' | 'outline' | 'destructive' {
    if (a === 'non_echu') return 'secondary';
    if (a === 'plus_90') return 'destructive';
    return 'outline';
  }

  // Calcul de la ventilation par antériorité
  const ventilation = ANTERIORITE_ORDER.map((bucket) => ({
    bucket,
    label: ANTERIORITE_LABELS[bucket] ?? bucket,
    total: rows.filter((r) => r.anteriorite === bucket).reduce((s, r) => s + r.montant, 0),
  }));
  const totalVentil = ventilation.reduce((s, v) => s + v.total, 0);

  if (loading) return <p className="text-sm text-muted-foreground">Chargement…</p>;

  return (
    <div className="flex flex-col gap-4">
      {/* Ventilation par antériorité */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="border-b border-border bg-muted/30 px-4 py-2.5">
          <h2 className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground">
            Ventilation par antériorité
          </h2>
        </div>
        <div className="grid grid-cols-5 divide-x divide-border">
          {ventilation.map((v) => (
            <div key={v.bucket} className="px-4 py-3">
              <div className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground mb-1">
                {v.label}
              </div>
              <div className={`text-sm font-extrabold tabular-nums ${
                v.bucket === 'plus_90' && v.total > 0 ? 'text-destructive' :
                v.bucket === 'non_echu' ? 'text-primary' :
                v.total > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'
              }`}>
                {fmtFcfa(v.total)}
              </div>
            </div>
          ))}
        </div>
        {totalVentil > 0 && (
          <div className="border-t border-border bg-muted/20 px-4 py-2 flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground">Total dû</span>
            <span className="text-sm font-extrabold tabular-nums text-primary">{fmtFcfa(totalVentil)}</span>
          </div>
        )}
      </div>

      {/* Tableau détaillé */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-2.5 text-left font-bold">Tiers</th>
              <th className="px-4 py-2.5 text-left font-bold">Échéance</th>
              <th className="px-4 py-2.5 text-left font-bold">Réf</th>
              <th className="px-4 py-2.5 text-left font-bold">Libellé</th>
              <th className="px-4 py-2.5 text-right font-bold">Montant</th>
              <th className="px-4 py-2.5 text-left font-bold">Antériorité</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm font-semibold text-muted-foreground">
                  Aucune échéance en attente.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.ligne_id} className="border-b border-border last:border-0 hover:bg-muted/20">
                <td className="px-4 py-2 font-mono text-xs font-bold text-primary">{r.tiers ?? '—'}</td>
                <td className="px-4 py-2 whitespace-nowrap">{fmtDate(r.echeance)}</td>
                <td className="px-4 py-2 font-mono text-xs">{r.ref}</td>
                <td className="px-4 py-2 font-medium">{r.libelle}</td>
                <td className="px-4 py-2 text-right tabular-nums font-medium">{fmtFcfa(r.montant)}</td>
                <td className="px-4 py-2">
                  <Badge variant={anterioriteVariant(r.anteriorite)}>
                    {ANTERIORITE_LABELS[r.anteriorite] ?? r.anteriorite}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// EtatsModule
// ---------------------------------------------------------------------------

type TabId = 'balance' | 'grand-livre' | 'grand-livre-aux' | 'resultat' | 'echeancier';

const TABS: { id: TabId; label: string }[] = [
  { id: 'balance', label: 'Balance' },
  { id: 'grand-livre', label: 'Grand livre' },
  { id: 'grand-livre-aux', label: 'Grand livre auxiliaire' },
  { id: 'resultat', label: 'Compte de résultat' },
  { id: 'echeancier', label: 'Échéancier' },
];

interface Props {
  magasin: Magasin | null;
}

export function EtatsModule({ magasin }: Props): React.JSX.Element {
  const [tab, setTab] = useState<TabId>('balance');

  if (!magasin) {
    return (
      <div className="grid h-full place-items-center p-10 text-center">
        <p className="text-sm font-semibold text-muted-foreground">
          Sélectionnez un magasin pour afficher les états et rapports.
        </p>
      </div>
    );
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div className="p-6 pb-16">
      {/* En-tête de page */}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight leading-tight flex items-center gap-2">
            <BarChart3 size={24} className="text-primary" />
            États &amp; reporting
          </h1>
          <p className="mt-1 text-sm font-semibold text-muted-foreground">
            Agrégats calculés à la demande · {magasin.libelle}
          </p>
        </div>
        <Button size="lg" variant="outline" onClick={handlePrint}>
          <Printer /> Imprimer
        </Button>
      </div>

      {/* Onglets segmentés */}
      <div className="mb-5 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Button
            key={t.id}
            size="lg"
            variant={tab === t.id ? 'default' : 'outline'}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </Button>
        ))}
      </div>

      {/* Contenu de l'onglet */}
      {tab === 'balance' && <TabBalance magasin={magasin} />}
      {tab === 'grand-livre' && <TabGrandLivre magasin={magasin} />}
      {tab === 'grand-livre-aux' && <TabGrandLivreAux magasin={magasin} />}
      {tab === 'resultat' && <TabResultat magasin={magasin} />}
      {tab === 'echeancier' && <TabEcheancier magasin={magasin} />}
    </div>
  );
}
