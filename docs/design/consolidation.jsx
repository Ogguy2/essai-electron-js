/* SICONEX — Consolidation société (balance + résultat agrégés sur tous les magasins) */

const CONSO_TABS = [
  { id: 'balance', label: 'Balance consolidée', icon: 'balance' },
  { id: 'resultat', label: 'Compte de résultat consolidé', icon: 'result' },
];

function Consolidation({ data, magasin }) {
  // société courante : par défaut celle du magasin actif
  const [societeId, setSocieteId] = useState(magasin?.societe_id || SX.societes[0].id);
  const [tab, setTab] = useState('balance');
  const [dd, setDd] = useState('2026-01-01');
  const [df, setDf] = useState('2026-12-31');
  const toast = useToast();

  const societe = SX.societeById[societeId];
  const mags = SX.magasinsOfSociete(societeId);
  const magIds = mags.map(m => m.id);

  // contourne le scope magasin : toutes les écritures des magasins de la société,
  // bornées par date_ecriture sur la plage demandée
  const scoped = data.filter(e => magIds.includes(e.magasin) && e.date >= dd && e.date <= df);

  const legal = {
    raison_sociale: societe.raison_sociale, rccm: societe.rccm,
    adresse: societe.adresse, telephone: societe.telephone,
  };
  const periode = `du ${SX.fmtDate(dd)} au ${SX.fmtDate(df)}`;
  const sousTitre = `${mags.length} magasin${mags.length > 1 ? 's' : ''} consolidé${mags.length > 1 ? 's' : ''} · ${periode}`;

  function exportPdf() {
    document.body.classList.add('printing');
    setTimeout(() => { window.print(); document.body.classList.remove('printing'); }, 60);
  }

  return (
    <div className="page page-wide">
      <PageHead title="Consolidation société" desc="États agrégés au niveau de la société légale, en sommant les écritures de tous ses magasins sur une plage de dates.">
        <button className="btn btn-primary" onClick={exportPdf} disabled={!mags.length}><Icon name="download" /> Exporter en PDF</button>
      </PageHead>

      {/* bandeau contexte société */}
      <div className="card conso-ctx" style={{ marginBottom: 16 }}>
        <div className="row" style={{ gap: 13 }}>
          <span className="kpi-ic ic-soft-orange" style={{ width: 46, height: 46, borderRadius: 12, flex: 'none' }}><Icon name="layers" size={22} /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="conso-eyebrow">Contexte société · en-tête X-Societe-Id</div>
            <div className="conso-rs">{societe.raison_sociale}</div>
            <div className="muted" style={{ fontSize: 12, fontWeight: 600 }}>{societe.rccm || '—'}</div>
          </div>
          <div className="conso-mags">
            {mags.length ? mags.map(m => <span className="conso-chip" key={m.id}><Icon name="store" size={13} />{m.libelle.replace('Siconex - ', '')}</span>)
              : <span className="muted" style={{ fontSize: 12.5, fontWeight: 700 }}>Aucun magasin rattaché</span>}
          </div>
        </div>
      </div>

      {/* contrôles */}
      <div className="card card-pad et-controls" style={{ marginBottom: 16, padding: 14 }}>
        <div className="row" style={{ gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="field" style={{ width: 280 }}><label className="label">Société</label>
            <select className="select" value={societeId} onChange={e => setSocieteId(+e.target.value)}>
              {SX.societes.map(s => <option key={s.id} value={s.id}>{s.raison_sociale}</option>)}
            </select></div>
          <div className="field" style={{ width: 170 }}><label className="label">Date de début</label>
            <input className="input" type="date" value={dd} onChange={e => setDd(e.target.value)} /></div>
          <div className="field" style={{ width: 170 }}><label className="label">Date de fin</label>
            <input className="input" type="date" value={df} onChange={e => setDf(e.target.value)} /></div>
        </div>
      </div>

      <div className="et-tabs tabs" style={{ marginBottom: 16 }}>
        {CONSO_TABS.map(t => (
          <button key={t.id} className={`tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}><Icon name={t.icon} size={15} style={{ marginRight: 6, verticalAlign: '-2px' }} />{t.label}</button>
        ))}
      </div>

      {!mags.length ? (
        <Empty icon="layers" title="Aucun magasin à consolider">Cette société ne possède pas encore de magasin rattaché. Rattachez-en un depuis l'écran Magasins.</Empty>
      ) : (
        <div className="report-frame">
          {tab === 'balance' && <BalanceReport entries={scoped} legal={legal} titre="Balance générale (consolidé)" sousTitre={sousTitre} />}
          {tab === 'resultat' && <ResultatReport entries={scoped} legal={legal} titre="Compte de résultat (consolidé)" sousTitre={sousTitre} />}
        </div>
      )}
    </div>
  );
}
window.Consolidation = Consolidation;

(function () {
  const css = `
    .conso-ctx { padding: 16px 18px; }
    .conso-eyebrow { font-size: 10.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; color: var(--muted-foreground); }
    .conso-rs { font-family: var(--font-display); font-weight: 600; font-size: 18px; margin-top: 1px; }
    .conso-mags { display: flex; gap: 7px; flex-wrap: wrap; justify-content: flex-end; max-width: 50%; }
    .conso-chip { display: inline-flex; align-items: center; gap: 5px; background: var(--secondary); border: 1px solid var(--border); border-radius: 999px; padding: 5px 11px; font-size: 12px; font-weight: 700; }
    .menu-soc-label { display: flex; align-items: center; gap: 5px; padding: 9px 11px 4px; font-size: 10.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; color: var(--muted-foreground); }
    .menu-soc-label:not(:first-of-type) { margin-top: 2px; border-top: 1px solid var(--border); }
  `;
  const s = document.createElement('style'); s.textContent = css; document.head.appendChild(s);
})();
