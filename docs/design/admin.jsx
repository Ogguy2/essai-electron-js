/* SICONEX — Administration : Sociétés, Magasins & Utilisateurs */

/* ============================================================
   SOCIÉTÉS (entité légale — porte raison sociale, RCCM, cartouche)
   ============================================================ */
function SocietesModule() {
  const [socs, setSocs] = useState(SX.societes);
  const [edit, setEdit] = useState(undefined);
  const [confirm, setConfirm] = useState(null);
  const toast = useToast();
  const countMag = (sid) => SX.magasins.filter(m => m.societe_id === sid).length;

  function save(payload, orig) {
    if (orig) { setSocs(l => l.map(s => s.id === orig.id ? { ...s, ...payload } : s)); toast('Société mise à jour ✓'); }
    else { setSocs(l => [...l, { ...payload, id: Math.max(...l.map(s=>s.id))+1 }]); toast('Société créée ✓'); }
    setEdit(undefined);
  }
  function tryDelete(s) {
    const n = countMag(s.id);
    if (n > 0) { toast(`Suppression refusée (409) — ${n} magasin${n>1?'s':''} encore rattaché${n>1?'s':''}.`, 'err'); return; }
    setConfirm(s);
  }

  return (
    <div className="page">
      <PageHead title="Sociétés" desc="Entité légale — porte la raison sociale, le RCCM, l'adresse et le cartouche des états PDF. Une société regroupe un ou plusieurs magasins.">
        <button className="btn btn-primary" onClick={() => setEdit(null)}><Icon name="plus" /> Nouvelle société</button>
      </PageHead>

      <div className="grid-2" style={{ gap: 16 }}>
        {socs.map(s => {
          const mags = SX.magasins.filter(m => m.societe_id === s.id);
          return (
            <div className="card mag" key={s.id}>
              <div className="row" style={{ gap: 13, marginBottom: 14 }}>
                <span className="kpi-ic ic-soft-orange" style={{ width: 48, height: 48, borderRadius: 12 }}><Icon name="building" size={22} /></span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="mag-name">{s.raison_sociale}</div>
                  <div className="muted" style={{ fontSize: 12.5, fontWeight: 700 }}>{mags.length} magasin{mags.length>1?'s':''} · consolidation disponible</div>
                </div>
                <Dropdown align="right" width={160} trigger={<button className="btn btn-ghost btn-icon btn-sm"><Icon name="dots" /></button>}>
                  <button className="menu-item" onClick={() => setEdit(s)}><Icon name="edit" /> Modifier</button>
                  <div className="menu-sep" />
                  <button className="menu-item danger" onClick={() => tryDelete(s)}><Icon name="trash" /> Supprimer</button>
                </Dropdown>
              </div>
              <div className="mag-info">
                <div><span className="mag-l">RCCM</span><b className="font-mono">{s.rccm || '—'}</b></div>
                <div><span className="mag-l">Téléphone</span><b>{s.telephone || '—'}</b></div>
                <div style={{ gridColumn: '1 / -1' }}><span className="mag-l">Adresse</span><b>{s.adresse || '—'}</b></div>
              </div>
              <div className="mag-mags">
                {mags.length ? mags.map(m => <span className="conso-chip" key={m.id}><Icon name="store" size={13} />{m.libelle.replace('Siconex - ', '')}</span>)
                  : <span className="muted" style={{ fontSize: 12, fontWeight: 700 }}>Aucun magasin rattaché</span>}
              </div>
            </div>
          );
        })}
      </div>

      {edit !== undefined && <SocieteForm societe={edit} onClose={() => setEdit(undefined)} onSave={(p) => save(p, edit)} />}
      {confirm && <ConfirmDialog title="Supprimer la société ?" tone="danger" icon="trash" confirmLabel="Supprimer"
        message={`La société ${confirm.raison_sociale} sera supprimée.`} onConfirm={() => { setSocs(l => l.filter(s => s.id !== confirm.id)); toast('Société supprimée'); }} onClose={() => setConfirm(null)} />}
    </div>
  );
}

function SocieteForm({ societe, onClose, onSave }) {
  const [f, setF] = useState({
    raison_sociale: societe?.raison_sociale || '', rccm: societe?.rccm || '',
    adresse: societe?.adresse || '', telephone: societe?.telephone || '',
  });
  const set = (k) => (e) => setF(s => ({ ...s, [k]: e.target.value }));
  return (
    <Modal title={societe ? 'Modifier la société' : 'Nouvelle société'} icon="building" eyebrow={societe ? 'Société' : 'Nouvelle entité légale'} sub="Seule la raison sociale est obligatoire. Ces informations alimentent le cartouche des états." onClose={onClose}
      footer={<><button className="btn btn-outline" onClick={onClose}>Annuler</button><button className="btn btn-primary" disabled={!f.raison_sociale} onClick={() => onSave(f)}><Icon name="save" /> Enregistrer</button></>}>
      <div className="stack" style={{ gap: 14, paddingBottom: 8 }}>
        <div className="field"><label className="label">Raison sociale</label><input className="input" value={f.raison_sociale} onChange={set('raison_sociale')} placeholder="ex. SICONEX SARL" /></div>
        <div className="grid-2" style={{ gap: 14 }}>
          <div className="field"><label className="label">RCCM</label><input className="input font-mono" value={f.rccm} onChange={set('rccm')} placeholder="CI-ABJ-…" /></div>
          <div className="field"><label className="label">Téléphone</label><input className="input" value={f.telephone} onChange={set('telephone')} placeholder="+225 …" /></div>
        </div>
        <div className="field"><label className="label">Adresse</label><input className="input" value={f.adresse} onChange={set('adresse')} placeholder="Quartier, ville" /></div>
      </div>
    </Modal>
  );
}

/* ============================================================
   MAGASINS (point de vente — rattaché à une société)
   ============================================================ */
function MagasinsModule({ magasin, onNav }) {
  const [mags, setMags] = useState(SX.magasins);
  const [edit, setEdit] = useState(undefined);
  const toast = useToast();

  function save(payload, orig) {
    if (orig) { setMags(l => l.map(m => m.id === orig.id ? { ...m, ...payload } : m)); toast('Magasin mis à jour ✓'); }
    else { setMags(l => [...l, { ...payload, id: Math.max(...l.map(m=>m.id))+1 }]); toast('Magasin créé · plan SYSCOHADA pré-chargé ✓'); }
    setEdit(undefined);
  }

  return (
    <div className="page">
      <PageHead title="Magasins" desc="Entités comptables isolées (comptes, journaux, écritures par magasin). L'identité légale est portée par la société de rattachement.">
        <button className="btn btn-primary" onClick={() => setEdit(null)}><Icon name="plus" /> Nouveau magasin</button>
      </PageHead>

      <div className="grid-2" style={{ gap: 16 }}>
        {mags.map(m => {
          const soc = SX.societeById[m.societe_id];
          return (
            <div className="card mag" key={m.id}>
              <div className="row" style={{ gap: 13, marginBottom: 14 }}>
                <span className="kpi-ic ic-soft-orange" style={{ width: 48, height: 48, borderRadius: 12 }}><Icon name="store" size={22} /></span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="row" style={{ gap: 8 }}>
                    <span className="mag-name">{m.libelle}</span>
                    {m.id === magasin.id && <Badge tone="success">Actif</Badge>}
                  </div>
                  <div className="muted" style={{ fontSize: 12.5, fontWeight: 700 }}>
                    <Icon name="building" size={13} style={{ verticalAlign: '-2px', marginRight: 4 }} />{soc ? soc.raison_sociale : '—'}
                  </div>
                </div>
                <Dropdown align="right" width={160} trigger={<button className="btn btn-ghost btn-icon btn-sm"><Icon name="dots" /></button>}>
                  <button className="menu-item" onClick={() => setEdit(m)}><Icon name="edit" /> Modifier</button>
                  <button className="menu-item danger" onClick={() => toast('Suppression simulée', 'info')}><Icon name="trash" /> Supprimer</button>
                </Dropdown>
              </div>
              <div className="mag-info">
                <div><span className="mag-l">RCCM (société)</span><b className="font-mono">{soc?.rccm || '—'}</b></div>
                <div><span className="mag-l">Téléphone</span><b>{soc?.telephone || '—'}</b></div>
                <div style={{ gridColumn: '1 / -1' }}><span className="mag-l">Adresse (société)</span><b>{soc?.adresse || '—'}</b></div>
              </div>
            </div>
          );
        })}
      </div>

      {edit !== undefined && <MagasinForm magasin={edit} onClose={() => setEdit(undefined)} onSave={(p) => save(p, edit)} />}
    </div>
  );
}

function MagasinForm({ magasin, onClose, onSave }) {
  const [f, setF] = useState({
    libelle: magasin?.libelle || '',
    societe_id: magasin?.societe_id || SX.societes[0].id,
  });
  const set = (k) => (e) => setF(s => ({ ...s, [k]: e.target.value }));
  return (
    <Modal title={magasin ? 'Modifier le magasin' : 'Nouveau magasin'} icon="store" eyebrow={magasin ? 'Magasin' : 'Nouvelle entité'} sub={!magasin ? 'Le plan comptable SYSCOHADA sera pré-chargé automatiquement.' : null} onClose={onClose}
      footer={<><button className="btn btn-outline" onClick={onClose}>Annuler</button><button className="btn btn-primary" disabled={!f.libelle || !f.societe_id} onClick={() => onSave({ ...f, societe_id: +f.societe_id })}><Icon name="save" /> Enregistrer</button></>}>
      <div className="stack" style={{ gap: 14, paddingBottom: 8 }}>
        <div className="field"><label className="label">Libellé du magasin</label><input className="input" value={f.libelle} onChange={set('libelle')} placeholder="ex. Siconex - Treichville" /></div>
        <div className="field"><label className="label">Société de rattachement</label>
          <select className="select" value={f.societe_id} onChange={set('societe_id')}>
            {SX.societes.map(s => <option key={s.id} value={s.id}>{s.raison_sociale}</option>)}
          </select>
          <div className="muted" style={{ fontSize: 11.5, fontWeight: 600, marginTop: 6 }}>L'identité légale (RCCM, adresse, téléphone) du cartouche provient de cette société.</div>
        </div>
      </div>
    </Modal>
  );
}

/* ============================================================
   UTILISATEURS
   ============================================================ */
const DEMO_USERS = [
  { id: 1, name: 'Aïcha Koné', username: 'admin', email: 'a.kone@siconex.ci', role: 'Admin' },
  { id: 2, name: 'Marc Bamba', username: 'm.bamba', email: 'm.bamba@siconex.ci', role: 'Comptable' },
  { id: 3, name: 'Fatou Diallo', username: 'f.diallo', email: 'f.diallo@siconex.ci', role: 'Comptable' },
  { id: 4, name: 'Yao Kouassi', username: 'y.kouassi', email: 'y.kouassi@siconex.ci', role: 'Lecture seule' },
];
function Utilisateurs() {
  const [users, setUsers] = useState(DEMO_USERS);
  const [edit, setEdit] = useState(undefined);
  const [confirm, setConfirm] = useState(null);
  const toast = useToast();
  const roleTone = { 'Admin': 'primary', 'Comptable': 'info', 'Lecture seule': 'neutral' };

  function save(payload, orig) {
    if (orig) { setUsers(l => l.map(u => u.id === orig.id ? { ...u, ...payload } : u)); toast('Utilisateur mis à jour ✓'); }
    else { setUsers(l => [...l, { ...payload, id: Math.max(...l.map(u=>u.id))+1 }]); toast('Utilisateur créé ✓'); }
    setEdit(undefined);
  }

  return (
    <div className="page">
      <PageHead title="Utilisateurs" desc="Gestion des accès — réservée aux administrateurs.">
        <button className="btn btn-primary" onClick={() => setEdit(null)}><Icon name="plus" /> Nouvel utilisateur</button>
      </PageHead>
      <div className="card" style={{ overflow: 'hidden' }}>
        <table className="tbl">
          <thead><tr><th>Utilisateur</th><th>Identifiant</th><th>Email</th><th>Rôle</th><th></th></tr></thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td><div className="row" style={{ gap: 11 }}>
                  <span className="avatar" style={{ width: 34, height: 34, fontSize: 13 }}>{u.name.split(' ').map(s=>s[0]).join('').slice(0,2)}</span>
                  <span style={{ fontWeight: 800 }}>{u.name}</span>
                </div></td>
                <td className="font-mono muted">{u.username}</td>
                <td className="muted">{u.email}</td>
                <td><Badge tone={roleTone[u.role]}>{u.role}</Badge></td>
                <td><Dropdown align="right" width={160} trigger={<button className="btn btn-ghost btn-icon btn-sm"><Icon name="dots" /></button>}>
                  <button className="menu-item" onClick={() => setEdit(u)}><Icon name="edit" /> Modifier</button>
                  <div className="menu-sep" />
                  <button className="menu-item danger" onClick={() => setConfirm(u)} disabled={u.username==='admin'}><Icon name="trash" /> Supprimer</button>
                </Dropdown></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {edit !== undefined && <UserForm user={edit} onClose={() => setEdit(undefined)} onSave={(p) => save(p, edit)} />}
      {confirm && <ConfirmDialog title="Supprimer l'utilisateur ?" tone="danger" icon="trash" confirmLabel="Supprimer"
        message={`Le compte de ${confirm.name} sera supprimé.`} onConfirm={() => { setUsers(l => l.filter(u => u.id !== confirm.id)); toast('Utilisateur supprimé'); }} onClose={() => setConfirm(null)} />}
    </div>
  );
}

function UserForm({ user, onClose, onSave }) {
  const [f, setF] = useState({ name: user?.name || '', username: user?.username || '', email: user?.email || '', role: user?.role || 'Comptable' });
  const set = (k) => (e) => setF(s => ({ ...s, [k]: e.target.value }));
  return (
    <Modal title={user ? 'Modifier l\u2019utilisateur' : 'Nouvel utilisateur'} icon="users" eyebrow="Accès & rôles" onClose={onClose}
      footer={<><button className="btn btn-outline" onClick={onClose}>Annuler</button><button className="btn btn-primary" disabled={!f.name||!f.username} onClick={() => onSave(f)}><Icon name="save" /> Enregistrer</button></>}>
      <div className="stack" style={{ gap: 14, paddingBottom: 8 }}>
        <div className="field"><label className="label">Nom complet</label><input className="input" value={f.name} onChange={set('name')} placeholder="ex. Marc Bamba" /></div>
        <div className="grid-2" style={{ gap: 14 }}>
          <div className="field"><label className="label">Identifiant</label><input className="input font-mono" value={f.username} onChange={set('username')} placeholder="ex. m.bamba" /></div>
          <div className="field"><label className="label">Rôle</label>
            <select className="select" value={f.role} onChange={set('role')}>
              <option>Admin</option><option>Comptable</option><option>Lecture seule</option>
            </select></div>
        </div>
        <div className="field"><label className="label">Email</label><input className="input" type="email" value={f.email} onChange={set('email')} placeholder="prenom.nom@siconex.ci" /></div>
        {!user && <div className="field"><label className="label">Mot de passe provisoire</label><input className="input" type="password" defaultValue="siconex2026" /></div>}
      </div>
    </Modal>
  );
}

Object.assign(window, { SocietesModule, MagasinsModule, Utilisateurs });

(function () {
  const css = `
    .mag { padding: 18px 20px; }
    .mag-name { font-family: var(--font-display); font-weight: 600; font-size: 18px; }
    .mag-info { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 20px; padding-top: 14px; border-top: 1px solid var(--border); }
    .mag-info > div { display: flex; flex-direction: column; gap: 2px; }
    .mag-l { font-size: 10.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; color: var(--muted-foreground); }
    .mag-info b { font-size: 13.5px; font-weight: 700; }
    .mag-mags { display: flex; gap: 7px; flex-wrap: wrap; padding-top: 14px; margin-top: 14px; border-top: 1px solid var(--border); }
  `;
  const s = document.createElement('style'); s.textContent = css; document.head.appendChild(s);
})();
