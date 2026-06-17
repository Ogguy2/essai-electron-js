/* SICONEX — Lettrage (rapprochement de lignes) */

function colToNum(s) { let n = 0; for (const ch of s) n = n * 26 + (ch.charCodeAt(0) - 64); return n; }
function numToCol(n) { let s = ''; while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); } return s; }

function Lettrage({ data, setData, entries, magasin }) {
  const lettrables = SX.comptes.filter(c => c.lettrable);
  const [compte, setCompte] = useState('4111');
  const [tiersF, setTiersF] = useState('');
  const [sel, setSel] = useState({}); // key `${id}:${idx}` -> true
  const toast = useToast();

  // gather validated lines of this compte
  const items = [];
  entries.filter(e => e.statut === 'validee').forEach(e => {
    e.lines.forEach((l, idx) => {
      if (l.compte === compte && (!tiersF || l.tiers === tiersF)) items.push({ key: `${e.id}:${idx}`, id: e.id, idx, line: l, entry: e });
    });
  });
  items.sort((a, b) => a.entry.date.localeCompare(b.entry.date));

  const selItems = items.filter(it => sel[it.key]);
  const sums = selItems.reduce((a, it) => ({ d: a.d + (+it.line.debit||0), c: a.c + (+it.line.credit||0) }), { d:0, c:0 });
  const ecart = sums.d - sums.c;
  const lettre = Math.abs(ecart) < 0.005 && selItems.length > 0;
  const anyLettered = selItems.some(it => it.line.lettrage);

  // existing codes in this magasin
  const existingCodes = new Set();
  data.filter(e => e.magasin === magasin.id).forEach(e => e.lines.forEach(l => { if (l.lettrage) existingCodes.add(l.lettrage); }));
  const maxNum = [...existingCodes].reduce((m, c) => Math.max(m, colToNum(c)), 0);
  const nextCode = numToCol(maxNum + 1);

  // existing groups for this compte
  const groups = {};
  items.forEach(it => { if (it.line.lettrage) { (groups[it.line.lettrage] = groups[it.line.lettrage] || []).push(it); } });

  function toggle(key) { setSel(s => ({ ...s, [key]: !s[key] })); }

  function letter() {
    if (selItems.length < 1) return;
    const code = nextCode;
    const keys = new Set(selItems.map(it => it.key));
    setData(d => d.map(e => ({ ...e, lines: e.lines.map((l, idx) => keys.has(`${e.id}:${idx}`) ? { ...l, lettrage: code } : l) })));
    setSel({});
    toast(lettre ? `Lignes lettrées « ${code} » ✓` : `Lettrage partiel « ${code} » — écart ${SX.fmt(ecart)}`, lettre ? 'success' : 'info');
  }
  function unletter(code) {
    setData(d => d.map(e => ({ ...e, lines: e.lines.map(l => l.lettrage === code ? { ...l, lettrage: null } : l) })));
    toast(`Lettrage « ${code} » supprimé`, 'info');
  }

  const tiersOfCompte = compte === '4111' ? SX.tiers.filter(t => t.est_client) : compte === '4011' ? SX.tiers.filter(t => t.est_fournisseur) : SX.tiers;
  const lettered = items.filter(it => it.line.lettrage).length;

  return (
    <div className="page page-wide">
      <PageHead title="Lettrage" desc="Rapprochez factures et règlements sur un même compte tiers pour solder les créances et dettes." />

      <div className="lt-grid">
        {/* main */}
        <div className="stack">
          <div className="card card-pad" style={{ padding: 14 }}>
            <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
              <div className="field" style={{ width: 280 }}>
                <label className="label">Compte à lettrer</label>
                <select className="select" value={compte} onChange={e => { setCompte(e.target.value); setSel({}); setTiersF(''); }}>
                  {lettrables.map(c => <option key={c.numero} value={c.numero}>{c.numero} — {c.libelle}</option>)}
                </select>
              </div>
              {(compte === '4111' || compte === '4011') && (
                <div className="field" style={{ width: 260 }}>
                  <label className="label">Tiers (optionnel)</label>
                  <select className="select" value={tiersF} onChange={e => { setTiersF(e.target.value); setSel({}); }}>
                    <option value="">Tous les tiers</option>
                    {tiersOfCompte.map(t => <option key={t.code} value={t.code}>{t.code} — {t.raison_sociale}</option>)}
                  </select>
                </div>
              )}
              <div style={{ flex: 1 }} />
              <div className="lt-legend">
                <span><span className="dotc" style={{ background: 'var(--success)' }} /> Lettré</span>
                <span><span className="dotc" style={{ background: 'var(--border-strong)' }} /> Non lettré</span>
              </div>
            </div>
          </div>

          <div className="card" style={{ overflow: 'hidden' }}>
            <div className="card-head">
              <div className="card-title">Lignes du compte {compte} <span className="muted" style={{ fontWeight: 600 }}>· {items.length} ligne{items.length>1?'s':''}, {lettered} lettrée{lettered>1?'s':''}</span></div>
            </div>
            {items.length === 0 ? (
              <Empty icon="link" title="Aucune ligne">Ce compte ne comporte aucune ligne d'écriture validée.</Empty>
            ) : (
              <table className="tbl">
                <thead><tr>
                  <th style={{ width: 38 }}></th><th>Date</th><th>Pièce</th><th>Tiers</th><th>Libellé</th>
                  <th className="num">Débit</th><th className="num">Crédit</th><th>Let.</th>
                </tr></thead>
                <tbody>
                  {items.map(it => {
                    const l = it.line; const ti = l.tiers ? SX.tiersByCode[l.tiers] : null;
                    const isLet = !!l.lettrage; const checked = !!sel[it.key];
                    return (
                      <tr key={it.key} className={`clickable ${checked ? 'lt-selected' : ''}`} onClick={() => toggle(it.key)}>
                        <td onClick={e => e.stopPropagation()}><input type="checkbox" className="checkbox" checked={checked} onChange={() => toggle(it.key)} /></td>
                        <td className="muted" style={{ whiteSpace: 'nowrap' }}>{SX.fmtDate(it.entry.date)}</td>
                        <td className="col-code">{it.entry.ref}</td>
                        <td>{ti ? ti.raison_sociale : <span className="muted">—</span>}</td>
                        <td className="muted">{l.libelle}</td>
                        <td className="num">{l.debit ? <span className="amount">{SX.fmt(l.debit)}</span> : '—'}</td>
                        <td className="num">{l.credit ? <span className="amount">{SX.fmt(l.credit)}</span> : '—'}</td>
                        <td>{isLet ? <Badge tone="success">{l.lettrage}</Badge> : <span className="muted">—</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* side panel */}
        <div className="stack">
          <div className="card card-pad lt-panel">
            <div className="card-title" style={{ marginBottom: 14 }}>Sélection</div>
            {selItems.length === 0 ? (
              <p className="muted" style={{ fontSize: 13.5, fontWeight: 600, margin: 0, lineHeight: 1.5 }}>Cochez des lignes du même compte pour calculer leur solde et les lettrer.</p>
            ) : (
              <>
                <div className="lt-sum"><span>Lignes sélectionnées</span><b>{selItems.length}</b></div>
                <div className="lt-sum"><span>Σ Débit</span><b className="amount">{SX.fmt(sums.d)}</b></div>
                <div className="lt-sum"><span>Σ Crédit</span><b className="amount">{SX.fmt(sums.c)}</b></div>
                <div className="lt-sum"><span>Écart</span><b className={`amount ${ecart===0?'':'amount-neg'}`}>{SX.fmt(ecart)}</b></div>
                <div className="divider" style={{ margin: '12px 0' }} />
                <div className={`lt-state ${lettre ? 'ok' : 'partial'}`}>
                  <Icon name={lettre ? 'checkCircle' : 'info'} size={17} />
                  <div>
                    <b>{lettre ? 'Équilibre parfait' : 'Lettrage partiel'}</b>
                    <span>{lettre ? 'Statut : lettré' : 'Solde non nul — statut : partiel'}</span>
                  </div>
                </div>
                <div className="lt-code">Prochain code : <b>{nextCode}</b></div>
                {anyLettered && <div className="hint" style={{ color: 'var(--warning-foreground)', marginTop: 8 }}>Certaines lignes sont déjà lettrées — elles seront regroupées sous le nouveau code.</div>}
                <button className="btn btn-success" style={{ width: '100%', marginTop: 14 }} onClick={letter}><Icon name="link" /> Lettrer « {nextCode} »</button>
                <button className="btn btn-ghost btn-sm" style={{ width: '100%', marginTop: 8 }} onClick={() => setSel({})}>Réinitialiser</button>
              </>
            )}
          </div>

          {Object.keys(groups).length > 0 && (
            <div className="card">
              <div className="card-head"><div className="card-title">Groupes lettrés</div></div>
              <div style={{ padding: 6 }}>
                {Object.entries(groups).map(([code, list]) => {
                  const s = list.reduce((a, it) => ({ d: a.d+(+it.line.debit||0), c: a.c+(+it.line.credit||0) }), {d:0,c:0});
                  const ok = Math.abs(s.d-s.c) < 0.005;
                  return (
                    <div className="lt-group" key={code}>
                      <Badge tone={ok ? 'success' : 'warning'}>{code}</Badge>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{list.length} ligne{list.length>1?'s':''} · {SX.fmt(s.d)} FCFA</div>
                        <div className="muted" style={{ fontSize: 11.5, fontWeight: 600 }}>{ok ? 'Lettré' : 'Partiel'}</div>
                      </div>
                      <button className="btn btn-ghost btn-sm" onClick={() => unletter(code)} title="Dé-lettrer"><Icon name="x" size={14} /> Délettrer</button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .lt-grid { display: grid; grid-template-columns: 1fr 320px; gap: 16px; align-items: start; }
        @media (max-width: 1180px){ .lt-grid { grid-template-columns: 1fr; } }
        .lt-legend { display: flex; gap: 16px; font-size: 12.5px; font-weight: 700; color: var(--muted-foreground); }
        .lt-legend span { display: flex; align-items: center; gap: 6px; }
        .lt-selected { background: var(--primary-soft) !important; }
        .lt-panel { position: sticky; top: 0; }
        .lt-sum { display: flex; align-items: center; justify-content: space-between; font-size: 13.5px; font-weight: 700; padding: 4px 0; }
        .lt-sum span { color: var(--muted-foreground); }
        .lt-sum b { font-size: 14.5px; }
        .lt-state { display: flex; align-items: center; gap: 10px; padding: 11px 13px; border-radius: 10px; }
        .lt-state.ok { background: var(--success-soft); color: var(--success); }
        .lt-state.partial { background: var(--warning-soft); color: var(--warning-foreground); }
        .lt-state b { display: block; font-size: 13.5px; font-weight: 800; }
        .lt-state span { font-size: 12px; font-weight: 600; }
        .lt-code { margin-top: 12px; font-size: 13px; font-weight: 700; color: var(--muted-foreground); }
        .lt-code b { font-family: var(--font-display); font-size: 16px; color: var(--primary); }
        .lt-group { display: flex; align-items: center; gap: 11px; padding: 9px 12px; }
        .lt-group + .lt-group { border-top: 1px solid var(--border); }
      `}} />
    </div>
  );
}
window.Lettrage = Lettrage;
