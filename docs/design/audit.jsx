/* SICONEX — Module Audit : contrôles de cohérence + piste d'audit + rapport PDF */

const SEV = {
  bloquant:      { label: 'Bloquant',      pill: 'danger',  ic: 'ic-soft-red',     dotVar: 'destructive', kpi: 'red' },
  avertissement: { label: 'Avertissement', pill: 'warning', ic: 'ic-soft-amber',   dotVar: 'warning',     kpi: 'amber' },
  info:          { label: 'Information',   pill: 'info',    ic: 'ic-soft-blue',    dotVar: 'info',        kpi: 'blue' },
};
const SEV_ORDER = ['bloquant', 'avertissement', 'info'];

const ACTIONS = {
  create:   { label: 'Saisie',      tone: 'neutral', icon: 'pen' },
  validate: { label: 'Validation',  tone: 'success', icon: 'checkCircle' },
  letter:   { label: 'Lettrage',    tone: 'primary', icon: 'link' },
  delete:   { label: 'Suppression', tone: 'danger',  icon: 'trash' },
  close:    { label: 'Clôture',     tone: 'info',    icon: 'lockClosed' },
  login:    { label: 'Connexion',   tone: 'neutral', icon: 'user' },
  export:   { label: 'Export',      tone: 'neutral', icon: 'download' },
};

function initials(name) { return name.split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase(); }

/* ============================================================ Control card */
function ControlCard({ check, onOpen }) {
  const sev = SEV[check.severity];
  const n = check.items.length;
  const pass = n === 0;
  const [open, setOpen] = useState(!pass);
  return (
    <div className={`aud-card ${pass ? 'pass' : ''}`}>
      <button className="aud-card-head" onClick={() => !pass && setOpen(o => !o)} style={{ cursor: pass ? 'default' : 'pointer' }}>
        <span className={`aud-card-ic ${pass ? 'ic-soft-green' : sev.ic}`}>
          <Icon name={pass ? 'shieldCheck' : check.icon} size={19} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="aud-card-title">{check.label}</div>
          <div className="aud-card-desc">{check.description}</div>
        </div>
        <div className="row" style={{ gap: 10, flex: 'none' }}>
          {pass
            ? <Badge tone="success" dot>Conforme</Badge>
            : <>
                <Badge tone={sev.pill}>{sev.label}</Badge>
                <span className="aud-count">{n}</span>
                <Icon name="chevDown" size={17} className="aud-chev" style={{ transform: open ? 'rotate(180deg)' : 'none', color: 'var(--muted-foreground)' }} />
              </>}
        </div>
      </button>
      {!pass && open && (
        <div className="aud-card-body">
          <table className="tbl aud-tbl">
            <thead><tr><th style={{ width: 130 }}>Pièce</th><th style={{ width: 96 }}>Date</th><th>Constat</th><th style={{ width: 56 }}></th></tr></thead>
            <tbody>
              {check.items.map((it, i) => (
                <tr key={i}>
                  <td>{it.ref && it.ref !== '(sans n°)'
                    ? <span className="col-code" style={{ color: 'var(--primary)' }}>{it.ref}</span>
                    : <span className="muted col-code">(sans n°)</span>}
                    {it.statut === 'brouillon' && <Badge tone="warning" style={{ marginLeft: 6, height: 18, padding: '0 6px', fontSize: 10.5 }}>Brouillon</Badge>}
                  </td>
                  <td className="muted" style={{ whiteSpace: 'nowrap' }}>{it.date ? SX.fmtDate(it.date) : '—'}</td>
                  <td style={{ fontWeight: 600 }}>{it.message}</td>
                  <td>
                    {it.entryId != null
                      ? <button className="aud-link" onClick={() => onOpen(it.entryId)} title="Voir l'écriture"><Icon name="arrowRight" size={15} /></button>
                      : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ============================================================ Contrôles tab */
function ControlesTab({ checks, sum, filter, setFilter, onOpen }) {
  const shown = filter === 'all' ? checks : checks.filter(c => c.severity === filter);
  const ok = sum.total === 0;
  return (
    <>
      <div className="grid-kpi" style={{ marginBottom: 18 }}>
        <Kpi label="Contrôles exécutés" value={sum.controls} icon="shield" tone="neutral"
          foot={`${sum.passed} conformes · ${sum.failed} avec anomalies`} />
        <Kpi label="Bloquantes" value={sum.bloquant} icon="shieldAlert" tone="red"
          foot={sum.bloquant ? 'À corriger avant clôture' : 'Aucune anomalie bloquante'}
          footIcon={sum.bloquant ? 'alert' : 'check'} footTone={sum.bloquant ? 'destructive' : 'success'} />
        <Kpi label="Avertissements" value={sum.avertissement} icon="alert" tone="amber"
          foot="Points à vérifier" />
        <Kpi label="Points de vigilance" value={sum.info} icon="info" tone="blue"
          foot="Pour information" />
      </div>

      <div className="aud-bar">
        <div className="segment">
          {[['all', `Tous (${sum.controls})`], ['bloquant', `Bloquantes (${checks.filter(c=>c.severity==='bloquant'&&c.items.length).length})`],
            ['avertissement', `Avertissements (${checks.filter(c=>c.severity==='avertissement'&&c.items.length).length})`],
            ['info', `Vigilance (${checks.filter(c=>c.severity==='info'&&c.items.length).length})`]].map(([k, l]) => (
            <button key={k} className={filter === k ? 'active' : ''} onClick={() => setFilter(k)}>{l}</button>
          ))}
        </div>
        <div className="aud-arrete muted">Arrêté au {SX.fmtDate(AUDIT.TODAY)}</div>
      </div>

      {ok && (
        <div className="aud-allclear">
          <span className="aud-allclear-ic"><Icon name="shieldCheck" size={26} /></span>
          <div>
            <div className="aud-allclear-t">Aucune anomalie détectée</div>
            <div className="aud-allclear-s">Les {sum.controls} contrôles de cohérence sont conformes sur le périmètre courant.</div>
          </div>
        </div>
      )}

      <div className="stack" style={{ gap: 12, marginTop: ok ? 16 : 0 }}>
        {shown.map(c => <ControlCard key={c.id} check={c} onOpen={onOpen} />)}
      </div>
    </>
  );
}

/* ============================================================ Piste d'audit tab */
function PisteTab({ log }) {
  const [q, setQ] = useState('');
  const [act, setAct] = useState('');
  const [usr, setUsr] = useState('');
  const users = [...new Set(log.map(e => e.user))];
  const filtered = log.filter(e =>
    (!act || e.action === act) && (!usr || e.user === usr) &&
    (!q || (e.detail + ' ' + e.ref + ' ' + e.user).toLowerCase().includes(q.toLowerCase())));
  const todayN = log.filter(e => e.ts.slice(0, 10) === AUDIT.TODAY).length;

  return (
    <>
      <div className="grid-kpi" style={{ marginBottom: 18, gridTemplateColumns: 'repeat(3,1fr)' }}>
        <Kpi label="Événements tracés" value={log.length} icon="activity" tone="neutral" foot="Sur le périmètre courant" />
        <Kpi label="Aujourd’hui" value={todayN} icon="clock" tone="blue" foot={SX.fmtDateLong(AUDIT.TODAY)} />
        <Kpi label="Utilisateurs actifs" value={users.length} icon="users" tone="amber" foot={users.join(' · ')} />
      </div>

      <div className="card">
        <div className="aud-piste-bar">
          <div className="search" style={{ flex: 1, minWidth: 200 }}>
            <Icon name="search" /><input className="input" value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher dans la piste…" />
          </div>
          <select className="select" style={{ width: 190 }} value={act} onChange={e => setAct(e.target.value)}>
            <option value="">Toutes les actions</option>
            {Object.keys(ACTIONS).map(k => <option key={k} value={k}>{ACTIONS[k].label}</option>)}
          </select>
          <select className="select" style={{ width: 190 }} value={usr} onChange={e => setUsr(e.target.value)}>
            <option value="">Tous les utilisateurs</option>
            {users.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr><th style={{ width: 150 }}>Horodatage</th><th style={{ width: 190 }}>Utilisateur</th><th style={{ width: 140 }}>Action</th><th style={{ width: 150 }}>Cible</th><th>Détail</th></tr></thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={5}><div className="muted" style={{ padding: 18, textAlign: 'center', fontWeight: 600 }}>Aucun événement ne correspond aux filtres.</div></td></tr>}
              {filtered.map(e => {
                const a = ACTIONS[e.action];
                return (
                  <tr key={e.id}>
                    <td className="col-code muted" style={{ whiteSpace: 'nowrap' }}>{e.ts}</td>
                    <td>
                      <div className="row" style={{ gap: 8 }}>
                        <span className="aud-av">{initials(e.user)}</span>
                        <div style={{ lineHeight: 1.2 }}>
                          <div style={{ fontWeight: 700, fontSize: 13 }}>{e.user}</div>
                          <div className="muted" style={{ fontSize: 11, fontWeight: 700 }}>{e.role}</div>
                        </div>
                      </div>
                    </td>
                    <td><Badge tone={a.tone}><Icon name={a.icon} size={12} /> {a.label}</Badge></td>
                    <td>{e.ref
                      ? <span className="muted"><span style={{ fontWeight: 700, color: 'var(--foreground)' }}>{e.cible}</span> <span className="col-code">{e.ref}</span></span>
                      : <span className="muted" style={{ fontWeight: 700 }}>{e.cible}</span>}</td>
                    <td style={{ fontWeight: 600 }}>{e.detail}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

/* ============================================================ Report (print) */
function AuditReport({ magasin, exercice, checks, sum }) {
  const failed = checks.filter(c => c.items.length);
  return (
    <div className="aud-report">
      <div className="cart-top">
        <div className="cart-soc">
          <div className="cart-logo"><img src="assets/siconex-logo.png" alt="" /></div>
          <div>
            <div className="cart-rs">{magasin.raison_sociale || magasin.libelle}</div>
            <div className="cart-meta">
              {magasin.rccm && <span>RCCM {magasin.rccm}</span>}
              {magasin.adresse && <span>· {magasin.adresse}</span>}
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="cart-cur">FCFA</div>
          <div className="cart-date">Édité le {SX.fmtDate(AUDIT.TODAY)}</div>
        </div>
      </div>
      <div className="cart-rule" />
      <div className="cart-titre">Rapport de contrôle interne</div>
      <div className="cart-sous">Exercice {exercice.libelle} · arrêté au {SX.fmtDate(AUDIT.TODAY)} · {sum.total} anomalie(s) sur {sum.controls} contrôles</div>

      <table className="tbl rpt" style={{ marginTop: 18 }}>
        <thead><tr><th>Contrôle</th><th>Sévérité</th><th className="num">Anomalies</th><th>Statut</th></tr></thead>
        <tbody>
          {checks.map(c => (
            <tr key={c.id}>
              <td style={{ fontWeight: 700 }}>{c.label}</td>
              <td>{SEV[c.severity].label}</td>
              <td className="num"><span className="amount">{c.items.length}</span></td>
              <td>{c.items.length ? <Badge tone={SEV[c.severity].pill}>À traiter</Badge> : <Badge tone="success">Conforme</Badge>}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {failed.map(c => (
        <div key={c.id} className="aud-rep-block">
          <div className="aud-rep-h">{c.label} — {SEV[c.severity].label} ({c.items.length})</div>
          <table className="tbl rpt">
            <thead><tr><th style={{ width: 140 }}>Pièce</th><th style={{ width: 100 }}>Date</th><th>Constat</th></tr></thead>
            <tbody>
              {c.items.map((it, i) => (
                <tr key={i}><td className="col-code">{it.ref}</td><td>{it.date ? SX.fmtDate(it.date) : '—'}</td><td>{it.message}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
      <div className="cart-pagefoot">Siconex Compta · SYSCOHADA · Contrôle interne automatisé</div>
    </div>
  );
}

/* ============================================================ Main */
function Audit({ entries, magasin, exercice, onNav }) {
  const [tab, setTab] = useState('controles');
  const [filter, setFilter] = useState('all');
  const toast = useToast();
  const checks = AUDIT.runChecks(entries);
  const sum = AUDIT.summary(entries);
  const log = AUDIT.activityLog(entries);

  function openEntry(id) {
    const e = entries.find(x => x.id === id);
    if (!e) { toast('Écriture introuvable', 'err'); return; }
    onNav('ecritures', { open: id });
  }
  function exportPdf() {
    document.body.classList.add('printing');
    setTimeout(() => { window.print(); document.body.classList.remove('printing'); }, 60);
  }
  function rerun() { toast(`Contrôles relancés — ${sum.total} anomalie(s) détectée(s)`, sum.bloquant ? 'err' : 'info'); }

  return (
    <div className="page page-wide">
      <PageHead title="Audit & contrôle" desc="Contrôles de cohérence automatisés sur les écritures et piste d'audit des actions — pour fiabiliser la clôture.">
        <button className="btn btn-outline" onClick={rerun}><Icon name="refresh" /> Relancer</button>
        <button className="btn btn-primary" onClick={exportPdf}><Icon name="download" /> Rapport PDF</button>
      </PageHead>

      <div className="aud-screen">
        <div className="tabs" style={{ marginBottom: 20 }}>
          <button className={`tab ${tab === 'controles' ? 'active' : ''}`} onClick={() => setTab('controles')}>
            <Icon name="shield" size={15} style={{ marginRight: 6, verticalAlign: '-2px' }} />Contrôles de cohérence
            {sum.bloquant > 0 && <span className="tab-badge">{sum.bloquant}</span>}
          </button>
          <button className={`tab ${tab === 'piste' ? 'active' : ''}`} onClick={() => setTab('piste')}>
            <Icon name="activity" size={15} style={{ marginRight: 6, verticalAlign: '-2px' }} />Piste d'audit
          </button>
        </div>

        {tab === 'controles'
          ? <ControlesTab checks={checks} sum={sum} filter={filter} setFilter={setFilter} onOpen={openEntry} />
          : <PisteTab log={log} />}
      </div>

      <div className="aud-print-only"><AuditReport magasin={magasin} exercice={exercice} checks={checks} sum={sum} /></div>

      <style dangerouslySetInnerHTML={{ __html: `
        .aud-bar { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
        .aud-arrete { font-size: 12.5px; font-weight: 700; }
        .tab-badge { display: inline-grid; place-items: center; min-width: 18px; height: 18px; padding: 0 5px; margin-left: 7px;
          border-radius: 999px; background: var(--destructive); color: #fff; font-size: 11px; font-weight: 800; vertical-align: 1px; }

        .aud-card { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); box-shadow: var(--shadow-sm); overflow: hidden; }
        .aud-card.pass { background: oklch(0.985 0.006 168); border-color: oklch(0.90 0.03 168); }
        .aud-card-head { display: flex; align-items: center; gap: 14px; width: 100%; text-align: left; padding: 15px 18px; border: none; background: none; }
        .aud-card-ic { width: 40px; height: 40px; border-radius: 11px; display: grid; place-items: center; flex: none; }
        .aud-card-title { font-weight: 800; font-size: 15px; letter-spacing: -0.01em; }
        .aud-card-desc { font-size: 12.5px; font-weight: 600; color: var(--muted-foreground); margin-top: 2px; }
        .aud-count { display: inline-grid; place-items: center; min-width: 26px; height: 26px; padding: 0 8px; border-radius: 8px;
          background: var(--secondary); color: var(--foreground); font-family: var(--font-mono); font-weight: 700; font-size: 14px; }
        .aud-chev { transition: transform .18s; }
        .aud-card-body { border-top: 1px solid var(--border); }
        .aud-tbl { font-size: 13px; }
        .aud-tbl thead th { background: var(--secondary); }
        .aud-link { width: 30px; height: 30px; display: grid; place-items: center; border: 1px solid var(--border-strong); background: var(--card);
          border-radius: 8px; color: var(--primary); transition: .13s; }
        .aud-link:hover { background: var(--primary-soft); border-color: var(--primary); }

        .aud-allclear { display: flex; align-items: center; gap: 16px; padding: 20px 22px; border-radius: var(--radius);
          background: var(--success-soft); border: 1px solid oklch(0.88 0.04 168); }
        .aud-allclear-ic { width: 48px; height: 48px; border-radius: 12px; display: grid; place-items: center; flex: none; background: var(--success); color: #fff; }
        .aud-allclear-t { font-weight: 800; font-size: 16px; color: var(--success); }
        .aud-allclear-s { font-size: 13.5px; font-weight: 600; color: var(--secondary-foreground); margin-top: 2px; }

        .aud-piste-bar { display: flex; align-items: center; gap: 10px; padding: 14px 16px; border-bottom: 1px solid var(--border); flex-wrap: wrap; }
        .aud-av { width: 30px; height: 30px; border-radius: 50%; flex: none; display: grid; place-items: center; font-weight: 800; font-size: 11.5px;
          background: var(--primary-soft); color: var(--primary); font-family: var(--font-display); }

        .aud-print-only { display: none; }

        @media print {
          body.printing .sidebar, body.printing .topbar, body.printing .page-head, body.printing .aud-screen, body.printing .toast-wrap { display: none !important; }
          body.printing .app-shell { display: block; }
          body.printing .page-scroll, body.printing .main-col, body.printing .page { overflow: visible !important; height: auto !important; padding: 0 !important; }
          body.printing .aud-print-only { display: block !important; }
        }
        .aud-report { background: #fff; padding: 8px 4px; }
        .aud-report .cart-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
        .aud-report .cart-soc { display: flex; gap: 12px; align-items: center; }
        .aud-report .cart-logo { width: 52px; height: 44px; flex: none; }
        .aud-report .cart-logo img { width: 100%; height: 100%; object-fit: contain; }
        .aud-report .cart-rs { font-family: var(--font-display); font-weight: 600; font-size: 18px; }
        .aud-report .cart-meta { font-size: 11.5px; font-weight: 600; color: var(--muted-foreground); display: flex; gap: 5px; flex-wrap: wrap; margin-top: 2px; }
        .aud-report .cart-cur { font-weight: 800; font-size: 14px; color: var(--primary); }
        .aud-report .cart-date { font-size: 11.5px; font-weight: 600; color: var(--muted-foreground); }
        .aud-report .cart-rule { height: 2px; background: var(--primary); margin: 14px 0 16px; border-radius: 2px; }
        .aud-report .cart-titre { text-align: center; font-family: var(--font-display); font-weight: 600; font-size: 22px; letter-spacing: -0.01em; }
        .aud-report .cart-sous { text-align: center; font-size: 12.5px; font-weight: 700; color: var(--muted-foreground); margin-top: 2px; }
        .aud-report .cart-pagefoot { text-align: right; font-size: 10.5px; font-weight: 600; color: var(--muted-foreground); margin-top: 18px; }
        .aud-report .tbl.rpt thead th { background: var(--secondary); }
        .aud-rep-block { margin-top: 18px; break-inside: avoid; }
        .aud-rep-h { font-weight: 800; font-size: 13px; padding: 8px 12px; border-radius: 8px; background: var(--secondary); margin-bottom: 4px; }
      `}} />
    </div>
  );
}
window.Audit = Audit;
