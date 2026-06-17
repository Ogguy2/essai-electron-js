/* SICONEX — Référentiel : Plan comptable, Tiers, Journaux, Exercices */

/* ============================================================
   PLAN COMPTABLE
   ============================================================ */
function PlanComptable({ entries, magasin }) {
  const [q, setQ] = useState('');
  const [classe, setClasse] = useState('');
  const [collapsed, setCollapsed] = useState({});
  const [showNew, setShowNew] = useState(false);
  const toast = useToast();

  const rows = SX.comptes.map(c => {
    const s = CALC.soldeCompte(entries, c.numero);
    return { ...c, debit: s.debit, credit: s.credit, solde: s.solde };
  }).filter(c =>
    (!classe || c.classe === +classe) &&
    (!q || (c.numero + ' ' + c.libelle).toLowerCase().includes(q.toLowerCase()))
  );

  const byClasse = {};
  rows.forEach(c => { (byClasse[c.classe] = byClasse[c.classe] || []).push(c); });
  const classeKeys = Object.keys(byClasse).sort();

  return (
    <div className="page page-wide">
      <PageHead title="Plan comptable" desc={`Référentiel SYSCOHADA — ${SX.comptes.length} comptes chargés automatiquement pour ${magasin.libelle}.`}>
        <button className="btn btn-outline" onClick={() => toast('Plan SYSCOHADA déjà chargé pour ce magasin', 'info')}><Icon name="refresh" /> Recharger SYSCOHADA</button>
        <button className="btn btn-primary" onClick={() => setShowNew(true)}><Icon name="plus" /> Nouveau compte</button>
      </PageHead>

      <div className="card card-pad" style={{ marginBottom: 16, padding: 14 }}>
        <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
          <div className="search" style={{ flex: 1, minWidth: 220 }}>
            <Icon name="search" /><input className="input" value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher par numéro ou intitulé…" />
          </div>
          <select className="select" style={{ width: 240 }} value={classe} onChange={e => setClasse(e.target.value)}>
            <option value="">Toutes les classes</option>
            {Object.entries(SX.classes).map(([k, v]) => <option key={k} value={k}>Classe {k} — {v}</option>)}
          </select>
        </div>
      </div>

      <div className="stack">
        {classeKeys.length === 0 && <div className="card"><Empty icon="book" title="Aucun compte">Modifiez votre recherche.</Empty></div>}
        {classeKeys.map(k => {
          const list = byClasse[k];
          const tot = list.reduce((a, c) => ({ d: a.d + c.debit, c: a.c + c.credit }), { d: 0, c: 0 });
          const isCol = collapsed[k];
          return (
            <div className="card" key={k} style={{ overflow: 'hidden' }}>
              <button className="pc-classe" onClick={() => setCollapsed(s => ({ ...s, [k]: !s[k] }))}>
                <Icon name={isCol ? 'chevRight' : 'chevDown'} size={17} />
                <span className="pc-classe-num">{k}</span>
                <span className="pc-classe-lbl">{SX.classes[k]}</span>
                <span className="muted" style={{ fontSize: 12.5, fontWeight: 700 }}>{list.length} compte{list.length>1?'s':''}</span>
                <div style={{ flex: 1 }} />
                <span className="amount" style={{ fontSize: 13 }}>{SX.fmt(tot.d)}</span>
                <span className="amount muted" style={{ fontSize: 13, width: 110, textAlign: 'right' }}>{SX.fmt(tot.c)}</span>
              </button>
              {!isCol && (
                <table className="tbl">
                  <thead><tr>
                    <th style={{ width: 110 }}>Numéro</th><th>Intitulé</th><th>Attributs</th>
                    <th className="num">Mvt débit</th><th className="num">Mvt crédit</th><th className="num">Solde</th>
                  </tr></thead>
                  <tbody>
                    {list.map(c => (
                      <tr key={c.numero}>
                        <td className="col-code" style={{ color: 'var(--primary)' }}>{c.numero}</td>
                        <td style={{ fontWeight: 700 }}>{c.libelle}</td>
                        <td><div className="row" style={{ gap: 6 }}>
                          {c.collectif && <Badge tone="primary">Collectif</Badge>}
                          {c.lettrable && <Badge tone="info">Lettrable</Badge>}
                          {!c.collectif && !c.lettrable && <span className="muted">—</span>}
                        </div></td>
                        <td className="num">{c.debit ? <span className="amount">{SX.fmt(c.debit)}</span> : <span className="muted">—</span>}</td>
                        <td className="num">{c.credit ? <span className="amount">{SX.fmt(c.credit)}</span> : <span className="muted">—</span>}</td>
                        <td className="num"><Amount value={c.solde} signed /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          );
        })}
      </div>

      {showNew && <CompteForm onClose={() => setShowNew(false)} onSave={() => { setShowNew(false); toast('Compte créé ✓'); }} />}
    </div>
  );
}

function CompteForm({ onClose, onSave }) {
  const [numero, setNumero] = useState('');
  const [libelle, setLibelle] = useState('');
  const [classe, setClasse] = useState('6');
  const [collectif, setCollectif] = useState(false);
  const [lettrable, setLettrable] = useState(false);
  return (
    <Modal title="Nouveau compte" icon="book" eyebrow="Plan comptable" sub="Ajouter un compte au plan comptable du magasin" onClose={onClose}
      footer={<>
        <button className="btn btn-outline" onClick={onClose}>Annuler</button>
        <button className="btn btn-primary" disabled={!numero || !libelle} onClick={onSave}><Icon name="save" /> Créer</button>
      </>}>
      <div className="stack" style={{ gap: 14, paddingBottom: 8 }}>
        <div className="grid-2" style={{ gap: 14 }}>
          <div className="field"><label className="label">Numéro</label><input className="input font-mono" value={numero} onChange={e => setNumero(e.target.value)} placeholder="ex. 6181" /></div>
          <div className="field"><label className="label">Classe</label>
            <select className="select" value={classe} onChange={e => setClasse(e.target.value)}>
              {Object.entries(SX.classes).map(([k, v]) => <option key={k} value={k}>Classe {k}</option>)}
            </select>
          </div>
        </div>
        <div className="field"><label className="label">Intitulé</label><input className="input" value={libelle} onChange={e => setLibelle(e.target.value)} placeholder="ex. Transport sur achats" /></div>
        <div className="row" style={{ gap: 20 }}>
          <label className="row gap-sm" style={{ cursor: 'pointer' }}><input type="checkbox" className="checkbox" checked={collectif} onChange={e => setCollectif(e.target.checked)} /> <span style={{ fontWeight: 700, fontSize: 13.5 }}>Compte collectif</span></label>
          <label className="row gap-sm" style={{ cursor: 'pointer' }}><input type="checkbox" className="checkbox" checked={lettrable} onChange={e => setLettrable(e.target.checked)} /> <span style={{ fontWeight: 700, fontSize: 13.5 }}>Lettrable</span></label>
        </div>
      </div>
    </Modal>
  );
}

/* ============================================================
   TIERS
   ============================================================ */
function TiersModule({ entries, magasin, onNav }) {
  const [tab, setTab] = useState('tous');
  const [q, setQ] = useState('');
  const [detail, setDetail] = useState(null);

  const list = SX.tiers.filter(t =>
    (tab === 'tous' || (tab === 'clients' && t.est_client) || (tab === 'fournisseurs' && t.est_fournisseur)) &&
    (!q || (t.code + ' ' + t.raison_sociale).toLowerCase().includes(q.toLowerCase()))
  );
  const allLines = CALC.lines(entries, {});
  const tiersSolde = (t) => {
    let s = 0;
    allLines.forEach(l => { if (l.tiers === t.code) s += (+l.debit||0) - (+l.credit||0); });
    return s;
  };

  // ---- synthèses dérivées des écritures réelles ----
  const creances = CALC.soldeCompte(entries, '4111').solde;
  const dettes = -CALC.soldeCompte(entries, '4011').solde;
  const ech = CALC.echeancier(entries);
  const enRetard = ech.filter(e => e.bucket !== 'non_echu').reduce((s, e) => s + e.montant, 0);
  const nbClients = SX.tiers.filter(t => t.est_client).length;
  const nbFourn = SX.tiers.filter(t => t.est_fournisseur).length;
  const nbBloque = SX.tiers.filter(t => t.bloque).length;

  const encours = SX.tiers.map(t => ({ t, solde: tiersSolde(t) }))
    .filter(x => Math.abs(x.solde) > 0)
    .sort((a, b) => Math.abs(b.solde) - Math.abs(a.solde));
  const topEncours = encours.slice(0, 6).map(x => ({
    label: x.t.raison_sociale,
    value: Math.abs(x.solde),
    avatar: x.t.raison_sociale.slice(0, 1),
    color: x.t.est_client ? 'var(--success)' : 'var(--primary)',
    sub: `${x.t.code} · ${x.t.est_client ? 'Créance client' : 'Dette fournisseur'}`,
    onClick: () => setDetail(x.t),
  }));

  const plafonds = SX.tiers
    .filter(t => t.est_client && t.plafond_credit)
    .map(t => ({ t, solde: tiersSolde(t), util: tiersSolde(t) / t.plafond_credit }))
    .sort((a, b) => b.util - a.util);

  return (
    <div className="page page-wide">
      <PageHead title="Tiers" desc="Clients et fournisseurs — rattachés aux comptes collectifs 4111 et 4011.">
        <button className="btn btn-primary"><Icon name="plus" /> Nouveau tiers</button>
      </PageHead>

      <div className="grid-kpi" style={{ marginBottom: 16 }}>
        <Kpi label="Tiers actifs" value={SX.tiers.length} icon="users" tone="blue"
          foot={`${nbClients} client${nbClients>1?'s':''} · ${nbFourn} fournisseur${nbFourn>1?'s':''}`} footIcon="list" />
        <Kpi label="Créances clients" value={SX.fmt(creances)} cur="FCFA" icon="arrowDown" tone="green"
          foot="Encours compte 4111" footIcon="receipt" />
        <Kpi label="Dettes fournisseurs" value={SX.fmt(dettes)} cur="FCFA" icon="arrowUp" tone="orange"
          foot="Encours compte 4011" footIcon="receipt" />
        <Kpi label="Échéances en retard" value={SX.fmt(enRetard)} cur="FCFA" icon="alert"
          tone={enRetard > 0 ? 'red' : 'neutral'}
          foot={enRetard > 0 ? 'À relancer' : 'Rien en retard'} footIcon="clock"
          footTone={enRetard > 0 ? 'destructive' : null} />
      </div>

      <div className="ins-grid">
        <Panel title="Top encours par tiers" sub="Soldes auxiliaires les plus élevés — cliquez pour le détail"
          right={<Badge tone="neutral">{encours.length} mouvementé{encours.length>1?'s':''}</Badge>}>
          <BarList items={topEncours} empty="Aucun encours sur la période." />
        </Panel>
        <div className="stack">
          <Panel title="Balance âgée" sub={`${ech.length} échéance${ech.length>1?'s':''} non lettrée${ech.length>1?'s':''}`}
            right={enRetard > 0 ? <Badge tone="danger">{SX.fmt(enRetard)} en retard</Badge> : <Badge tone="success">À jour</Badge>}>
            <AgedBalance rows={ech} />
          </Panel>
          {plafonds.length > 0 && (
            <Panel title="Plafonds de crédit clients" sub="Taux d'utilisation de l'encours autorisé">
              <div className="stack" style={{ gap: 13 }}>
                {plafonds.map(({ t, solde, util }) => {
                  const over = util > 1, warn = util > 0.8;
                  const col = over ? 'var(--destructive)' : warn ? 'var(--warning)' : 'var(--success)';
                  return (
                    <div key={t.code} className="hbar-row">
                      <div className="hbar-head">
                        <span className="hbar-lbl"><span className="hbar-name">{t.raison_sociale}</span>
                          {over && <Badge tone="danger">Dépassé</Badge>}{t.bloque && <Badge tone="neutral">Bloqué</Badge>}</span>
                        <span className="hbar-val muted" style={{ fontWeight: 800 }}>{Math.round(util*100)}%</span>
                      </div>
                      <div className="bar"><span style={{ width: `${Math.min(Math.max(util,0),1)*100}%`, background: col }} /></div>
                      <div className="hbar-sub">{SX.fmt(solde)} / {SX.fmt(t.plafond_credit)} FCFA</div>
                    </div>
                  );
                })}
              </div>
            </Panel>
          )}
        </div>
      </div>

      <div className="tabs" style={{ marginBottom: 16 }}>
        {[['tous','Tous',SX.tiers.length],['clients','Clients',SX.tiers.filter(t=>t.est_client).length],['fournisseurs','Fournisseurs',SX.tiers.filter(t=>t.est_fournisseur).length]].map(([v,lbl,n]) => (
          <button key={v} className={`tab ${tab===v?'active':''}`} onClick={() => setTab(v)}>{lbl} <span className="muted">· {n}</span></button>
        ))}
      </div>

      <div className="card card-pad" style={{ marginBottom: 16, padding: 14 }}>
        <div className="search"><Icon name="search" /><input className="input" value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher un code ou une raison sociale…" /></div>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        <table className="tbl">
          <thead><tr>
            <th style={{ width: 90 }}>Code</th><th>Raison sociale</th><th>Type</th><th>Téléphone</th>
            <th className="num">Plafond crédit</th><th className="num">Solde</th><th></th>
          </tr></thead>
          <tbody>
            {list.map(t => {
              const solde = tiersSolde(t);
              return (
                <tr key={t.code} className="clickable" onClick={() => setDetail(t)}>
                  <td className="col-code" style={{ color: 'var(--primary)' }}>{t.code}</td>
                  <td><div className="row" style={{ gap: 10 }}>
                    <span className="avatar" style={{ width: 30, height: 30, fontSize: 12, background: t.est_client ? 'var(--success)' : 'var(--primary)' }}>{t.raison_sociale.slice(0,1)}</span>
                    <span style={{ fontWeight: 700 }}>{t.raison_sociale}</span>
                    {t.bloque && <Badge tone="danger">Bloqué</Badge>}
                  </div></td>
                  <td><div className="row" style={{ gap: 5 }}>
                    {t.est_client && <Badge tone="success">Client</Badge>}
                    {t.est_fournisseur && <Badge tone="primary">Fournisseur</Badge>}
                  </div></td>
                  <td className="muted">{t.telephone}</td>
                  <td className="num">{t.plafond_credit ? (
                    <div className="util-cell">
                      <span className="amount">{SX.fmt(t.plafond_credit)}</span>
                      {(() => {
                        const u = t.plafond_credit ? solde / t.plafond_credit : 0;
                        const over = u > 1, warn = u > 0.8;
                        const col = over ? 'var(--destructive)' : warn ? 'var(--warning)' : 'var(--success)';
                        return <div className="bar util-bar"><span style={{ width: `${Math.min(Math.max(u,0),1)*100}%`, background: col }} /></div>;
                      })()}
                    </div>
                  ) : <span className="muted">—</span>}</td>
                  <td className="num"><Amount value={solde} signed /></td>
                  <td onClick={e => e.stopPropagation()}><button className="btn btn-ghost btn-icon btn-sm" onClick={() => setDetail(t)}><Icon name="chevRight" /></button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {detail && <TiersDetail tiers={detail} entries={entries} onClose={() => setDetail(null)} onNav={onNav} />}
    </div>
  );
}

function TiersDetail({ tiers, entries, onClose, onNav }) {
  const mvts = CALC.grandLivre(entries, { tiers: tiers.code });
  const solde = mvts.length ? mvts[mvts.length-1].solde_progressif : 0;
  return (
    <Modal title={tiers.raison_sociale} icon="users" tone={tiers.est_client ? 'success' : 'primary'} eyebrow={`Tiers ${tiers.code}`} sub={`${tiers.code} · ${tiers.est_client ? 'Client' : ''}${tiers.est_client&&tiers.est_fournisseur?' & ':''}${tiers.est_fournisseur ? 'Fournisseur' : ''}`} maxWidth={720} onClose={onClose}
      footer={<>
        <button className="btn btn-outline" onClick={onClose}>Fermer</button>
        <button className="btn btn-primary" onClick={() => { onClose(); onNav('etats', { tab: 'grand-livre-aux', tiers: tiers.code }); }}><Icon name="ledger" /> Grand livre auxiliaire</button>
      </>}>
      <div className="grid-3" style={{ gap: 12, marginBottom: 16 }}>
        <div className="ts-box"><span className="ts-l">Solde courant</span><Amount value={solde} signed className="ts-v" /></div>
        <div className="ts-box"><span className="ts-l">Plafond crédit</span><span className="ts-v amount">{tiers.plafond_credit ? SX.fmt(tiers.plafond_credit) : '—'}</span></div>
        <div className="ts-box"><span className="ts-l">Mouvements</span><span className="ts-v">{mvts.length}</span></div>
      </div>
      <div className="ts-info">
        <div><span className="muted">Téléphone</span><b>{tiers.telephone || '—'}</b></div>
        <div><span className="muted">Adresse</span><b>{tiers.adresse || '—'}</b></div>
        <div><span className="muted">RCCM</span><b>{tiers.registre_commerce || '—'}</b></div>
        <div><span className="muted">Compte collectif</span><b className="font-mono" style={{ color: 'var(--primary)' }}>{tiers.est_client ? '4111' : '4011'}</b></div>
      </div>
      <div className="card" style={{ overflow: 'hidden', marginTop: 4 }}>
        <table className="tbl">
          <thead><tr><th>Date</th><th>Pièce</th><th>Libellé</th><th className="num">Débit</th><th className="num">Crédit</th><th>Let.</th></tr></thead>
          <tbody>
            {mvts.length === 0 && <tr><td colSpan={6}><div className="muted" style={{ padding: 14, textAlign: 'center', fontWeight: 600 }}>Aucun mouvement.</div></td></tr>}
            {mvts.map((l, i) => (
              <tr key={i}>
                <td className="muted" style={{ whiteSpace: 'nowrap' }}>{SX.fmtDate(l.date)}</td>
                <td className="col-code">{l.ref}</td>
                <td className="muted">{l.libelle}</td>
                <td className="num">{l.debit ? <span className="amount">{SX.fmt(l.debit)}</span> : '—'}</td>
                <td className="num">{l.credit ? <span className="amount">{SX.fmt(l.credit)}</span> : '—'}</td>
                <td>{l.lettrage ? <Badge tone="success">{l.lettrage}</Badge> : <span className="muted">—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}

/* ============================================================
   JOURNAUX
   ============================================================ */
function Journaux({ entries, magasin }) {
  const [edit, setEdit] = useState(undefined);
  const [detail, setDetail] = useState(null);
  const toast = useToast();
  const count = (code) => entries.filter(e => e.journal === code).length;
  const typeLabel = (t) => SX.JOURNAL_TYPES.find(x => x.code === t)?.libelle || t;
  const jrnMontant = (code) => entries.filter(e => e.journal === code).reduce((s, e) => s + SX.entryTotals(e).debit, 0);
  const maxCount = Math.max(1, ...SX.journaux.map(j => count(j.code)));
  const totalMvt = SX.journaux.reduce((s, j) => s + jrnMontant(j.code), 0);
  const actifs = SX.journaux.filter(j => j.active).length;
  const mostActive = [...SX.journaux].sort((a, b) => count(b.code) - count(a.code))[0];

  return (
    <div className="page">
      <PageHead title="Journaux" desc="Registres de classement des écritures par nature d'opération.">
        <button className="btn btn-primary" onClick={() => setEdit(null)}><Icon name="plus" /> Nouveau journal</button>
      </PageHead>
      <div className="grid-kpi" style={{ marginBottom: 18 }}>
        <Kpi label="Journaux actifs" value={`${actifs} / ${SX.journaux.length}`} icon="journal" tone="blue"
          foot="Registres ouverts à la saisie" footIcon="check" />
        <Kpi label="Écritures classées" value={entries.length} icon="receipt" tone="green"
          foot="Toutes pièces confondues" footIcon="list" />
        <Kpi label="Total mouvementé" value={SX.fmt(totalMvt)} cur="FCFA" icon="coins" tone="orange"
          foot="Cumul débit des journaux" footIcon="activity" />
        <Kpi label="Journal le plus actif" value={mostActive.code} icon="trendUp"
          foot={`${count(mostActive.code)} écriture${count(mostActive.code)>1?'s':''} · ${mostActive.libelle}`} footIcon="chart" />
      </div>
      <div className="grid-2" style={{ gap: 14 }}>
        {SX.journaux.map(j => (
          <div className="card jrn clickable" key={j.code} onClick={() => setDetail(j)} title={`Voir les écritures du journal ${j.code}`}>
            <div className="row" style={{ gap: 12 }}>
              <span className="kpi-ic ic-soft-orange" style={{ width: 44, height: 44 }}><Icon name="journal" /></span>
              <div style={{ flex: 1 }}>
                <div className="row" style={{ gap: 8 }}><span className="jrn-code">{j.code}</span>{!j.active && <Badge tone="neutral">Inactif</Badge>}{j.code === 'AN' && <Badge tone="info">Automatique</Badge>}</div>
                <div className="jrn-lbl">{j.libelle}</div>
                <div className="muted" style={{ fontSize: 12.5, fontWeight: 700, marginTop: 2 }}>{typeLabel(j.type)} · {count(j.code)} écriture{count(j.code)>1?'s':''}</div>
              </div>
              <div className="row" style={{ gap: 2 }} onClick={e => e.stopPropagation()}>
                <Dropdown align="right" width={170} trigger={<button className="btn btn-ghost btn-icon btn-sm"><Icon name="dots" /></button>}>
                  <button className="menu-item" onClick={() => setDetail(j)}><Icon name="eye" /> Voir les écritures</button>
                  <button className="menu-item" onClick={() => setEdit(j)}><Icon name="edit" /> Modifier</button>
                  <div className="menu-sep" />
                  <button className="menu-item danger" onClick={() => toast('Suppression simulée', 'info')}><Icon name="trash" /> Supprimer</button>
                </Dropdown>
                <Icon name="chevRight" size={18} style={{ color: 'var(--muted-foreground)' }} />
              </div>
            </div>
            <div className="jrn-vol">
              <div className="jrn-vol-head"><span>Volume mouvementé</span><b className="amount">{SX.fmt(jrnMontant(j.code))} FCFA</b></div>
              <div className="bar"><span style={{ width: `${(count(j.code)/maxCount)*100}%`, background: 'linear-gradient(90deg, var(--primary), oklch(0.72 0.085 248))' }} /></div>
            </div>
          </div>
        ))}
      </div>
      {detail && <JournalDetail journal={detail} entries={entries} count={count} typeLabel={typeLabel} onClose={() => setDetail(null)} onEdit={() => { const j = detail; setDetail(null); setEdit(j); }} />}
      {edit !== undefined && <JournalForm journal={edit} onClose={() => setEdit(undefined)} onSave={() => { setEdit(undefined); toast('Journal enregistré ✓'); }} />}
    </div>
  );
}

function JournalDetail({ journal, entries, count, typeLabel, onClose, onEdit }) {
  const list = entries.filter(e => e.journal === journal.code)
    .sort((a, b) => b.date.localeCompare(a.date) || (b.ref || '').localeCompare(a.ref || ''));
  const tot = list.reduce((a, e) => { const t = SX.entryTotals(e); return { d: a.d + t.debit, c: a.c + t.credit }; }, { d: 0, c: 0 });
  return (
    <Modal title={`${journal.code} — ${journal.libelle}`} icon="journal" eyebrow={`Journal · ${typeLabel(journal.type)}`}
      sub={`${list.length} écriture${list.length > 1 ? 's' : ''} dans ce journal`} maxWidth={760} onClose={onClose}
      footer={<>
        <span className="modal-foot-meta"><Icon name="receipt" size={14} /> Total mouvementé : <b className="amount" style={{ color: 'var(--foreground)' }}>{SX.fmt(tot.d)} FCFA</b></span>
        <button className="btn btn-outline" onClick={onClose}>Fermer</button>
        {journal.code !== 'AN' && <button className="btn btn-primary" onClick={onEdit}><Icon name="edit" /> Modifier le journal</button>}
      </>}>
      {list.length === 0 ? (
        <Empty icon="receipt" title="Aucune écriture">Ce journal ne contient encore aucune écriture.</Empty>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <table className="tbl">
            <thead><tr><th>Référence</th><th>Date</th><th>Libellé</th><th className="num">Montant</th><th>Statut</th></tr></thead>
            <tbody>
              {list.map(e => {
                const t = SX.entryTotals(e);
                return (
                  <tr key={e.id}>
                    <td className="col-code" style={{ color: 'var(--primary)' }}>{e.ref || <span className="muted">brouillon</span>}</td>
                    <td className="muted" style={{ whiteSpace: 'nowrap' }}>{SX.fmtDate(e.date)}</td>
                    <td style={{ maxWidth: 280 }}>{e.libelle}</td>
                    <td className="num"><span className="amount">{SX.fmt(t.debit)}</span></td>
                    <td><StatutBadge statut={e.statut} /></td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot><tr><td colSpan={3}>Totaux</td><td className="num">{SX.fmt(tot.d)}</td><td></td></tr></tfoot>
          </table>
        </div>
      )}
    </Modal>
  );
}

function JournalForm({ journal, onClose, onSave }) {
  const [code, setCode] = useState(journal?.code || '');
  const [libelle, setLibelle] = useState(journal?.libelle || '');
  const [type, setType] = useState(journal?.type || 'VTE');
  const [active, setActive] = useState(journal ? journal.active : true);
  return (
    <Modal title={journal ? 'Modifier le journal' : 'Nouveau journal'} icon="journal" eyebrow="Journal" onClose={onClose}
      footer={<><button className="btn btn-outline" onClick={onClose}>Annuler</button><button className="btn btn-primary" disabled={!code||!libelle} onClick={onSave}><Icon name="save" /> Enregistrer</button></>}>
      <div className="stack" style={{ gap: 14, paddingBottom: 8 }}>
        <div className="grid-2" style={{ gap: 14 }}>
          <div className="field"><label className="label">Code</label><input className="input font-mono" value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="ex. VTE" maxLength={5} /></div>
          <div className="field"><label className="label">Type</label>
            <select className="select" value={type} onChange={e => setType(e.target.value)}>
              {SX.JOURNAL_TYPES.map(t => <option key={t.code} value={t.code}>{t.libelle}</option>)}
            </select>
          </div>
        </div>
        <div className="field"><label className="label">Libellé</label><input className="input" value={libelle} onChange={e => setLibelle(e.target.value)} placeholder="ex. Journal des ventes" /></div>
        <label className="row gap-sm" style={{ cursor: 'pointer' }}><input type="checkbox" className="checkbox" checked={active} onChange={e => setActive(e.target.checked)} /> <span style={{ fontWeight: 700, fontSize: 13.5 }}>Journal actif</span></label>
      </div>
    </Modal>
  );
}

/* ============================================================
   EXERCICES
   ============================================================ */
function Exercices({ entries, magasin }) {
  const [exs, setExs] = useState(SX.exercices);
  const [cloture, setCloture] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const toast = useToast();

  function doCloture(ex) {
    const next = exs.find(e => e.date_debut > ex.date_fin && e.statut === 'ouvert');
    if (!next) { toast('Créez d\u2019abord l\u2019exercice suivant ouvert.', 'err'); return; }
    setExs(list => list.map(e => e.id === ex.id ? { ...e, statut: 'cloture', clos_at: '2026-06-10 11:00', clos_par: 'admin' } : e));
    setCloture(null);
    toast(`Exercice ${ex.libelle} clôturé · à-nouveaux générés ✓`);
  }

  return (
    <div className="page">
      <PageHead title="Exercices" desc="Périodes fiscales — cadre temporel obligatoire de toute saisie.">
        <button className="btn btn-primary" onClick={() => setShowNew(true)}><Icon name="plus" /> Nouvel exercice</button>
      </PageHead>
      <div className="stack">
        {[...exs].sort((a,b) => b.libelle.localeCompare(a.libelle)).map(ex => {
          const nb = entries.filter(e => e.date >= ex.date_debut && e.date <= ex.date_fin).length;
          return (
            <div className="card exc" key={ex.id}>
              <div className="exc-year">{ex.libelle}</div>
              <div style={{ flex: 1 }}>
                <div className="row" style={{ gap: 9, marginBottom: 4 }}>
                  <StatutBadge statut={ex.statut} />
                  {ex.statut === 'ouvert' && <Badge tone="primary">Saisie active</Badge>}
                </div>
                <div className="muted" style={{ fontSize: 13.5, fontWeight: 700 }}>
                  Du {SX.fmtDate(ex.date_debut)} au {SX.fmtDate(ex.date_fin)} · {nb} écriture{nb>1?'s':''}
                  {ex.clos_at && ` · clôturé le ${SX.fmtDate(ex.clos_at)} par ${ex.clos_par}`}
                </div>
              </div>
              {ex.statut === 'ouvert'
                ? <button className="btn btn-outline" onClick={() => setCloture(ex)}><Icon name="lock" /> Clôturer</button>
                : <span className="badge badge-neutral" style={{ height: 30 }}><Icon name="lockClosed" size={13} /> Verrouillé</span>}
            </div>
          );
        })}
      </div>

      {cloture && <ClotureModal ex={cloture} exs={exs} entries={entries} onConfirm={() => doCloture(cloture)} onClose={() => setCloture(null)} />}
      {showNew && <ExerciceForm onClose={() => setShowNew(false)} onSave={(ex) => { setExs(l => [...l, ex]); setShowNew(false); toast('Exercice créé ✓'); }} exs={exs} />}
    </div>
  );
}

function ClotureModal({ ex, exs, entries, onConfirm, onClose }) {
  const next = exs.find(e => e.date_debut > ex.date_fin && e.statut === 'ouvert');
  const res = CALC.resultat(entries);
  return (
    <Modal title={`Clôturer l'exercice ${ex.libelle}`} icon="lock" tone="warning" eyebrow="Clôture annuelle" sub="Opération irréversible — transaction atomique" maxWidth={560} onClose={onClose}
      footer={<>
        <button className="btn btn-outline" onClick={onClose}>Annuler</button>
        <button className="btn btn-primary" disabled={!next} onClick={onConfirm}><Icon name="lock" /> Confirmer la clôture</button>
      </>}>
      {!next ? (
        <div className="ef-warn" style={{ marginBottom: 4 }}><Icon name="alert" size={15} /> Aucun exercice suivant ouvert. Créez l'exercice {parseInt(ex.libelle)+1} avant de clôturer.</div>
      ) : (
        <div className="row" style={{ gap: 9, marginBottom: 14, padding: '10px 12px', background: 'var(--accent)', borderRadius: 9 }}>
          <Icon name="info" size={16} style={{ color: 'var(--success)' }} /><span style={{ fontWeight: 700, fontSize: 13.5 }}>À-nouveaux reportés dans l'exercice {next.libelle}.</span>
        </div>
      )}
      <ol className="clo-steps">
        <li><b>Regroupement des comptes de gestion</b><span>Soldes des classes 6 & 7 transférés au compte de résultat 12, journal AN.</span></li>
        <li><b>Report des à-nouveaux</b><span>Soldes de bilan (classes 1 à 5) reportés dans l'exercice suivant.</span></li>
        <li><b>Verrouillage</b><span>L'exercice passe en « clôturé » — plus aucune écriture possible.</span></li>
      </ol>
      <div className="clo-result">
        <span>Résultat net de l'exercice</span>
        <b className={`amount ${res.resultat >= 0 ? 'amount-pos' : 'amount-neg'}`}>{SX.fmt(res.resultat)} FCFA — {res.resultat >= 0 ? 'Bénéfice' : 'Perte'}</b>
      </div>
    </Modal>
  );
}

function ExerciceForm({ onClose, onSave, exs }) {
  const [libelle, setLibelle] = useState('2027');
  const [debut, setDebut] = useState('2027-01-01');
  const [fin, setFin] = useState('2027-12-31');
  const valid = libelle && debut && fin && fin > debut && !exs.some(e => e.libelle === libelle);
  return (
    <Modal title="Nouvel exercice" icon="calendar" eyebrow="Période fiscale" onClose={onClose}
      footer={<><button className="btn btn-outline" onClick={onClose}>Annuler</button><button className="btn btn-primary" disabled={!valid} onClick={() => onSave({ id: Math.max(...exs.map(e=>e.id))+1, libelle, date_debut: debut, date_fin: fin, statut: 'ouvert', clos_at: null, clos_par: null })}><Icon name="save" /> Créer</button></>}>
      <div className="stack" style={{ gap: 14, paddingBottom: 8 }}>
        <div className="field"><label className="label">Libellé</label><input className="input" value={libelle} onChange={e => setLibelle(e.target.value)} placeholder="ex. 2027" /></div>
        <div className="grid-2" style={{ gap: 14 }}>
          <div className="field"><label className="label">Date de début</label><input type="date" className="input" value={debut} onChange={e => setDebut(e.target.value)} /></div>
          <div className="field"><label className="label">Date de fin</label><input type="date" className={`input ${fin && fin <= debut ? 'input-err' : ''}`} value={fin} onChange={e => setFin(e.target.value)} /></div>
        </div>
        {fin && fin <= debut && <div className="hint" style={{ color: 'var(--destructive)' }}>La date de fin doit être postérieure au début.</div>}
      </div>
    </Modal>
  );
}

Object.assign(window, { PlanComptable, TiersModule, Journaux, Exercices });

/* styles for this module */
(function () {
  const css = `
    .pc-classe { display: flex; align-items: center; gap: 12px; width: 100%; padding: 14px 18px; background: var(--secondary); border: none; text-align: left; }
    .pc-classe:hover { background: oklch(0.94 0.006 250); }
    .pc-classe-num { font-family: var(--font-display); font-weight: 600; font-size: 18px; color: var(--primary); width: 22px; }
    .pc-classe-lbl { font-weight: 800; font-size: 14px; }
    .ts-box { background: var(--secondary); border-radius: 10px; padding: 12px 14px; display: flex; flex-direction: column; gap: 5px; }
    .ts-l { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; color: var(--muted-foreground); }
    .ts-v { font-size: 18px; font-weight: 800; }
    .ts-info { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 24px; padding: 4px 2px 16px; }
    .ts-info > div { display: flex; flex-direction: column; gap: 2px; font-size: 13.5px; }
    .ts-info span { font-size: 11.5px; font-weight: 700; }
    .ts-info b { font-weight: 700; }
    .jrn { padding: 16px 18px; transition: border-color .14s, box-shadow .14s, transform .05s; }
    .jrn.clickable { cursor: pointer; }
    .jrn.clickable:hover { border-color: var(--border-strong); box-shadow: var(--shadow-md); }
    .jrn.clickable:active { transform: translateY(1px); }
    .jrn-code { font-family: var(--font-display); font-weight: 600; font-size: 18px; }
    .jrn-lbl { font-weight: 700; font-size: 14px; margin-top: 1px; }
    .exc { display: flex; align-items: center; gap: 18px; padding: 16px 20px; }
    .exc-year { font-family: var(--font-display); font-weight: 600; font-size: 30px; color: var(--primary); width: 78px; }
    .clo-steps { margin: 0 0 16px; padding: 0; list-style: none; counter-reset: s; display: flex; flex-direction: column; gap: 10px; }
    .clo-steps li { counter-increment: s; position: relative; padding-left: 38px; }
    .clo-steps li::before { content: counter(s); position: absolute; left: 0; top: 0; width: 26px; height: 26px; border-radius: 8px; background: var(--primary-soft); color: var(--primary); font-weight: 800; font-size: 13px; display: grid; place-items: center; font-family: var(--font-display); }
    .clo-steps b { display: block; font-size: 13.5px; font-weight: 800; }
    .clo-steps span { font-size: 12.5px; font-weight: 600; color: var(--muted-foreground); }
    .clo-result { display: flex; align-items: center; justify-content: space-between; padding: 13px 15px; background: var(--secondary); border-radius: 10px; }
    .clo-result span { font-weight: 700; font-size: 13.5px; }
    .clo-result b { font-size: 14.5px; }
  `;
  const s = document.createElement('style'); s.textContent = css; document.head.appendChild(s);
})();
