import React, { useEffect, useState } from 'react';
import { LayoutDashboard, TrendingUp, TrendingDown, Landmark, ShoppingCart, AlertTriangle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import type { Magasin, Resultat, LigneBalance, EcritureListItem, LigneEcheance, CaMensuel } from '@/shared/ipc';

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

const MOIS_COURTS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

const ANTERIORITE_LABELS: Record<string, string> = {
  non_echu: 'Non échu',
  '0_30': '0–30 j',
  '31_60': '31–60 j',
  '61_90': '61–90 j',
  plus_90: '+90 j',
};

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
// Graphique CA mensuel
// ---------------------------------------------------------------------------

interface CaChartProps {
  data: CaMensuel[];
}

function CaChart({ data }: CaChartProps): React.JSX.Element {
  const max = Math.max(...data.map((d) => d.montant), 1);
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="border-b border-border bg-muted/30 px-4 py-2.5 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-extrabold uppercase tracking-widest text-muted-foreground">
            Chiffre d'affaires mensuel
          </h2>
          <p className="text-xs font-semibold text-muted-foreground mt-0.5">Produits validés — classe 7</p>
        </div>
        <Badge variant="outline" className="text-primary border-primary/40">FCFA</Badge>
      </div>
      <div className="p-4">
        <div className="flex items-end gap-2 h-44">
          {data.map((d) => {
            const hauteur = Math.max((d.montant / max) * 100, d.montant > 0 ? 3 : 0);
            const moisIdx = parseInt(d.mois.slice(5, 7), 10) - 1;
            const label = MOIS_COURTS[moisIdx] ?? d.mois.slice(5, 7);
            const kVal = d.montant >= 1000 ? Math.round(d.montant / 1000) + 'k' : '';
            return (
              <div key={d.mois} className="flex-1 flex flex-col items-center gap-1 h-full">
                <div className="flex-1 w-full flex flex-col justify-end items-center relative">
                  {d.montant > 0 && (
                    <span className="text-[10px] font-bold text-muted-foreground mb-1 font-mono whitespace-nowrap">
                      {kVal}
                    </span>
                  )}
                  <div
                    className="w-full max-w-[40px] rounded-t-sm transition-all"
                    style={{
                      height: `${hauteur}%`,
                      background: 'linear-gradient(180deg, var(--primary), oklch(0.72 0.085 248))',
                      minHeight: d.montant > 0 ? '3px' : '0',
                    }}
                  />
                </div>
                <span className="text-[11px] font-bold text-muted-foreground">{label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Echéances à venir
// ---------------------------------------------------------------------------

interface EcheancesProps {
  echeances: LigneEcheance[];
}

function EcheancesSection({ echeances }: EcheancesProps): React.JSX.Element {
  // Trie : en retard d'abord (plus_90, 61_90, 31_60, 0_30), puis non_echu
  const ordre: Record<string, number> = { plus_90: 0, '61_90': 1, '31_60': 2, '0_30': 3, non_echu: 4 };
  const sorted = [...echeances].sort((a, b) => (ordre[a.anteriorite] ?? 5) - (ordre[b.anteriorite] ?? 5));
  const enRetard = echeances.filter((e) => e.anteriorite !== 'non_echu').reduce((s, e) => s + e.montant, 0);
  const top5 = sorted.slice(0, 5);

  function anterioriteVariant(a: LigneEcheance['anteriorite']): 'secondary' | 'outline' | 'destructive' {
    if (a === 'non_echu') return 'secondary';
    if (a === 'plus_90') return 'destructive';
    return 'outline';
  }

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="border-b border-border bg-muted/30 px-4 py-2.5 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-extrabold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
            <Clock size={13} />
            Echéances
          </h2>
          <p className="text-xs font-semibold text-muted-foreground mt-0.5">
            {echeances.length} ligne{echeances.length !== 1 ? 's' : ''} non lettrée{echeances.length !== 1 ? 's' : ''}
          </p>
        </div>
        {enRetard > 0 && (
          <Badge variant="destructive" className="text-xs">
            {fmtFcfa(enRetard)} en retard
          </Badge>
        )}
      </div>
      {top5.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm font-semibold text-muted-foreground">Aucune échéance.</p>
      ) : (
        <div>
          {top5.map((e) => {
            const retard = e.anteriorite !== 'non_echu';
            return (
              <div key={e.ligne_id} className="flex items-center gap-3 px-4 py-2.5 border-b border-border last:border-0 hover:bg-muted/20">
                <div
                  className="w-8 h-8 rounded-full flex-none flex items-center justify-center text-white text-xs font-extrabold"
                  style={{ background: retard ? 'var(--destructive)' : 'var(--primary)' }}
                >
                  {e.tiers ? e.tiers.slice(0, 1).toUpperCase() : '?'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold truncate">{e.tiers ?? '—'}</div>
                  <div className="text-xs font-semibold text-muted-foreground">
                    {e.ref} · échéance {fmtDate(e.echeance)}
                  </div>
                </div>
                <div className="text-right flex-none">
                  <div className="text-sm font-bold tabular-nums">{fmtFcfa(e.montant)}</div>
                  <Badge variant={anterioriteVariant(e.anteriorite)} className="text-[10px] mt-0.5">
                    {ANTERIORITE_LABELS[e.anteriorite] ?? e.anteriorite}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
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
  const [echeances, setEcheances] = useState<LigneEcheance[]>([]);
  const [caMensuel, setCaMensuel] = useState<CaMensuel[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!magasin) {
      setResultat(null);
      setBalance([]);
      setEcritures([]);
      setEcheances([]);
      setCaMensuel([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void Promise.all([
      window.api.reporting.resultat(magasin.id),
      window.api.reporting.balance(magasin.id),
      window.api.ecritures.list(magasin.id),
      window.api.reporting.echeancier(magasin.id),
      window.api.reporting.caMensuel(magasin.id),
    ]).then(([rRes, bRes, eRes, echRes, caRes]) => {
      if (cancelled) return;
      if (rRes.success) setResultat(rRes.data); else toast.error(rRes.error.message);
      if (bRes.success) setBalance(bRes.data); else toast.error(bRes.error.message);
      if (eRes.success) setEcritures(eRes.data); else toast.error(eRes.error.message);
      if (echRes.success) setEcheances(echRes.data); else toast.error(echRes.error.message);
      if (caRes.success) setCaMensuel(caRes.data); else toast.error(caRes.error.message);
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
        {/* Colonne gauche + centre : graphique CA + dernieres ecritures + position tresorerie */}
        <div className="flex flex-col gap-4 lg:col-span-2">
          {/* Graphique CA mensuel */}
          <CaChart data={caMensuel} />

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

        {/* Colonne droite : creances / dettes + echeances + resultat */}
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

          {/* Echéances à venir */}
          <EcheancesSection echeances={echeances} />

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
