import React, { useEffect, useState } from 'react';
import { Layers, Store } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { BalanceTable, ResultatView } from '@/features/etats/EtatsModule';
import type { Societe, Magasin, LigneBalance, Resultat } from '@/shared/ipc';

// ---------------------------------------------------------------------------
// Dates par défaut : 1er janv → 31 déc de l'année courante
// ---------------------------------------------------------------------------

function defaultDd(): string {
  return `${new Date().getFullYear()}-01-01`;
}

function defaultDf(): string {
  return `${new Date().getFullYear()}-12-31`;
}

// ---------------------------------------------------------------------------
// Tab: Balance consolidée
// ---------------------------------------------------------------------------

interface TabBalanceConsoProps {
  societeId: number;
  dateDebut: string;
  dateFin: string;
}

function TabBalanceConso({ societeId, dateDebut, dateFin }: TabBalanceConsoProps): React.JSX.Element {
  const [rows, setRows] = useState<LigneBalance[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void window.api.consolidation.balance(societeId, dateDebut, dateFin).then((res) => {
      if (cancelled) return;
      if (res.success) setRows(res.data);
      else toast.error(res.error.message);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [societeId, dateDebut, dateFin]);

  if (loading) return <p className="text-sm text-muted-foreground">Chargement…</p>;
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">Aucun mouvement sur la période.</p>;
  return <BalanceTable rows={rows} />;
}

// ---------------------------------------------------------------------------
// Tab: Résultat consolidé
// ---------------------------------------------------------------------------

interface TabResultatConsoProps {
  societeId: number;
  dateDebut: string;
  dateFin: string;
}

function TabResultatConso({ societeId, dateDebut, dateFin }: TabResultatConsoProps): React.JSX.Element {
  const [res, setRes] = useState<Resultat | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void window.api.consolidation.resultat(societeId, dateDebut, dateFin).then((r) => {
      if (cancelled) return;
      if (r.success) setRes(r.data);
      else toast.error(r.error.message);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [societeId, dateDebut, dateFin]);

  if (loading) return <p className="text-sm text-muted-foreground">Chargement…</p>;
  if (!res) return <p className="text-sm text-muted-foreground">Aucune donnée.</p>;
  return <ResultatView res={res} />;
}

// ---------------------------------------------------------------------------
// ConsolidationModule
// ---------------------------------------------------------------------------

type TabId = 'balance' | 'resultat';

const TABS: { id: TabId; label: string }[] = [
  { id: 'balance', label: 'Balance consolidée' },
  { id: 'resultat', label: 'Compte de résultat consolidé' },
];

export function ConsolidationModule(): React.JSX.Element {
  const [societes, setSocietes] = useState<Societe[]>([]);
  const [magasins, setMagasins] = useState<Magasin[]>([]);
  const [societeId, setSocieteId] = useState<number | null>(null);
  const [dateDebut, setDateDebut] = useState(defaultDd());
  const [dateFin, setDateFin] = useState(defaultDf());
  const [tab, setTab] = useState<TabId>('balance');

  // Chargement initial
  useEffect(() => {
    void Promise.all([
      window.api.societes.list(),
      window.api.magasins.list(),
    ]).then(([sRes, mRes]) => {
      if (sRes.success) {
        setSocietes(sRes.data);
        setSocieteId(sRes.data[0]?.id ?? null);
      } else {
        toast.error(sRes.error.message);
      }
      if (mRes.success) setMagasins(mRes.data);
      else toast.error(mRes.error.message);
    });
  }, []);

  const societe = societes.find((s) => s.id === societeId) ?? null;
  const magasinsDeSociete = societeId !== null
    ? magasins.filter((m) => m.societe_id === societeId)
    : [];

  return (
    <div className="p-6 pb-16">
      {/* En-tête de page */}
      <div className="mb-5">
        <h1 className="text-2xl font-extrabold tracking-tight leading-tight flex items-center gap-2">
          <Layers size={24} className="text-primary" />
          Consolidation société
        </h1>
        <p className="mt-1 text-sm font-semibold text-muted-foreground">
          États agrégés au niveau société, sur une plage de dates, tous magasins confondus.
        </p>
      </div>

      {/* Filtres */}
      <div className="mb-4 flex flex-wrap items-end gap-4 rounded-lg border border-border bg-card p-4">
        <div className="flex flex-col gap-1.5">
          <Label>Société</Label>
          <Select
            value={societeId !== null ? String(societeId) : ''}
            onValueChange={(v) => setSocieteId(Number(v))}
          >
            <SelectTrigger className="w-72">
              <SelectValue placeholder="Sélectionner une société" />
            </SelectTrigger>
            <SelectContent>
              {societes.map((s) => (
                <SelectItem key={s.id} value={String(s.id)}>
                  {s.raison_sociale}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Date de début</Label>
          <Input
            type="date"
            value={dateDebut}
            onChange={(e) => setDateDebut(e.target.value)}
            className="w-44"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Date de fin</Label>
          <Input
            type="date"
            value={dateFin}
            onChange={(e) => setDateFin(e.target.value)}
            className="w-44"
          />
        </div>
      </div>

      {/* Bandeau contexte société */}
      {societe && (
        <div className="mb-5 flex items-center gap-4 rounded-lg border border-border bg-card px-5 py-4">
          <span className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Layers size={22} />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[10.5px] font-extrabold uppercase tracking-widest text-muted-foreground">
              Société consolidée
            </p>
            <p className="text-lg font-bold leading-tight">{societe.raison_sociale}</p>
            <p className="text-xs font-semibold text-muted-foreground">
              {societe.rccm || '—'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 justify-end max-w-sm">
            {magasinsDeSociete.length === 0 ? (
              <span className="text-xs font-bold text-muted-foreground">
                Aucun magasin rattaché
              </span>
            ) : (
              magasinsDeSociete.map((m) => (
                <span
                  key={m.id}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-3 py-1 text-xs font-bold"
                >
                  <Store size={12} />
                  {m.libelle}
                </span>
              ))
            )}
          </div>
        </div>
      )}

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

      {/* Contenu */}
      {societeId === null ? (
        <div className="grid place-items-center py-16 text-center">
          <p className="text-sm font-semibold text-muted-foreground">
            Sélectionnez une société pour afficher la consolidation.
          </p>
        </div>
      ) : magasinsDeSociete.length === 0 ? (
        <div className="grid place-items-center py-16 text-center">
          <p className="text-sm font-semibold text-muted-foreground">
            Aucun magasin rattaché à cette société. Rattachez-en un depuis l'écran Magasins.
          </p>
        </div>
      ) : (
        <>
          {tab === 'balance' && (
            <TabBalanceConso
              societeId={societeId}
              dateDebut={dateDebut}
              dateFin={dateFin}
            />
          )}
          {tab === 'resultat' && (
            <TabResultatConso
              societeId={societeId}
              dateDebut={dateDebut}
              dateFin={dateFin}
            />
          )}
        </>
      )}
    </div>
  );
}
