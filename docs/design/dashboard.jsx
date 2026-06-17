/* SICONEX — Tableau de bord */
function Dashboard({ entries, magasin, exercice, onNav }) {
  const res = CALC.resultat(entries);
  const ca = res.produits;
  const charges = res.charges;
  const treso = CALC.soldeComptes(entries, ['521', '531', '571']);
  const banque = CALC.soldeCompte(entries, '521').solde;
  const caisse = CALC.soldeCompte(entries, '571').solde;
  const creances = CALC.soldeCompte(entries, '4111').solde;
  const dettes = -CALC.soldeCompte(entries, '4011').solde;
  const ech = CALC.echeancier(entries);
  const echClients = ech.filter(e => e.sens === 'client').reduce((s, e) => s + e.montant, 0);
  const enRetard = ech.filter(e => e.bucket !== 'non_echu').reduce((s, e) => s + e.montant, 0);

  // CA mensuel (produits classe 7 credit)
  const months = ['01','02','03','04','05','06'];
  const monthLbl = ['Jan','Fév','Mar','Avr','Mai','Juin'];
  const caMonth = months.map(m => {
    let v = 0;
    entries.filter(e => e.statut === 'validee' && e.date.slice(5,7) === m).forEach(e =>
      e.lines.forEach(l => { const c = SX.compteByNum[l.compte]; if (c && c.classe === 7) v += (+l.credit||0) - (+l.debit||0); }));
    return v;
  });
  const caMax = Math.max(...caMonth, 1);

  const recent = [...entries].filter(e => e.statut === 'validee').sort((a,b) => b.date.localeCompare(a.date)).slice(0, 6);
  const brouillons = entries.filter(e => e.statut === 'brouillon').length;

  return (
    <div className="page page-wide">
      <PageHead title={`Bonjour, ${SX.user.name.split(' ')[0]}`}
        desc={`Synthèse comptable — ${magasin.libelle} · Exercice ${exercice.libelle}`}>
        <button className="btn btn-outline" onClick={() => onNav('etats')}><Icon name="download" /> États PDF</button>
        <button className="btn btn-primary" onClick={() => onNav('ecritures', { create: true })}><Icon name="plus" /> Nouvelle écriture</button>
      </PageHead>

      <div className="grid-kpi" style={{ marginBottom: 16 }}>
        <Kpi label="Chiffre d'affaires" value={SX.fmt(ca)} cur="FCFA" icon="trendUp" tone="green"
          foot={`${exercice.libelle} · produits HT`} footIcon="receipt" />
        <Kpi label="Achats & charges" value={SX.fmt(charges)} cur="FCFA" icon="receipt" tone="orange"
          foot="Classe 6 · cumul" footIcon="trendDown" />
        <Kpi label="Trésorerie" value={SX.fmt(treso)} cur="FCFA" icon="wallet" tone="blue"
          foot="Banque + caisse" footIcon="coins" />
        <Kpi label="Résultat" value={SX.fmt(res.resultat)} cur="FCFA" icon="result"
          tone={res.resultat >= 0 ? 'green' : 'red'}
          foot={res.resultat >= 0 ? 'Bénéfice' : 'Perte'} footIcon={res.resultat >= 0 ? 'arrowUp' : 'arrowDown'}
          footTone={res.resultat >= 0 ? 'success' : 'destructive'} />
      </div>

      <div className="dash-grid">
        {/* Left col */}
        <div className="stack">
          {/* CA chart */}
          <div className="card">
            <div className="card-head">
              <div>
                <div className="card-title">Chiffre d'affaires mensuel</div>
                <div className="card-sub">Produits validés — exercice {exercice.libelle}</div>
              </div>
              <Badge tone="primary">FCFA</Badge>
            </div>
            <div className="card-pad">
              <div className="chart">
                {caMonth.map((v, i) => (
                  <div className="chart-col" key={i}>
                    <div className="chart-bar-wrap">
                      <div className="chart-val">{v ? SX.fmt(v/1000) + 'k' : ''}</div>
                      <div className="chart-bar" style={{ height: `${Math.max((v/caMax)*100, 2)}%` }} />
                    </div>
                    <div className="chart-lbl">{monthLbl[i]}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent entries */}
          <div className="card">
            <div className="card-head">
              <div className="card-title">Dernières écritures validées</div>
              <button className="btn btn-ghost btn-sm" onClick={() => onNav('ecritures')}>Tout voir <Icon name="chevRight" /></button>
            </div>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead><tr>
                  <th>Référence</th><th>Date</th><th>Libellé</th><th>Jnl</th><th className="num">Montant</th>
                </tr></thead>
                <tbody>
                  {recent.map(e => {
                    const t = SX.entryTotals(e);
                    return (
                      <tr key={e.id} className="clickable" onClick={() => onNav('ecritures', { open: e.id })}>
                        <td className="col-code">{e.ref}</td>
                        <td className="muted">{SX.fmt ? SX.fmtDate(e.date) : e.date}</td>
                        <td>{e.libelle}</td>
                        <td><Badge tone="neutral">{e.journal}</Badge></td>
                        <td className="num"><span className="amount">{SX.fmt(t.debit)}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right col */}
        <div className="stack">
          {/* Trésorerie split */}
          <div className="card card-pad">
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: 16 }}>
              <div className="card-title">Position de trésorerie</div>
              <span className="kpi-ic ic-soft-blue"><Icon name="wallet" /></span>
            </div>
            <div className="treso-line">
              <div className="row gap-sm"><span className="dotc" style={{ background: 'var(--info)' }} /> <span>Banque Ecobank</span></div>
              <span className="amount">{SX.fmt(banque)}</span>
            </div>
            <div className="bar" style={{ margin: '8px 0 16px' }}>
              <span style={{ width: `${treso ? (banque/treso)*100 : 0}%`, background: 'var(--info)' }} />
            </div>
            <div className="treso-line">
              <div className="row gap-sm"><span className="dotc" style={{ background: 'var(--success)' }} /> <span>Caisse principale</span></div>
              <span className="amount">{SX.fmt(caisse)}</span>
            </div>
            <div className="bar" style={{ margin: '8px 0 4px' }}>
              <span style={{ width: `${treso ? (caisse/treso)*100 : 0}%`, background: 'var(--success)' }} />
            </div>
            <div className="divider" style={{ margin: '16px 0' }} />
            <div className="treso-line" style={{ fontWeight: 800 }}>
              <span>Disponible total</span>
              <span className="amount" style={{ fontSize: 16 }}>{SX.fmt(treso)} <span className="muted" style={{ fontWeight: 600 }}>FCFA</span></span>
            </div>
          </div>

          {/* Créances / dettes */}
          <div className="grid-2" style={{ gap: 12 }}>
            <button className="mini-card" onClick={() => onNav('etats', { tab: 'echeancier' })}>
              <span className="kpi-ic ic-soft-green" style={{ width: 34, height: 34 }}><Icon name="arrowDown" size={16} /></span>
              <div className="mini-val amount">{SX.fmt(creances)}</div>
              <div className="mini-lbl">Créances clients</div>
            </button>
            <button className="mini-card" onClick={() => onNav('etats', { tab: 'echeancier' })}>
              <span className="kpi-ic ic-soft-orange" style={{ width: 34, height: 34 }}><Icon name="arrowUp" size={16} /></span>
              <div className="mini-val amount">{SX.fmt(dettes)}</div>
              <div className="mini-lbl">Dettes fournisseurs</div>
            </button>
          </div>

          {/* Échéances à venir */}
          <div className="card">
            <div className="card-head">
              <div>
                <div className="card-title">Échéances</div>
                <div className="card-sub">{ech.length} ligne{ech.length>1?'s':''} non lettrée{ech.length>1?'s':''}</div>
              </div>
              {enRetard > 0 && <Badge tone="danger">{SX.fmt(enRetard)} en retard</Badge>}
            </div>
            <div style={{ padding: '6px 0' }}>
              {ech.slice(0, 5).map((e, i) => {
                const t = e.tiers ? SX.tiersByCode[e.tiers] : null;
                const retard = e.bucket !== 'non_echu';
                return (
                  <div className="ech-row" key={i}>
                    <span className={`avatar`} style={{ width: 32, height: 32, fontSize: 12, background: e.sens === 'client' ? 'var(--success)' : 'var(--primary)' }}>
                      {t ? t.raison_sociale.slice(0,1) : '?'}
                    </span>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="ech-name">{t ? t.raison_sociale : '—'}</div>
                      <div className="ech-meta">{e.ref} · échéance {SX.fmtDate(e.echeance)}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="amount" style={{ fontSize: 13.5 }}>{SX.fmt(e.montant)}</div>
                      {retard ? <span className="ech-late">en retard</span> : <span className="ech-ok">à venir</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {brouillons > 0 && (
            <button className="alert-card" onClick={() => onNav('ecritures', { filter: 'brouillon' })}>
              <span className="kpi-ic ic-soft-amber" style={{ width: 36, height: 36 }}><Icon name="pen" size={17} /></span>
              <div>
                <div style={{ fontWeight: 800, fontSize: 14 }}>{brouillons} écriture{brouillons>1?'s':''} en brouillon</div>
                <div className="muted" style={{ fontSize: 12.5, fontWeight: 600 }}>À compléter et valider</div>
              </div>
              <Icon name="chevRight" size={18} style={{ marginLeft: 'auto', color: 'var(--muted-foreground)' }} />
            </button>
          )}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .dash-grid { display: grid; grid-template-columns: 1.55fr 1fr; gap: 16px; align-items: start; }
        @media (max-width: 1180px){ .dash-grid { grid-template-columns: 1fr; } }
        .chart { display: flex; align-items: flex-end; gap: 14px; height: 188px; padding-top: 12px; }
        .chart-col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 8px; height: 100%; }
        .chart-bar-wrap { flex: 1; width: 100%; max-width: 54px; display: flex; flex-direction: column; justify-content: flex-end; align-items: center; position: relative; }
        .chart-bar { width: 100%; border-radius: 5px 5px 2px 2px; background: linear-gradient(180deg, var(--primary), oklch(0.72 0.085 248)); transition: height .5s cubic-bezier(.2,.8,.2,1); min-height: 3px; }
        .chart-val { font-family: var(--font-mono); font-size: 11px; font-weight: 700; color: var(--muted-foreground); margin-bottom: 5px; white-space: nowrap; }
        .chart-lbl { font-size: 12px; font-weight: 700; color: var(--muted-foreground); }
        .treso-line { display: flex; align-items: center; justify-content: space-between; font-size: 13.5px; font-weight: 700; }
        .dotc { width: 9px; height: 9px; border-radius: 50%; display: inline-block; }
        .mini-card { text-align: left; background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); padding: 14px 15px; box-shadow: var(--shadow-sm); display: flex; flex-direction: column; gap: 7px; transition: border-color .15s, transform .05s; }
        .mini-card:hover { border-color: var(--border-strong); }
        .mini-card:active { transform: translateY(1px); }
        .mini-val { font-size: 18px; }
        .mini-lbl { font-size: 12.5px; font-weight: 700; color: var(--muted-foreground); }
        .ech-row { display: flex; align-items: center; gap: 11px; padding: 9px 18px; }
        .ech-row + .ech-row { border-top: 1px solid var(--border); }
        .ech-name { font-weight: 700; font-size: 13.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .ech-meta { font-size: 11.5px; font-weight: 600; color: var(--muted-foreground); }
        .ech-late { font-size: 11px; font-weight: 800; color: var(--destructive); }
        .ech-ok { font-size: 11px; font-weight: 700; color: var(--muted-foreground); }
        .alert-card { width: 100%; display: flex; align-items: center; gap: 13px; background: var(--warning-soft); border: 1px solid oklch(0.86 0.07 80); border-radius: var(--radius); padding: 14px 16px; text-align: left; transition: .12s; }
        .alert-card:hover { background: oklch(0.95 0.05 80); }
      `}} />
    </div>
  );
}
window.Dashboard = Dashboard;
