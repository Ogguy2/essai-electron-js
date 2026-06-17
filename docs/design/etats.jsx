/* SICONEX — Etats & reporting (balance, grand livre, resultat, echeancier) */

function Cartouche({ legal, titre, sousTitre }) {
  const now = '12/06/2026 11:24';
  return (
    <div className="cartouche">
      <div className="cart-top">
        <div className="cart-soc">
          <div className="cart-logo"><img src="assets/siconex-logo.png" alt="" /></div>
          <div>
            <div className="cart-rs">{legal.raison_sociale}</div>
            <div className="cart-meta">
              {legal.rccm && <span>RCCM {legal.rccm}</span>}
              {legal.adresse && <span>· {legal.adresse}</span>}
              {legal.telephone && <span>· {legal.telephone}</span>}
            </div>
          </div>
        </div>
        <div className="cart-right">
          <div className="cart-cur">FCFA</div>
          <div className="cart-date">Édité le {now}</div>
        </div>
      </div>
      <div className="cart-rule" />
      <div className="cart-titre">{titre}</div>
      <div className="cart-sous">{sousTitre}</div>
    </div>
  );
}

function ReportDoc({ legal, titre, sousTitre, children }) {
  return (
    <div className="report-doc">
      <Cartouche legal={legal} titre={titre} sousTitre={sousTitre} />
      {children}
      <div className="cart-pagefoot">Page 1 / 1 · Siconex Compta · SYSCOHADA</div>
    </div>
  );
}

/* ---- Balance ---- */
function BalanceReport({ entries, legal, titre = 'Balance générale', sousTitre }) {
  const bal = CALC.balance(entries);
  const byClasse = {};
  bal.forEach(r => (byClasse[r.classe] = byClasse[r.classe] || []).push(r));
  const tot = bal.reduce((a, r) => ({ d: a.d+r.debit, c: a.c+r.credit, sd: a.sd+r.solde_debiteur, sc: a.sc+r.solde_crediteur }), { d:0,c:0,sd:0,sc:0 });
  return (
    <ReportDoc legal={legal} titre={titre} sousTitre={sousTitre}>
      <table className="tbl rpt">
        <thead><tr><th>N° compte</th><th>Intitulé</th><th className="num">Mvt débit</th><th className="num">Mvt crédit</th><th className="num">Solde débiteur</th><th className="num">Solde créditeur</th></tr></thead>
        <tbody>
          {Object.keys(byClasse).sort().map(k => {
            const list = byClasse[k];
            const st = list.reduce((a, r) => ({ d:a.d+r.debit, c:a.c+r.credit, sd:a.sd+r.solde_debiteur, sc:a.sc+r.solde_crediteur }), {d:0,c:0,sd:0,sc:0});
            return (
              <React.Fragment key={k}>
                <tr className="group-row"><td colSpan={6}>Classe {k} — {SX.classes[k]}</td></tr>
                {list.map(r => (
                  <tr key={r.numero}>
                    <td className="col-code" style={{ color: 'var(--primary)' }}>{r.numero}</td>
                    <td style={{ fontWeight: 700 }}>{r.libelle}</td>
                    <td className="num"><span className="amount">{SX.fmt(r.debit)}</span></td>
                    <td className="num"><span className="amount">{SX.fmt(r.credit)}</span></td>
                    <td className="num">{r.solde_debiteur ? <span className="amount">{SX.fmt(r.solde_debiteur)}</span> : '—'}</td>
                    <td className="num">{r.solde_crediteur ? <span className="amount">{SX.fmt(r.solde_crediteur)}</span> : '—'}</td>
                  </tr>
                ))}
                <tr className="subtotal-row"><td></td><td>Sous-total classe {k}</td><td className="num">{SX.fmt(st.d)}</td><td className="num">{SX.fmt(st.c)}</td><td className="num">{SX.fmt(st.sd)}</td><td className="num">{SX.fmt(st.sc)}</td></tr>
              </React.Fragment>
            );
          })}
        </tbody>
        <tfoot><tr><td></td><td>TOTAL GÉNÉRAL</td><td className="num">{SX.fmt(tot.d)}</td><td className="num">{SX.fmt(tot.c)}</td><td className="num">{SX.fmt(tot.sd)}</td><td className="num">{SX.fmt(tot.sc)}</td></tr></tfoot>
      </table>
    </ReportDoc>
  );
}

/* ---- Grand livre ---- */
function GrandLivreReport({ entries, magasin, exercice, compte, tiers, aux }) {
  const rows = CALC.grandLivre(entries, aux ? { tiers } : { compte });
  const tot = rows.reduce((a, l) => ({ d: a.d+(+l.debit||0), c: a.c+(+l.credit||0) }), {d:0,c:0});
  const solde = rows.length ? rows[rows.length-1].solde_progressif : 0;
  const cpt = aux ? null : SX.compteByNum[compte];
  const t = aux ? SX.tiersByCode[tiers] : null;
  return (
    <ReportDoc legal={SX.legalOf(magasin)} titre={aux ? 'Grand livre auxiliaire' : 'Grand livre'}
      sousTitre={aux ? `Tiers ${t?.code} — ${t?.raison_sociale} · Exercice ${exercice.libelle}` : `Compte ${compte} — ${cpt?.libelle} · Exercice ${exercice.libelle}`}>
      <table className="tbl rpt">
        <thead><tr><th>Date</th><th>Jnl</th><th>Pièce</th><th>Libellé</th><th className="num">Débit</th><th className="num">Crédit</th><th className="num">Solde</th><th>Let.</th></tr></thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={8}><div className="muted" style={{ padding: 16, textAlign: 'center', fontWeight: 600 }}>Aucun mouvement sur la période.</div></td></tr>}
          {rows.map((l, i) => (
            <tr key={i}>
              <td className="muted" style={{ whiteSpace: 'nowrap' }}>{SX.fmtDate(l.date)}</td>
              <td><Badge tone="neutral">{l.journal}</Badge></td>
              <td className="col-code">{l.ref}</td>
              <td>{l.libelle}</td>
              <td className="num">{l.debit ? <span className="amount">{SX.fmt(l.debit)}</span> : '—'}</td>
              <td className="num">{l.credit ? <span className="amount">{SX.fmt(l.credit)}</span> : '—'}</td>
              <td className="num"><span className={`amount ${l.solde_progressif<0?'amount-neg':''}`}>{SX.fmt(l.solde_progressif)}</span></td>
              <td>{l.lettrage ? <Badge tone="success">{l.lettrage}</Badge> : '—'}</td>
            </tr>
          ))}
        </tbody>
        <tfoot><tr><td colSpan={4}>Totaux · solde {solde<0?'créditeur':'débiteur'}</td><td className="num">{SX.fmt(tot.d)}</td><td className="num">{SX.fmt(tot.c)}</td><td className="num">{SX.fmt(Math.abs(solde))}</td><td></td></tr></tfoot>
      </table>
    </ReportDoc>
  );
}

/* ---- Résultat ---- */
function ResultatReport({ entries, legal, titre = 'Compte de résultat', sousTitre }) {
  const r = CALC.resultat(entries);
  return (
    <ReportDoc legal={legal} titre={titre} sousTitre={sousTitre}>
      <div className="res-grid">
        <div className="res-col">
          <div className="res-head res-charges">Charges (classe 6)</div>
          <table className="tbl rpt"><tbody>
            {r.charges_detail.map(c => <tr key={c.numero}><td className="col-code" style={{ color: 'var(--primary)' }}>{c.numero}</td><td>{c.libelle}</td><td className="num"><span className="amount">{SX.fmt(c.montant)}</span></td></tr>)}
          </tbody><tfoot><tr><td colSpan={2}>Total charges</td><td className="num">{SX.fmt(r.charges)}</td></tr></tfoot></table>
        </div>
        <div className="res-col">
          <div className="res-head res-produits">Produits (classe 7)</div>
          <table className="tbl rpt"><tbody>
            {r.produits_detail.map(c => <tr key={c.numero}><td className="col-code" style={{ color: 'var(--primary)' }}>{c.numero}</td><td>{c.libelle}</td><td className="num"><span className="amount">{SX.fmt(c.montant)}</span></td></tr>)}
          </tbody><tfoot><tr><td colSpan={2}>Total produits</td><td className="num">{SX.fmt(r.produits)}</td></tr></tfoot></table>
        </div>
      </div>
      <div className={`res-net ${r.resultat>=0?'benef':'perte'}`}>
        <div className="row" style={{ gap: 10 }}><Icon name={r.resultat>=0?'trendUp':'trendDown'} size={20} /><span>Résultat net de l'exercice</span></div>
        <div className="res-net-val">{SX.fmt(r.resultat)} FCFA <b>{r.resultat>=0?'BÉNÉFICE':'PERTE'}</b></div>
      </div>
    </ReportDoc>
  );
}

/* ---- Échéancier ---- */
const BUCKETS = [['non_echu','Non échu'],['j0_30','0–30 j'],['j31_60','31–60 j'],['j61_90','61–90 j'],['j90_plus','+90 j']];
function EcheancierReport({ entries, magasin, tiers }) {
  const rows = CALC.echeancier(entries, { tiers });
  const byTiers = {};
  rows.forEach(r => (byTiers[r.tiers] = byTiers[r.tiers] || []).push(r));
  const ventil = {}; BUCKETS.forEach(([k]) => ventil[k] = 0);
  rows.forEach(r => ventil[r.bucket] += r.montant);
  const total = rows.reduce((a, r) => a + r.montant, 0);
  return (
    <ReportDoc legal={SX.legalOf(magasin)} titre="Échéancier" sousTitre={`Créances & dettes non lettrées · arrêté au 12/06/2026`}>
      <table className="tbl rpt">
        <thead><tr><th>Tiers</th><th>Échéance</th><th>Pièce</th><th>Libellé</th><th className="num">Montant dû</th><th>Antériorité</th></tr></thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={6}><div className="muted" style={{ padding: 16, textAlign: 'center', fontWeight: 600 }}>Aucune échéance en attente.</div></td></tr>}
          {Object.keys(byTiers).map(code => {
            const t = SX.tiersByCode[code]; const list = byTiers[code];
            return (
              <React.Fragment key={code}>
                <tr className="group-row"><td colSpan={6}>{t?.raison_sociale} ({code}) — {list[0].sens === 'client' ? 'créance client' : 'dette fournisseur'}</td></tr>
                {list.map((r, i) => {
                  const lbl = BUCKETS.find(b => b[0] === r.bucket)[1];
                  const late = r.bucket !== 'non_echu';
                  return (
                    <tr key={i}>
                      <td className="muted">{code}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>{SX.fmtDate(r.echeance)}</td>
                      <td className="col-code">{r.ref}</td>
                      <td>{r.libelle}</td>
                      <td className="num"><span className="amount">{SX.fmt(r.montant)}</span></td>
                      <td><Badge tone={late ? (r.bucket==='j90_plus'?'danger':'warning') : 'neutral'}>{lbl}</Badge></td>
                    </tr>
                  );
                })}
              </React.Fragment>
            );
          })}
        </tbody>
        <tfoot><tr><td colSpan={4}>TOTAL DÛ</td><td className="num">{SX.fmt(total)}</td><td></td></tr></tfoot>
      </table>
      <div className="ventil">
        <div className="ventil-title">Ventilation par antériorité</div>
        <div className="ventil-grid">
          {BUCKETS.map(([k, lbl]) => (
            <div className="ventil-cell" key={k}>
              <div className="ventil-lbl">{lbl}</div>
              <div className="amount ventil-val">{SX.fmt(ventil[k])}</div>
            </div>
          ))}
        </div>
      </div>
    </ReportDoc>
  );
}

/* ---- main ---- */
const ET_TABS = [
  { id: 'balance', label: 'Balance', icon: 'balance' },
  { id: 'grand-livre', label: 'Grand livre', icon: 'ledger' },
  { id: 'grand-livre-aux', label: 'Grand livre auxiliaire', icon: 'users' },
  { id: 'resultat', label: 'Compte de résultat', icon: 'result' },
  { id: 'echeancier', label: 'Échéancier', icon: 'clock' },
];

function Etats({ entries, magasin, exercice, params }) {
  const [tab, setTab] = useState(params?.tab || 'balance');
  const [compte, setCompte] = useState('4111');
  const [tiers, setTiers] = useState(params?.tiers || 'C001');
  const [echTiers, setEchTiers] = useState('');
  const toast = useToast();

  useEffect(() => { if (params?.tab) setTab(params.tab); if (params?.tiers) { setTiers(params.tiers); } }, [params]);

  function exportPdf() {
    document.body.classList.add('printing');
    setTimeout(() => { window.print(); document.body.classList.remove('printing'); }, 60);
  }

  const comptesMvt = SX.comptes.filter(c => CALC.soldeCompte(entries, c.numero).debit || CALC.soldeCompte(entries, c.numero).credit);
  const clients = SX.tiers.filter(t => t.est_client);

  return (
    <div className="page page-wide">
      <PageHead title="États & reporting" desc="Agrégats calculés à la demande sur les écritures — exportables en PDF (cartouche société, FCFA).">
        <button className="btn btn-primary" onClick={exportPdf}><Icon name="download" /> Exporter en PDF</button>
      </PageHead>

      <div className="et-tabs tabs" style={{ marginBottom: 16 }}>
        {ET_TABS.map(t => (
          <button key={t.id} className={`tab ${tab===t.id?'active':''}`} onClick={() => setTab(t.id)}><Icon name={t.icon} size={15} style={{ marginRight: 6, verticalAlign: '-2px' }} />{t.label}</button>
        ))}
      </div>

      {/* parameter bar */}
      {(tab === 'grand-livre' || tab === 'grand-livre-aux' || tab === 'echeancier') && (
        <div className="card card-pad et-controls" style={{ marginBottom: 16, padding: 14 }}>
          <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
            {tab === 'grand-livre' && (
              <div className="field" style={{ width: 320 }}><label className="label">Compte</label>
                <select className="select" value={compte} onChange={e => setCompte(e.target.value)}>
                  {comptesMvt.map(c => <option key={c.numero} value={c.numero}>{c.numero} — {c.libelle}</option>)}
                </select></div>
            )}
            {tab === 'grand-livre-aux' && (
              <div className="field" style={{ width: 320 }}><label className="label">Tiers</label>
                <select className="select" value={tiers} onChange={e => setTiers(e.target.value)}>
                  {SX.tiers.map(t => <option key={t.code} value={t.code}>{t.code} — {t.raison_sociale}</option>)}
                </select></div>
            )}
            {tab === 'echeancier' && (
              <div className="field" style={{ width: 320 }}><label className="label">Tiers (optionnel)</label>
                <select className="select" value={echTiers} onChange={e => setEchTiers(e.target.value)}>
                  <option value="">Tous les tiers</option>
                  {SX.tiers.map(t => <option key={t.code} value={t.code}>{t.code} — {t.raison_sociale}</option>)}
                </select></div>
            )}
          </div>
        </div>
      )}

      <div className="report-frame">
        {tab === 'balance' && <BalanceReport entries={entries} legal={SX.legalOf(magasin)} sousTitre={`Exercice ${exercice.libelle} · du ${SX.fmtDate(exercice.date_debut)} au ${SX.fmtDate(exercice.date_fin)}`} />}
        {tab === 'grand-livre' && <GrandLivreReport entries={entries} magasin={magasin} exercice={exercice} compte={compte} />}
        {tab === 'grand-livre-aux' && <GrandLivreReport entries={entries} magasin={magasin} exercice={exercice} tiers={tiers} aux />}
        {tab === 'resultat' && <ResultatReport entries={entries} legal={SX.legalOf(magasin)} sousTitre={`Exercice ${exercice.libelle} · du ${SX.fmtDate(exercice.date_debut)} au ${SX.fmtDate(exercice.date_fin)}`} />}
        {tab === 'echeancier' && <EcheancierReport entries={entries} magasin={magasin} tiers={echTiers || undefined} />}
      </div>
    </div>
  );
}
window.Etats = Etats;
Object.assign(window, { Cartouche, ReportDoc, BalanceReport, ResultatReport });

/* report-doc styles — injected globally so they apply on the États page AND the
   Consolidation page (both render <ReportDoc>). */
(function () {
  const css = `
        .report-frame { display: flex; justify-content: center; }
        .report-doc { background: #fff; border: 1px solid var(--border); border-radius: 10px; box-shadow: var(--shadow-md); width: 100%; max-width: 940px; padding: 32px 36px 24px; }
        .cartouche { margin-bottom: 18px; }
        .cart-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
        .cart-soc { display: flex; gap: 12px; align-items: center; }
        .cart-logo { width: 52px; height: 44px; flex: none; }
        .cart-logo img { width: 100%; height: 100%; object-fit: contain; }
        .cart-rs { font-family: var(--font-display); font-weight: 600; font-size: 18px; }
        .cart-meta { font-size: 11.5px; font-weight: 600; color: var(--muted-foreground); display: flex; gap: 5px; flex-wrap: wrap; margin-top: 2px; }
        .cart-right { text-align: right; }
        .cart-cur { font-weight: 800; font-size: 14px; color: var(--primary); }
        .cart-date { font-size: 11.5px; font-weight: 600; color: var(--muted-foreground); }
        .cart-rule { height: 2px; background: var(--primary); margin: 14px 0 16px; border-radius: 2px; }
        .cart-titre { text-align: center; font-family: var(--font-display); font-weight: 600; font-size: 22px; letter-spacing: -0.01em; }
        .cart-sous { text-align: center; font-size: 12.5px; font-weight: 700; color: var(--muted-foreground); margin-top: 2px; }
        .cart-pagefoot { text-align: right; font-size: 10.5px; font-weight: 600; color: var(--muted-foreground); margin-top: 18px; }
        .tbl.rpt { margin-top: 6px; }
        .tbl.rpt thead th { background: var(--secondary); }
        .res-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-top: 8px; }
        .res-head { font-weight: 800; font-size: 13px; padding: 9px 12px; border-radius: 8px; margin-bottom: 4px; }
        .res-charges { background: var(--destructive-soft); color: var(--destructive); }
        .res-produits { background: var(--success-soft); color: var(--success); }
        .res-net { display: flex; align-items: center; justify-content: space-between; margin-top: 22px; padding: 16px 20px; border-radius: 12px; color: #fff; }
        .res-net.benef { background: var(--success); }
        .res-net.perte { background: var(--destructive); }
        .res-net span { font-weight: 800; font-size: 15px; }
        .res-net-val { font-family: var(--font-mono); font-weight: 700; font-size: 17px; }
        .res-net-val b { font-family: var(--font-display); font-weight: 600; margin-left: 8px; }
        .ventil { margin-top: 22px; }
        .ventil-title { font-weight: 800; font-size: 13px; margin-bottom: 10px; }
        .ventil-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; }
        .ventil-cell { background: var(--secondary); border-radius: 9px; padding: 11px 13px; }
        .ventil-lbl { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.03em; color: var(--muted-foreground); }
        .ventil-val { font-size: 15px; margin-top: 4px; display: block; }
        @media print {
          body.printing .sidebar, body.printing .topbar, body.printing .page-head, body.printing .et-tabs, body.printing .et-controls, body.printing .toast-wrap { display: none !important; }
          body.printing .app-shell { display: block; }
          body.printing .page-scroll, body.printing .main-col, body.printing .page { overflow: visible !important; height: auto !important; padding: 0 !important; }
          body.printing .report-doc { border: none; box-shadow: none; max-width: none; border-radius: 0; }
        }
  `;
  const s = document.createElement('style'); s.textContent = css; document.head.appendChild(s);
})();
