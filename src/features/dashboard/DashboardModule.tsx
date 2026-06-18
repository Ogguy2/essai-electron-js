import React, { useEffect, useState } from 'react';
import { LayoutDashboard, TrendingUp, TrendingDown, Landmark, ShoppingCart, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import type { Magasin, Resultat, LigneBalance, EcritureListItem } from '@/shared/ipc';

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

function soldeParNumero(balance: LigneBalance[], prefix: string): number {
  return balance
    .filter((l) => l.numero.startsWith(prefix))
    .reduce((acc, l) => acc + l.solde_debiteur - l.solde_crediteur, 0);
}

// ---------------------------------------------------------------------------
// Composant KPI
// ---------------------------------------------------------------------------

interface KpiProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  colorClass?: string;
  subtitle?: string;
}

function Kpi({ label, value, icon, colorClass = 'text-primary', subtitle }: KpiProps): React.JSX.Element {
  return (
    <div className="rounded-lg border border-border bg-card p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{label}</span>
        <span className={`${colorClass}`}>{icon}</span>
      </div>
      <div className={`text-xl font-extrabold tabular-nums ${colorClass}`}>
        {fmtFcfa(value)}
      </div>
      {subtitle && (
        <div className="text-xs font-semibold text-muted-foreground">{subtitle}</div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// DashboardModule
// ---------------------------------------------------------------------------

interface Props {
  magasin: Magasin | null;
}

export function DashboardModule({ magasin }: Props): React.JSX.Element {
  const [resultat, setResultat] = useState<Resultat | null>(null);
  const [balance, setBalance] = useState<LigneBalance[]>([]);
  const [ecritures, setEcritures] = useState<EcritureListItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!magasin) {
      setResultat(null);
      setBalance([]);
      setEcritures([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void Promise.all([
      window.api.reporting.resultat(magasin.id),
      window.api.reporting.balance(magasin.id),
      window.api.ecritures.list(magasin.id),
    ]).then(([rRes, bRes, eRes]) => {
      if (cancelled) return;
      if (rRes.success) setResultat(rRes.data); else toast.error(rRes.error.message);
      if (bRes.success) setBalance(bRes.data); else toast.error(bRes.error.message);
      if (eRes.success) setEcritures(eRes.data); else toast.error(eRes.error.message);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [magasin]);

  if (!magasin) {
    return (
      <div className="grid h-full place-items-center p-10 text-center">
        <p className="text-sm font-semibold text-muted-foreground">
          Selectionnez un magasin pour afficher le tableau de bord.
        </p>
      </div>
    );
  }

  // Derives depuis balance
  const tresorerieBanque = Math.max(0, soldeParNumero(balance, '521'));
  const tresorerieCaisse = Math.max(0, soldeParNumero(balance, '571'));
  const tresorerie = tresorerieBanque + tresorerieCaisse;
  const creancesClients = Math.max(0, soldeParNumero(balance, '4111'));
  const dettesFournisseurs = Math.max(0, -soldeParNumero(balance, '4011'));

  // Ecritures validees, triees par date desc, 6 dernieres
  const validees = [...ecritures]
    .filter((e) => e.statut === 'validee')
    .sort((a, b) => b.date_ecriture.localeCompare(a.date_ecriture))
    .slice(0, 6);

  // Brouillons
  const brouillons = ecritures.filter((e) => e.statut === 'brouillon');

  const benefice = resultat ? resultat.resultat >= 0 : true;
  const tresoMax = Math.max(tresorerieBanque + tresorerieCaisse, 1);

  return (
    <div className="p-6 pb-16">
      {/* En-tete */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight leading-tight flex items-center gap-2">
            <LayoutDashboard size={24} className="text-primary" />
            Tableau de bord
          </h1>
          <p className="mt-1 text-sm font-semibold text-muted-foreground">
            Vue synthetique de l'activite — {magasin.libelle}
          </p>
        </div>
        {brouillons.length > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-amber-400 bg-amber-50 dark:bg-amber-950/30 px-4 py-2 text-sm font-bold text-amber-700 dark:text-amber-400">
            <AlertTriangle size={16} />
            <span>{brouillons.length} ecriture{brouillons.length > 1 ? 's' : ''} en brouillon</span>
            <Badge variant="secondary" className="ml-1 bg-amber-200 dark:bg-amber-900 text-amber-800 dark:text-amber-300">
              {brouillons.length}
            </Badge>
          </div>
        )}
      </div>

      {loading && <p className="text-sm text-muted-foreground mb-4">Chargement...</p>}

      {/* 4 KPIs */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi
          label="Chiffre d'affaires"
          value={resultat?.produits ?? 0}
          icon={<TrendingUp size={18} />}
          colorClass="text-green-600 dark:text-green-400"
          subtitle="Produits classe 7"
        />
        <Kpi
          label="Achats & charges"
          value={resultat?.charges ?? 0}
          icon={<ShoppingCart size={18} />}
          colorClass="text-destructive"
          subtitle="Charges classe 6"
        />
        <Kpi
          label="Tresorerie"
          value={tresorerie}
          icon={<Landmark size={18} />}
          colorClass="text-primary"
          subtitle="Banque 521 + Caisse 571"
        />
        <Kpi
          label="Resultat net"
          value={resultat?.resultat ?? 0}
          icon={benefice ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
          colorClass={benefice ? 'text-green-600 dark:text-green-400' : 'text-destructive'}
          subtitle={benefice ? 'Benefice' : 'Perte'}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Colonne gauche + centre : dernieres ecritures + position tresorerie */}
        <div className="flex flex-col gap-4 lg:col-span-2">
          {/* Dernieres ecritures validees */}
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="border-b border-border bg-muted/30 px-4 py-2.5">
              <h2 className="text-sm font-extrabold uppercase tracking-widest text-muted-foreground">
                Dernieres ecritures validees
              </h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/20">
                  <th className="px-4 py-2 text-left font-bold">Reference</th>
                  <th className="px-4 py-2 text-left font-bold">Date</th>
                  <th className="px-4 py-2 text-left font-bold">Libelle</th>
                  <th className="px-4 py-2 text-left font-bold">Jnl</th>
                  <th className="px-4 py-2 text-right font-bold">Montant</th>
                </tr>
              </thead>
              <tbody>
                {validees.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm font-semibold text-muted-foreground">
                      Aucune ecriture validee.
                    </td>
                  </tr>
                )}
                {validees.map((e) => (
                  <tr key={e.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-2 font-mono text-xs font-bold text-primary">{e.ref}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-muted-foreground">{fmtDate(e.date_ecriture)}</td>
                    <td className="px-4 py-2 font-medium max-w-[200px] truncate">{e.libelle}</td>
                    <td className="px-4 py-2">
                      <Badge variant="secondary">{e.journal}</Badge>
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums font-medium">{fmtFcfa(e.total_debit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Position de tresorerie */}
          <div className="rounded-lg border border-border bg-card p-4">
            <h2 className="mb-3 text-sm font-extrabold uppercase tracking-widest text-muted-foreground">
              Position de tresorerie
            </h2>
            <div className="flex flex-col gap-3">
              {/* Banque 521 */}
              <div>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-bold">Banque (521)</span>
                  <span className="font-mono font-bold tabular-nums">{fmtFcfa(tresorerieBanque)}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${tresoMax > 0 ? (tresorerieBanque / tresoMax) * 100 : 0}%` }}
                  />
                </div>
              </div>
              {/* Caisse 571 */}
              <div>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-bold">Caisse (571)</span>
                  <span className="font-mono font-bold tabular-nums">{fmtFcfa(tresorerieCaisse)}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-blue-400 transition-all"
                    style={{ width: `${tresoMax > 0 ? (tresorerieCaisse / tresoMax) * 100 : 0}%` }}
                  />
                </div>
              </div>
              {/* Total */}
              <div className="mt-1 border-t border-border pt-2 flex items-center justify-between text-sm">
                <span className="font-extrabold">Total tresorerie</span>
                <span className="font-mono font-extrabold tabular-nums text-primary">{fmtFcfa(tresorerie)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Colonne droite : creances / dettes */}
        <div className="flex flex-col gap-4">
          <div className="rounded-lg border border-border bg-card p-4">
            <h2 className="mb-3 text-sm font-extrabold uppercase tracking-widest text-muted-foreground">
              Creances clients
            </h2>
            <div className="text-2xl font-extrabold tabular-nums text-green-600 dark:text-green-400">
              {fmtFcfa(creancesClients)}
            </div>
            <p className="mt-1 text-xs font-semibold text-muted-foreground">Compte 4111</p>
          </div>

          <div className="rounded-lg border border-border bg-card p-4">
            <h2 className="mb-3 text-sm font-extrabold uppercase tracking-widest text-muted-foreground">
              Dettes fournisseurs
            </h2>
            <div className="text-2xl font-extrabold tabular-nums text-destructive">
              {fmtFcfa(dettesFournisseurs)}
            </div>
            <p className="mt-1 text-xs font-semibold text-muted-foreground">Compte 4011</p>
          </div>

          {/* Recap resultat */}
          {resultat && (
            <div
              className={`rounded-lg p-4 text-white ${benefice ? 'bg-green-600' : 'bg-destructive'}`}
            >
              <h2 className="mb-2 text-xs font-extrabold uppercase tracking-widest opacity-80">
                Resultat net
              </h2>
              <div className="flex items-center gap-2">
                {benefice ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                <span className="text-lg font-extrabold tabular-nums">{fmtFcfa(resultat.resultat)}</span>
              </div>
              <p className="mt-1 text-xs font-bold opacity-80">{benefice ? 'BENEFICE' : 'PERTE'}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
