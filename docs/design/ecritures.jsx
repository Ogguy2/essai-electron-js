/* SICONEX — Écritures comptables (saisie partie double) */

/* ---- searchable compte combobox ---- */
function CompteCombo({ value, onChange, placeholder = 'Compte…', error }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useClickOutside(() => setOpen(false));
  const sel = value ? SX.compteByNum[value] : null;
  const list = SX.comptes.filter(c => {
    const s = (c.numero + ' ' + c.libelle).toLowerCase();
    return s.includes(q.toLowerCase());
  });
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button type="button" className={`combo ${error ? 'input-err' : ''}`} onClick={() => { setOpen(o => !o); setQ(''); }}>
        {sel ? <span className="combo-sel"><b className="font-mono">{sel.numero}</b> {sel.libelle}</span>
             : <span className="muted">{placeholder}</span>}
        <Icon name="chevDown" size={15} style={{ color: 'var(--muted-foreground)', flex: 'none' }} />
      </button>
      {open && (
        <div className="menu" style={{ top: 'calc(100% + 5px)', left: 0, right: 0, minWidth: 280, maxHeight: 280, overflowY: 'auto', padding: 0 }}>
          <div style={{ padding: 8, position: 'sticky', top: 0, background: 'var(--card)', borderBottom: '1px solid var(--border)' }}>
            <div className="search"><Icon name="search" /><input className="input" autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher un compte…" /></div>
          </div>
          <div style={{ padding: 6 }}>
            {list.length === 0 && <div className="muted" style={{ padding: 12, fontSize: 13, fontWeight: 600 }}>Aucun compte.</div>}
            {list.map(c => (
              <button key={c.numero} type="button" className="menu-item" onClick={() => { onChange(c.numero); setOpen(false); }}>
                <b className="font-mono" style={{ minWidth: 42 }}>{c.numero}</b>
                <span style={{ flex: 1 }}>{c.libelle}</span>
                {c.collectif && <Badge tone="primary">collectif</Badge>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---- entry editor form ---- */
function EcritureForm({ entry, magasin, exercice, onClose, onSave, onValidate }) {
  const blank = () => ({ compte: '', tiers: '', libelle: '', debit: '', credit: '', echeance: '' });
  const [journal, setJournal] = useState(entry?.journal || 'VTE');
  const [date, setDate] = useState(entry?.date || '2026-06-10');
  const [libelle, setLibelle] = useState(entry?.libelle || '');
  const [lines, setLines] = useState(() =>
    entry ? entry.lines.map(l => ({ compte: l.compte, tiers: l.tiers || '', libelle: l.libelle || '', debit: l.debit || '', credit: l.credit || '', echeance: l.echeance || '' }))
          : [blank(), blank()]);
  const [touched, setTouched] = useState(false);
  const toast = useToast();

  const totals = lines.reduce((a, l) => ({ d: a.d + (+l.debit || 0), c: a.c + (+l.credit || 0) }), { d: 0, c: 0 });
  const ecart = totals.d - totals.c;
  const balanced = Math.abs(ecart) < 0.005 && totals.d > 0;

  function setLine(i, patch) { setLines(ls => ls.map((l, idx) => idx === i ? { ...l, ...patch } : l)); }
  function addLine() { setLines(ls => [...ls, blank()]); }
  function delLine(i) { setLines(ls => ls.length > 2 ? ls.filter((_, idx) => idx !== i) : ls); }

  // auto-balance helper: fill last empty credit/debit
  function balanceLine(i) {
    const others = lines.reduce((a, l, idx) => idx === i ? a : { d: a.d + (+l.debit||0), c: a.c + (+l.credit||0) }, { d:0,c:0 });
    const diff = others.d - others.c;
    if (diff > 0) setLine(i, { credit: diff, debit: '' });
    else if (diff < 0) setLine(i, { debit: -diff, credit: '' });
  }

  function collectifMissing(l) { const c = SX.compteByNum[l.compte]; return c && c.collectif && !l.tiers; }
  const exerciceOk = date >= exercice.date_debut && date <= exercice.date_fin && exercice.statut === 'ouvert';
  const anyCollectifMissing = lines.some(collectifMissing);
  const allComptesSet = lines.every(l => l.compte);
  const canValidate = balanced && lines.length >= 2 && allComptesSet && !anyCollectifMissing && exerciceOk;

  function buildEntry(statut) {
    return {
      journal, date, libelle: libelle || '(sans libellé)', statut,
      lines: lines.map(l => ({ compte: l.compte, tiers: l.tiers || null, libelle: l.libelle,
        debit: +l.debit || 0, credit: +l.credit || 0, echeance: l.echeance || null, lettrage: null })),
    };
  }

  function handleSave() {
    setTouched(true);
    if (!allComptesSet) { toast('Renseignez un compte sur chaque ligne.', 'err'); return; }
    onSave(buildEntry('brouillon'));
  }
  function handleValidate() {
    setTouched(true);
    if (!exerciceOk) { toast('La date doit tomber dans un exercice ouvert.', 'err'); return; }
    if (!allComptesSet) { toast('Renseignez un compte sur chaque ligne.', 'err'); return; }
    if (anyCollectifMissing) { toast('Un compte collectif exige un tiers.', 'err'); return; }
    if (!balanced) { toast('Écriture déséquilibrée — débit ≠ crédit.', 'err'); return; }
    onValidate(buildEntry('validee'));
  }

  const tiersList = SX.tiers;

  return (
    <div className="overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ maxWidth: 940, width: '100%' }}>
        <div className="modal-head">
          <span className="modal-ic ic-soft-orange"><Icon name="pen" /></span>
          <div className="modal-head-text">
            <div className="modal-eyebrow">{entry ? 'Modification' : 'Saisie'} · partie double</div>
            <div className="modal-title">{entry ? 'Modifier l\u2019écriture' : 'Nouvelle écriture'}</div>
            <div className="modal-sub">{magasin.libelle} · Exercice {exercice.libelle}</div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Fermer"><Icon name="x" /></button>
        </div>

        <div className="modal-body" style={{ paddingTop: 16 }}>
          {/* header fields */}
          <div className="ef-head">
            <div className="field" style={{ width: 200 }}>
              <label className="label">Journal</label>
              <select className="select" value={journal} onChange={e => setJournal(e.target.value)}>
                {SX.journaux.filter(j => j.code !== 'AN').map(j => <option key={j.code} value={j.code}>{j.code} — {j.libelle}</option>)}
              </select>
            </div>
            <div className="field" style={{ width: 170 }}>
              <label className="label">Date d'écriture</label>
              <input type="date" className={`input ${touched && !exerciceOk ? 'input-err' : ''}`} value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label className="label">Libellé de la pièce</label>
              <input className="input" value={libelle} onChange={e => setLibelle(e.target.value)} placeholder="ex. Facture FV-1062 — Boutique Adjamé" />
            </div>
          </div>

          {touched && !exerciceOk && (
            <div className="ef-warn"><Icon name="alert" size={15} /> Aucun exercice ouvert ne couvre cette date — la validation sera refusée.</div>
          )}

          {/* lines */}
          <div className="ef-lines">
            <div className="ef-lrow ef-lhead">
              <div>Compte</div><div>Tiers</div><div>Libellé ligne</div>
              <div style={{ textAlign: 'right' }}>Débit</div><div style={{ textAlign: 'right' }}>Crédit</div><div></div>
            </div>
            {lines.map((l, i) => {
              const isColl = SX.compteByNum[l.compte]?.collectif;
              const collErr = touched && collectifMissing(l);
              return (
                <div className="ef-lrow" key={i}>
                  <CompteCombo value={l.compte} onChange={v => setLine(i, { compte: v })} error={touched && !l.compte} />
                  <select className={`select ${collErr ? 'input-err' : ''}`} value={l.tiers} disabled={!isColl}
                    onChange={e => setLine(i, { tiers: e.target.value })} style={!isColl ? { opacity: .5 } : null}>
                    <option value="">{isColl ? 'Sélectionner…' : '—'}</option>
                    {tiersList.map(t => <option key={t.code} value={t.code}>{t.code} — {t.raison_sociale}</option>)}
                  </select>
                  <input className="input" value={l.libelle} onChange={e => setLine(i, { libelle: e.target.value })} placeholder="Libellé" />
                  <input className="input amount-input" inputMode="numeric" value={l.debit}
                    onChange={e => setLine(i, { debit: e.target.value.replace(/[^\d.]/g,''), credit: e.target.value ? '' : l.credit })}
                    onDoubleClick={() => balanceLine(i)} placeholder="0" />
                  <input className="input amount-input" inputMode="numeric" value={l.credit}
                    onChange={e => setLine(i, { credit: e.target.value.replace(/[^\d.]/g,''), debit: e.target.value ? '' : l.debit })}
                    onDoubleClick={() => balanceLine(i)} placeholder="0" />
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={() => delLine(i)} disabled={lines.length <= 2} title="Supprimer la ligne"><Icon name="trash" size={15} /></button>
                </div>
              );
            })}
            <button className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start', marginTop: 4 }} onClick={addLine}><Icon name="plus" /> Ajouter une ligne</button>
          </div>

          {/* échéance row hint */}
          <div className="ef-hint"><Icon name="info" size={13} /> Astuce : double-cliquez sur un champ montant pour équilibrer automatiquement la ligne.</div>
        </div>

        {/* footer with balance */}
        <div className="ef-foot">
          <div className="ef-balance">
            <div className="ef-bcell"><span>Total débit</span><b className="amount">{SX.fmt(totals.d)}</b></div>
            <div className="ef-bcell"><span>Total crédit</span><b className="amount">{SX.fmt(totals.c)}</b></div>
            <div className="ef-bcell"><span>Écart</span>
              <b className={`amount ${ecart === 0 ? '' : 'amount-neg'}`}>{SX.fmt(ecart)}</b></div>
            <div className={`ef-status ${balanced ? 'ok' : 'no'}`}>
              <Icon name={balanced ? 'checkCircle' : 'alert'} size={16} />
              {balanced ? 'Équilibrée' : 'Déséquilibrée'}
            </div>
          </div>
          <div className="row" style={{ gap: 10 }}>
            <button className="btn btn-outline" onClick={onClose}>Annuler</button>
            <button className="btn btn-outline" onClick={handleSave}><Icon name="save" /> Brouillon</button>
            <button className="btn btn-success" onClick={handleValidate} disabled={!canValidate}><Icon name="check" /> Valider</button>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .combo { display: flex; align-items: center; gap: 8px; width: 100%; height: 40px; padding: 0 10px; background: var(--card); border: 1px solid var(--border-strong); border-radius: 9px; font-size: 13.5px; font-weight: 600; text-align: left; }
        .combo:hover { border-color: var(--muted-foreground); }
        .combo-sel { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .combo-sel b { color: var(--primary); margin-right: 4px; }
        .ef-head { display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
        .ef-warn { display: flex; align-items: center; gap: 8px; background: var(--warning-soft); color: var(--warning-foreground); border-radius: 9px; padding: 9px 12px; font-size: 13px; font-weight: 700; margin-bottom: 14px; }
        .ef-lines { display: flex; flex-direction: column; gap: 8px; }
        .ef-lrow { display: grid; grid-template-columns: 1.5fr 1.3fr 1.4fr 110px 110px 34px; gap: 8px; align-items: center; }
        .ef-lhead { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; color: var(--muted-foreground); padding: 0 2px 2px; }
        .ef-lrow .input, .ef-lrow .select { height: 38px; font-size: 13px; }
        .ef-hint { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; color: var(--muted-foreground); margin-top: 12px; }
        .ef-foot { border-top: 1px solid var(--border); padding: 14px 22px 18px; display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
        .ef-balance { display: flex; align-items: center; gap: 22px; }
        .ef-bcell { display: flex; flex-direction: column; gap: 2px; }
        .ef-bcell span { font-size: 10.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; color: var(--muted-foreground); }
        .ef-bcell b { font-size: 15px; }
        .ef-status { display: flex; align-items: center; gap: 6px; font-weight: 800; font-size: 13px; padding: 6px 12px; border-radius: 999px; }
        .ef-status.ok { background: var(--success-soft); color: var(--success); }
        .ef-status.no { background: var(--destructive-soft); color: var(--destructive); }
      `}} />
    </div>
  );
}

/* ---- read-only detail ---- */
function EcritureDetail({ entry, magasin, exercice, onClose, onEdit, onValidate, onExtourne, onDelete }) {
  const t = SX.entryTotals(entry);
  const validee = entry.statut === 'validee';
  return (
    <Modal title={entry.ref || 'Brouillon'} maxWidth={760} onClose={onClose}
      icon="receipt" tone={entry.statut === 'validee' ? 'success' : 'warning'} eyebrow="Écriture comptable"
      sub={`${SX.journalByCode[entry.journal]?.libelle} · ${SX.fmtDateLong(entry.date)}`}>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 14 }}>
        <div className="row" style={{ gap: 10 }}>
          <StatutBadge statut={entry.statut} />
          <Badge tone="neutral">{entry.journal}</Badge>
          {entry.reversal_of_id && <Badge tone="info">Extourne</Badge>}
        </div>
        <span className="muted" style={{ fontSize: 13, fontWeight: 700 }}>{entry.libelle}</span>
      </div>
      <div className="card" style={{ overflow: 'hidden', marginBottom: 8 }}>
        <table className="tbl">
          <thead><tr><th>Compte</th><th>Tiers</th><th>Libellé</th><th className="num">Débit</th><th className="num">Crédit</th></tr></thead>
          <tbody>
            {entry.lines.map((l, i) => {
              const c = SX.compteByNum[l.compte]; const ti = l.tiers ? SX.tiersByCode[l.tiers] : null;
              return (
                <tr key={i}>
                  <td><span className="col-code" style={{ color: 'var(--primary)' }}>{l.compte}</span> <span className="muted" style={{ fontSize: 12.5 }}>{c?.libelle}</span></td>
                  <td>{ti ? <span style={{ fontWeight: 700 }}>{ti.raison_sociale}</span> : <span className="muted">—</span>}</td>
                  <td className="muted">{l.libelle || '—'}</td>
                  <td className="num">{l.debit ? <span className="amount">{SX.fmt(l.debit)}</span> : <span className="muted">—</span>}</td>
                  <td className="num">{l.credit ? <span className="amount">{SX.fmt(l.credit)}</span> : <span className="muted">—</span>}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot><tr><td colSpan={3}>Totaux</td><td className="num">{SX.fmt(t.debit)}</td><td className="num">{SX.fmt(t.credit)}</td></tr></tfoot>
        </table>
      </div>
      <div className="modal-foot" style={{ padding: '12px 0 0' }}>
        {!validee && <button className="btn btn-danger" onClick={() => onDelete(entry)}><Icon name="trash" /> Supprimer</button>}
        <div style={{ flex: 1 }} />
        {!validee && <button className="btn btn-outline" onClick={() => onEdit(entry)}><Icon name="edit" /> Modifier</button>}
        {!validee && <button className="btn btn-success" onClick={() => onValidate(entry)}><Icon name="check" /> Valider</button>}
        {validee && <button className="btn btn-outline" onClick={() => onExtourne(entry)}><Icon name="swap" /> Extourner</button>}
      </div>
    </Modal>
  );
}

/* ---- main list ---- */
function Ecritures({ data, setData, entries, magasin, exercice, onNav, params }) {
  const [filterJournal, setFilterJournal] = useState('');
  const [filterStatut, setFilterStatut] = useState(params?.filter || '');
  const [q, setQ] = useState('');
  const [formEntry, setFormEntry] = useState(undefined); // undefined=closed, null=new, obj=edit
  const [detail, setDetail] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const toast = useToast();

  useEffect(() => {
    if (params?.create) setFormEntry(null);
    if (params?.open) { const e = entries.find(x => x.id === params.open); if (e) setDetail(e); }
    if (params?.filter) setFilterStatut(params.filter);
  }, [params]);

  const filtered = entries.filter(e =>
    (!filterJournal || e.journal === filterJournal) &&
    (!filterStatut || e.statut === filterStatut) &&
    (!q || (e.ref + ' ' + e.libelle).toLowerCase().includes(q.toLowerCase()))
  ).sort((a, b) => b.date.localeCompare(a.date) || (b.ref || '').localeCompare(a.ref || ''));

  function nextRef(journal) {
    const seq = data.filter(e => e.magasin === magasin.id && e.journal === journal && e.ref).length + 1;
    return `${journal}-${exercice.libelle}-${String(seq).padStart(4, '0')}`;
  }
  function nextId() { return Math.max(0, ...data.map(e => e.id)) + 1; }

  function saveNew(payload) {
    const id = nextId();
    const ref = payload.statut === 'validee' ? nextRef(payload.journal) : '';
    setData(d => [...d, { ...payload, id, magasin: magasin.id, ref, validee_at: payload.statut === 'validee' ? '2026-06-10 10:00' : null }]);
    setFormEntry(undefined);
    toast(payload.statut === 'validee' ? 'Écriture validée ✓' : 'Brouillon enregistré');
  }
  function saveEdit(orig, payload) {
    const ref = payload.statut === 'validee' ? (orig.ref || nextRef(payload.journal)) : orig.ref;
    setData(d => d.map(e => e.id === orig.id ? { ...e, ...payload, ref, validee_at: payload.statut === 'validee' ? '2026-06-10 10:00' : e.validee_at } : e));
    setFormEntry(undefined); setDetail(null);
    toast(payload.statut === 'validee' ? 'Écriture validée ✓' : 'Modifications enregistrées');
  }
  function validateExisting(e) {
    const t = SX.entryTotals(e);
    if (!t.balanced) { toast('Écriture déséquilibrée — validation refusée.', 'err'); return; }
    const ref = e.ref || nextRef(e.journal);
    setData(d => d.map(x => x.id === e.id ? { ...x, statut: 'validee', ref, validee_at: '2026-06-10 10:00' } : x));
    setDetail(null);
    toast('Écriture validée ✓');
  }
  function doDelete(e) {
    setData(d => d.filter(x => x.id !== e.id));
    setDetail(null); setConfirm(null);
    toast('Brouillon supprimé');
  }
  function doExtourne(e) {
    const id = nextId();
    const ref = nextRef(e.journal);
    const rev = { id, magasin: magasin.id, journal: e.journal, date: '2026-06-10',
      libelle: `Extourne de ${e.ref}`, statut: 'validee', validee_at: '2026-06-10 10:00', reversal_of_id: e.id,
      lines: e.lines.map(l => ({ compte: l.compte, tiers: l.tiers, libelle: l.libelle, debit: l.credit, credit: l.debit, echeance: null, lettrage: null })),
      ref };
    setData(d => [...d, rev]);
    setDetail(null);
    toast('Écriture d\u2019extourne créée ✓', 'info');
  }

  const counts = {
    all: entries.length,
    validee: entries.filter(e => e.statut === 'validee').length,
    brouillon: entries.filter(e => e.statut === 'brouillon').length,
  };

  // ---- synthèses dérivées ----
  const totalDebit = entries.filter(e => e.statut === 'validee').reduce((s, e) => s + SX.entryTotals(e).debit, 0);
  const lastEntry = [...entries].filter(e => e.statut === 'validee').sort((a, b) => b.date.localeCompare(a.date))[0];
  const jrnBars = SX.journaux
    .map(j => ({ j, n: entries.filter(e => e.journal === j.code).length, mt: entries.filter(e => e.journal === j.code).reduce((s, e) => s + SX.entryTotals(e).debit, 0) }))
    .filter(x => x.n > 0)
    .sort((a, b) => b.mt - a.mt)
    .map(x => ({ label: `${x.j.code} — ${x.j.libelle}`, value: x.mt, color: 'var(--primary)', sub: `${x.n} écriture${x.n>1?'s':''}`, onClick: () => setFilterJournal(x.j.code) }));
  const MO = ['01','02','03','04','05','06'];
  const MO_LBL = ['Jan','Fév','Mar','Avr','Mai','Juin'];
  const moisData = MO.map((m, i) => ({ label: MO_LBL[i], value: entries.filter(e => e.statut === 'validee' && e.date.slice(5,7) === m).length }));

  return (
    <div className="page page-wide">
      <PageHead title="Écritures comptables" desc={`Saisie manuelle en partie double — ${magasin.libelle}, exercice ${exercice.libelle}.`}>
        <button className="btn btn-primary" onClick={() => setFormEntry(null)}><Icon name="plus" /> Nouvelle écriture</button>
      </PageHead>

      <div className="grid-kpi" style={{ marginBottom: 16 }}>
        <Kpi label="Écritures validées" value={counts.validee} icon="checkCircle" tone="green"
          foot="Pièces immuables" footIcon="lock" />
        <Kpi label="En brouillon" value={counts.brouillon} icon="pen" tone={counts.brouillon ? 'amber' : 'neutral'}
          foot={counts.brouillon ? 'À compléter et valider' : 'Rien en attente'} footIcon="edit" />
        <Kpi label="Total mouvementé" value={SX.fmt(totalDebit)} cur="FCFA" icon="coins" tone="orange"
          foot="Cumul débit validé" footIcon="activity" />
        <Kpi label="Dernière écriture" value={lastEntry ? SX.fmtDate(lastEntry.date) : '—'} icon="clock" tone="blue"
          foot={lastEntry ? lastEntry.ref : 'Aucune'} footIcon="receipt" />
      </div>

      <div className="ins-grid">
        <Panel title="Répartition par journal" sub="Volume mouvementé — cliquez pour filtrer la liste"
          right={<Badge tone="neutral">{jrnBars.length} journ{jrnBars.length>1?'aux':'al'}</Badge>}>
          <BarList items={jrnBars} empty="Aucune écriture à répartir." />
        </Panel>
        <Panel title="Activité mensuelle" sub={`Écritures validées — exercice ${exercice.libelle}`}
          right={<Badge tone="primary">{counts.validee} au total</Badge>}>
          <MiniBarChart data={moisData} fmtVal={(v) => String(v)} />
        </Panel>
      </div>

      {/* filter bar */}
      <div className="card card-pad" style={{ marginBottom: 16, padding: 14 }}>
        <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
          <div className="segment">
            {[['', 'Toutes', counts.all], ['validee', 'Validées', counts.validee], ['brouillon', 'Brouillons', counts.brouillon]].map(([v, lbl, n]) => (
              <button key={v} className={filterStatut === v ? 'active' : ''} onClick={() => setFilterStatut(v)}>{lbl} <span style={{ opacity: .6 }}>· {n}</span></button>
            ))}
          </div>
          <select className="select" style={{ width: 200 }} value={filterJournal} onChange={e => setFilterJournal(e.target.value)}>
            <option value="">Tous les journaux</option>
            {SX.journaux.map(j => <option key={j.code} value={j.code}>{j.code} — {j.libelle}</option>)}
          </select>
          <div className="search" style={{ flex: 1, minWidth: 200 }}>
            <Icon name="search" /><input className="input" value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher une référence, un libellé…" />
          </div>
        </div>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <Empty icon="pen" title="Aucune écriture">Aucune écriture ne correspond à ces filtres. Créez-en une nouvelle pour commencer.</Empty>
        ) : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr>
                <th>Référence</th><th>Date</th><th>Libellé</th><th>Journal</th>
                <th className="num">Débit</th><th className="num">Crédit</th><th>Statut</th><th></th>
              </tr></thead>
              <tbody>
                {filtered.map(e => {
                  const t = SX.entryTotals(e);
                  return (
                    <tr key={e.id} className="clickable" onClick={() => setDetail(e)}>
                      <td className="col-code">{e.ref || <span className="muted">— brouillon —</span>}</td>
                      <td className="muted" style={{ whiteSpace: 'nowrap' }}>{SX.fmtDate(e.date)}</td>
                      <td style={{ maxWidth: 320 }}>{e.libelle}</td>
                      <td><Badge tone="neutral">{e.journal}</Badge></td>
                      <td className="num"><span className="amount">{SX.fmt(t.debit)}</span></td>
                      <td className="num"><span className="amount">{SX.fmt(t.credit)}</span></td>
                      <td><StatutBadge statut={e.statut} /></td>
                      <td onClick={ev => ev.stopPropagation()}>
                        <Dropdown align="right" width={190} trigger={<button className="btn btn-ghost btn-icon btn-sm"><Icon name="dots" /></button>}>
                          <button className="menu-item" onClick={() => setDetail(e)}><Icon name="eye" /> Détail</button>
                          {e.statut === 'brouillon' && <button className="menu-item" onClick={() => setFormEntry(e)}><Icon name="edit" /> Modifier</button>}
                          {e.statut === 'brouillon' && <button className="menu-item" onClick={() => validateExisting(e)}><Icon name="check" /> Valider</button>}
                          {e.statut === 'validee' && <button className="menu-item" onClick={() => doExtourne(e)}><Icon name="swap" /> Extourner</button>}
                          {e.statut === 'brouillon' && <><div className="menu-sep" /><button className="menu-item danger" onClick={() => setConfirm(e)}><Icon name="trash" /> Supprimer</button></>}
                        </Dropdown>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {formEntry !== undefined && (
        <EcritureForm entry={formEntry} magasin={magasin} exercice={exercice}
          onClose={() => setFormEntry(undefined)}
          onSave={p => formEntry ? saveEdit(formEntry, p) : saveNew(p)}
          onValidate={p => formEntry ? saveEdit(formEntry, p) : saveNew(p)} />
      )}
      {detail && (
        <EcritureDetail entry={detail} magasin={magasin} exercice={exercice}
          onClose={() => setDetail(null)} onEdit={e => { setDetail(null); setFormEntry(e); }}
          onValidate={validateExisting} onExtourne={doExtourne} onDelete={e => setConfirm(e)} />
      )}
      {confirm && (
        <ConfirmDialog title="Supprimer le brouillon ?" tone="danger" icon="trash" confirmLabel="Supprimer"
          message={`L'écriture « ${confirm.libelle} » sera définitivement supprimée. Les écritures validées, elles, ne peuvent pas être supprimées.`}
          onConfirm={() => doDelete(confirm)} onClose={() => setConfirm(null)} />
      )}
    </div>
  );
}
window.Ecritures = Ecritures;
