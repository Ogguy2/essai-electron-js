/* SICONEX — Login screen */
function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('siconex');
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  function submit(e) {
    e.preventDefault();
    setErr('');
    if (!username.trim() || !password.trim()) { setErr('Veuillez renseigner vos identifiants.'); return; }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      if (username.trim().toLowerCase() === 'admin') onLogin();
      else setErr('Identifiants incorrects. Réessayez.');
    }, 650);
  }

  return (
    <div className="login-wrap">
      {/* Left brand panel */}
      <div className="login-brand">
        <div className="login-brand-top">
          <div className="login-logo">
            <img src="assets/siconex-logo.png" alt="Siconex" />
          </div>
        </div>
        <div className="login-brand-mid">
          <div className="login-eyebrow">Comptabilité SYSCOHADA</div>
          <h1 className="login-headline">La compta de vos<br />magasins, au carré.</h1>
          <p className="login-sub">
            Saisie en partie double, lettrage, balance, grand livre et états réglementaires —
            pour chaque point de vente Siconex, en FCFA.
          </p>
          <ul className="login-feats">
            <li><span className="lf-ic"><Icon name="store" size={16} /></span> Multi-magasins isolés</li>
            <li><span className="lf-ic"><Icon name="balance" size={16} /></span> Conforme SYSCOHADA</li>
            <li><span className="lf-ic"><Icon name="lock" size={16} /></span> Écritures validées immuables</li>
          </ul>
        </div>
        <div className="login-brand-foot">
          <span>© 2026 Siconex Supermarché</span>
          <span>v0 · Abidjan, CI</span>
        </div>
        <div className="login-grain" />
      </div>

      {/* Right form */}
      <div className="login-form-side">
        <form className="login-card" onSubmit={submit}>
          <div className="login-form-head">
            <h2>Connexion</h2>
            <p>Accédez à votre espace comptable.</p>
          </div>

          {err && (
            <div className="login-alert">
              <Icon name="alert" size={17} /> <span>{err}</span>
            </div>
          )}

          <div className="field" style={{ marginBottom: 16 }}>
            <label className="label">Nom d'utilisateur</label>
            <div className="login-input-ic">
              <Icon name="user" size={17} />
              <input className="input" value={username} autoFocus
                onChange={e => setUsername(e.target.value)} placeholder="ex. admin" autoComplete="username" />
            </div>
          </div>

          <div className="field" style={{ marginBottom: 10 }}>
            <label className="label">Mot de passe</label>
            <div className="login-input-ic">
              <Icon name="lock" size={17} />
              <input className="input" type={showPw ? 'text' : 'password'} value={password}
                onChange={e => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password"
                style={{ paddingRight: 42 }} />
              <button type="button" className="login-pw-toggle" onClick={() => setShowPw(s => !s)} tabIndex={-1}>
                <Icon name={showPw ? 'eyeOff' : 'eye'} size={17} />
              </button>
            </div>
          </div>

          <button className="btn btn-primary btn-lg" type="submit" style={{ width: '100%', marginTop: 14 }} disabled={loading}>
            {loading ? 'Connexion…' : <>Se connecter <Icon name="arrowRight" /></>}
          </button>

          <div className="login-demo">
            <Icon name="info" size={14} />
            Démo — utilisateur <b>admin</b>, mot de passe <b>siconex</b>
          </div>
        </form>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .login-wrap { display: grid; grid-template-columns: 1.05fr 1fr; height: 100%; }
        .login-brand {
          position: relative; color: var(--foreground); overflow: hidden;
          background: linear-gradient(158deg, oklch(0.982 0.004 250) 0%, oklch(0.958 0.010 250) 100%);
          border-right: 1px solid var(--border);
          display: flex; flex-direction: column; padding: 44px 52px;
        }
        .login-grain { position: absolute; inset: 0; pointer-events: none;
          background:
            radial-gradient(900px 520px at 82% -10%, oklch(0.605 0.108 252 / 0.14), transparent 60%),
            radial-gradient(680px 460px at 2% 112%, oklch(0.605 0.085 200 / 0.10), transparent 55%); }
        .login-brand > *:not(.login-grain) { position: relative; z-index: 1; }
        .login-brand-top { flex: none; }
        .login-logo { width: 132px; height: 108px; background: #fff; border-radius: 18px; padding: 12px 16px;
          display: grid; place-items: center; box-shadow: var(--shadow-lg); }
        .login-logo img { width: 100%; height: 100%; object-fit: contain; }
        .login-brand-mid { flex: 1; display: flex; flex-direction: column; justify-content: center; max-width: 460px; }
        .login-eyebrow { font-weight: 800; font-size: 12.5px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--primary); margin-bottom: 18px; }
        .login-headline { font-family: var(--font-display); font-weight: 600; font-size: 42px; line-height: 1.08; letter-spacing: -0.02em; margin: 0 0 18px; color: var(--foreground); }
        .login-sub { font-size: 15.5px; line-height: 1.6; color: var(--muted-foreground); font-weight: 600; margin: 0 0 30px; }
        .login-feats { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 13px; }
        .login-feats li { display: flex; align-items: center; gap: 12px; font-weight: 700; font-size: 14.5px; color: var(--foreground); }
        .lf-ic { width: 32px; height: 32px; border-radius: 9px; background: var(--card); border: 1px solid var(--border); box-shadow: var(--shadow-sm); display: grid; place-items: center; color: var(--primary); flex: none; }
        .login-brand-foot { flex: none; display: flex; justify-content: space-between; font-size: 12.5px; font-weight: 600; color: var(--muted-foreground); }

        .login-form-side { display: grid; place-items: center; padding: 40px; background: var(--card); }
        .login-card { width: 100%; max-width: 396px; }
        .login-form-head { margin-bottom: 26px; }
        .login-form-head h2 { font-family: var(--font-display); font-weight: 600; font-size: 30px; letter-spacing: -0.02em; margin: 0 0 5px; }
        .login-form-head p { color: var(--muted-foreground); font-size: 15px; font-weight: 600; margin: 0; }
        .login-input-ic { position: relative; }
        .login-input-ic > svg { position: absolute; left: 13px; top: 50%; transform: translateY(-50%); color: var(--muted-foreground); pointer-events: none; }
        .login-input-ic .input { padding-left: 40px; height: 46px; }
        .login-pw-toggle { position: absolute; right: 6px; top: 50%; transform: translateY(-50%); background: none; border: none; width: 34px; height: 34px; display: grid; place-items: center; color: var(--muted-foreground); border-radius: 8px; }
        .login-pw-toggle:hover { background: var(--secondary); color: var(--foreground); }
        .login-alert { display: flex; align-items: center; gap: 9px; background: var(--destructive-soft); color: var(--destructive); border-radius: 10px; padding: 11px 13px; font-weight: 700; font-size: 13.5px; margin-bottom: 18px; }
        .login-demo { display: flex; align-items: center; justify-content: center; gap: 7px; margin-top: 22px; padding: 11px; background: var(--secondary); border-radius: 10px; font-size: 13px; font-weight: 600; color: var(--muted-foreground); }
        .login-demo b { color: var(--foreground); font-weight: 800; }
        @media (max-width: 920px) { .login-wrap { grid-template-columns: 1fr; } .login-brand { display: none; } }
      `}} />
    </div>
  );
}
window.LoginScreen = LoginScreen;
