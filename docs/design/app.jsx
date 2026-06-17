/* SICONEX — App shell: sidebar + topbar + routing */

const NAV = [
  { group: null, items: [{ id: 'dashboard', label: 'Tableau de bord', icon: 'dashboard' }] },
  { group: 'Saisie', items: [
    { id: 'ecritures', label: 'Écritures', icon: 'pen' },
    { id: 'lettrage', label: 'Lettrage', icon: 'link' },
  ]},
  { group: 'Référentiel', items: [
    { id: 'plan', label: 'Plan comptable', icon: 'book' },
    { id: 'tiers', label: 'Tiers', icon: 'users' },
    { id: 'journaux', label: 'Journaux', icon: 'journal' },
  ]},
  { group: 'Clôture', items: [
    { id: 'exercices', label: 'Exercices', icon: 'calendar' },
  ]},
  { group: 'États', items: [
    { id: 'etats', label: 'États & reporting', icon: 'chart' },
    { id: 'consolidation', label: 'Consolidation société', icon: 'layers' },
  ]},
  { group: 'Audit', items: [
    { id: 'audit', label: 'Audit & contrôle', icon: 'shield' },
  ]},
  { group: 'Administration', items: [
    { id: 'societes', label: 'Sociétés', icon: 'building' },
    { id: 'magasins', label: 'Magasins', icon: 'store' },
    { id: 'utilisateurs', label: 'Utilisateurs', icon: 'settings' },
  ]},
];

const PAGE_TITLES = {
  dashboard: 'Tableau de bord', ecritures: 'Écritures comptables', lettrage: 'Lettrage',
  plan: 'Plan comptable', tiers: 'Tiers', journaux: 'Journaux', exercices: 'Exercices',
  etats: 'États & reporting', consolidation: 'Consolidation société', audit: 'Audit & contrôle',
  societes: 'Sociétés', magasins: 'Magasins', utilisateurs: 'Utilisateurs',
};

function Placeholder({ title }) {
  return (
    <div className="page">
      <Empty icon="sparkle" title={`${title} — bientôt`}>Ce module sera disponible dans une prochaine itération.</Empty>
    </div>
  );
}

function Sidebar({ route, onNav, entries }) {
  const brouillons = entries.filter(e => e.statut === 'brouillon').length;
  const bloquantes = window.AUDIT ? AUDIT.summary(entries).bloquant : 0;
  const counts = { ecritures: brouillons || null, audit: bloquantes || null };
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="logo-badge"><img src="assets/siconex-logo.png" alt="" /></div>
        <div>
          <div className="brand-name">Siconex</div>
          <div className="brand-sub">Compta</div>
        </div>
      </div>
      <nav className="sidebar-nav">
        {NAV.map((g, gi) => (
          <div key={gi}>
            {g.group && <div className="nav-group-label">{g.group}</div>}
            {g.items.map(it => (
              <button key={it.id} className={`nav-item ${route === it.id ? 'active' : ''}`} onClick={() => onNav(it.id)}>
                <Icon name={it.icon} />
                <span>{it.label}</span>
                {counts[it.id] ? <span className="nav-badge">{counts[it.id]}</span> : null}
              </button>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  );
}

function Topbar({ route, magasin, magasins, setMagasin, exercice, exercices, setExercice, onLogout }) {
  return (
    <header className="topbar">
      <div className="topbar-title">{PAGE_TITLES[route] || ''}</div>
      <div className="topbar-spacer" />

      {/* Magasin selector */}
      <Dropdown align="right" width={280} trigger={
        <button className="ctx-chip">
          <span className="chip-ic ic-soft-orange"><Icon name="store" size={16} /></span>
          <div className="col" style={{ alignItems: 'flex-start' }}>
            <span className="chip-label">{SX.societeById[magasin.societe_id]?.raison_sociale || 'Magasin'}</span>
            <span className="chip-val">{magasin.libelle.replace('Siconex - ', '')}</span>
          </div>
          <Icon name="chevDown" className="caret" />
        </button>
      }>
        <div className="menu-label">Changer de magasin</div>
        {SX.societes.filter(s => magasins.some(m => m.societe_id === s.id)).map(s => (
          <React.Fragment key={s.id}>
            <div className="menu-soc-label"><Icon name="building" size={12} /> {s.raison_sociale}</div>
            {magasins.filter(m => m.societe_id === s.id).map(m => (
              <button key={m.id} className={`menu-item ${m.id === magasin.id ? 'active-check' : ''}`} onClick={() => setMagasin(m)}>
                <Icon name="store" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700 }}>{m.libelle}</div>
                  <div className="muted" style={{ fontSize: 11.5, fontWeight: 600 }}>{s.rccm || '—'}</div>
                </div>
                {m.id === magasin.id && <Icon name="check" />}
              </button>
            ))}
          </React.Fragment>
        ))}
      </Dropdown>

      {/* Exercice selector */}
      <Dropdown align="right" width={220} trigger={
        <button className="ctx-chip">
          <span className="chip-ic ic-soft-blue"><Icon name="calendar" size={16} /></span>
          <div className="col" style={{ alignItems: 'flex-start' }}>
            <span className="chip-label">Exercice</span>
            <span className="chip-val">{exercice.libelle}</span>
          </div>
          <Icon name="chevDown" className="caret" />
        </button>
      }>
        <div className="menu-label">Exercice comptable</div>
        {exercices.map(ex => (
          <button key={ex.id} className={`menu-item ${ex.id === exercice.id ? 'active-check' : ''}`} onClick={() => setExercice(ex)}>
            <Icon name="calendar" />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700 }}>{ex.libelle}</div>
              <div className="muted" style={{ fontSize: 11.5, fontWeight: 600 }}>{ex.statut === 'ouvert' ? 'Ouvert' : 'Clôturé'}</div>
            </div>
            {ex.id === exercice.id && <Icon name="check" />}
          </button>
        ))}
      </Dropdown>

      <div style={{ width: 1, height: 28, background: 'var(--border)', margin: '0 4px' }} />

      {/* User menu */}
      <Dropdown align="right" width={230} trigger={
        <button className="row" style={{ gap: 8, background: 'none', border: 'none', padding: 2 }}>
          <span className="avatar">{SX.user.name.split(' ').map(s=>s[0]).join('').slice(0,2)}</span>
          <Icon name="chevDown" size={15} style={{ color: 'var(--muted-foreground)' }} />
        </button>
      }>
        <div style={{ padding: '8px 11px 10px' }}>
          <div style={{ fontWeight: 800, fontSize: 14 }}>{SX.user.name}</div>
          <div className="muted" style={{ fontSize: 12, fontWeight: 600 }}>{SX.user.email}</div>
          <div style={{ marginTop: 7 }}><Badge tone="primary">{SX.user.role}</Badge></div>
        </div>
        <div className="menu-sep" />
        <button className="menu-item"><Icon name="user" /> Mon profil</button>
        <button className="menu-item"><Icon name="settings" /> Paramètres</button>
        <div className="menu-sep" />
        <button className="menu-item danger" onClick={onLogout}><Icon name="logout" /> Se déconnecter</button>
      </Dropdown>
    </header>
  );
}

function App() {
  const [authed, setAuthed] = useState(false);
  const [route, setRoute] = useState('dashboard');
  const [params, setParams] = useState({});
  const [magasin, setMagasin] = useState(SX.magasins[0]);
  const [exercice, setExercice] = useState(SX.exercices.find(e => e.statut === 'ouvert'));
  const [data, setData] = useState(() => SX.entries.map(e => ({ ...e, lines: e.lines.map(l => ({ ...l })) })));
  const scrollRef = useRef(null);

  const onNav = useCallback((r, p = {}) => {
    setRoute(r); setParams(p);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, []);

  // entries scoped to current magasin
  const entries = data.filter(e => e.magasin === magasin.id);

  if (!authed) return <LoginScreen onLogin={() => setAuthed(true)} />;

  const ctx = { entries, magasin, exercice, onNav, data, setData };

  function render() {
    switch (route) {
      case 'dashboard': return <Dashboard {...ctx} />;
      case 'ecritures': return window.Ecritures ? <window.Ecritures {...ctx} params={params} /> : <Placeholder title="Écritures" />;
      case 'lettrage': return window.Lettrage ? <window.Lettrage {...ctx} /> : <Placeholder title="Lettrage" />;
      case 'plan': return window.PlanComptable ? <window.PlanComptable {...ctx} /> : <Placeholder title="Plan comptable" />;
      case 'tiers': return window.TiersModule ? <window.TiersModule {...ctx} /> : <Placeholder title="Tiers" />;
      case 'journaux': return window.Journaux ? <window.Journaux {...ctx} /> : <Placeholder title="Journaux" />;
      case 'exercices': return window.Exercices ? <window.Exercices {...ctx} /> : <Placeholder title="Exercices" />;
      case 'etats': return window.Etats ? <window.Etats {...ctx} params={params} /> : <Placeholder title="États" />;
      case 'consolidation': return window.Consolidation ? <window.Consolidation {...ctx} /> : <Placeholder title="Consolidation" />;
      case 'audit': return window.Audit ? <window.Audit {...ctx} /> : <Placeholder title="Audit" />;
      case 'societes': return window.SocietesModule ? <window.SocietesModule {...ctx} /> : <Placeholder title="Sociétés" />;
      case 'magasins': return window.MagasinsModule ? <window.MagasinsModule {...ctx} /> : <Placeholder title="Magasins" />;
      case 'utilisateurs': return window.Utilisateurs ? <window.Utilisateurs {...ctx} /> : <Placeholder title="Utilisateurs" />;
      default: return <Placeholder title="—" />;
    }
  }

  return (
    <div className="app-shell">
      <Sidebar route={route} onNav={onNav} entries={entries} />
      <div className="main-col">
        <Topbar route={route} magasin={magasin} magasins={SX.magasins} setMagasin={setMagasin}
          exercice={exercice} exercices={SX.exercices} setExercice={setExercice}
          onLogout={() => { setAuthed(false); setRoute('dashboard'); }} />
        <div className="page-scroll" ref={scrollRef}>
          {render()}
        </div>
      </div>
    </div>
  );
}

function Root() {
  return <ToastProvider><App /></ToastProvider>;
}
ReactDOM.createRoot(document.getElementById('root')).render(<Root />);
