import React, { useState } from 'react';
import {
  User,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  TriangleAlert,
  Info,
  Store,
  Scale,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group';
import { Label } from '@/components/ui/label';
import type { AuthUser } from '@/shared/ipc';
import logoUrl from '@/assets/siconex-logo.png';

interface LoginScreenProps {
  /** Appelé avec l'utilisateur authentifié (via le canal IPC `auth:login`). */
  onLogin: (user: AuthUser) => void;
}

const FEATURES = [
  { icon: Store, label: 'Multi-magasins isolés' },
  { icon: Scale, label: 'Conforme SYSCOHADA' },
  { icon: Lock, label: 'Écritures validées immuables' },
];

export function LoginScreen({ onLogin }: LoginScreenProps): React.JSX.Element {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('password');
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    if (!username.trim() || !password.trim()) {
      setErr('Veuillez renseigner vos identifiants.');
      return;
    }
    setLoading(true);
    try {
      const res = await window.api.auth.login(username.trim(), password);
      if (!res.success) {
        setErr(res.error.message);
        return;
      }
      onLogin(res.data);
    } catch {
      setErr('Erreur de connexion. Réessayez.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="relative grid min-h-screen place-items-center overflow-hidden p-6"
      style={{
        background:
          'linear-gradient(158deg, oklch(0.982 0.004 250) 0%, oklch(0.958 0.010 250) 100%)',
      }}
    >
      {/* halo décoratif (fond de page) */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(900px 520px at 82% -10%, oklch(0.605 0.108 252 / 0.14), transparent 60%), radial-gradient(680px 460px at 2% 112%, oklch(0.605 0.085 200 / 0.10), transparent 55%)',
        }}
      />

      {/* Carte unique centrée : marque + formulaire */}
      <Card className="relative z-10 w-full max-w-[440px] gap-0 p-8 shadow-xl sm:p-10">
        {/* Bloc marque */}
        <div className="flex flex-col items-center text-center">
          <div
            className="grid place-items-center rounded-2xl bg-white p-3 shadow-lg"
            style={{ width: 120, height: 98 }}
          >
            <img src={logoUrl} alt="Siconex" className="h-full w-full object-contain" />
          </div>
          <div className="mt-5 text-xs font-extrabold uppercase tracking-[0.14em] text-primary">
            Comptabilité SYSCOHADA
          </div>
          <h1 className="mt-2 text-[26px] font-semibold leading-[1.12] tracking-tight text-foreground">
            La compta de vos magasins, au carré.
          </h1>
        </div>

        {/* Fonctionnalités */}
        <ul className="mt-6 flex flex-col gap-3">
          {FEATURES.map(({ icon: Ic, label }) => (
            <li key={label} className="flex items-center gap-3 text-[14px] font-bold text-foreground">
              <span className="grid h-8 w-8 flex-none place-items-center rounded-[9px] border border-border bg-card text-primary shadow-sm">
                <Ic size={16} />
              </span>
              {label}
            </li>
          ))}
        </ul>

        {/* Séparateur */}
        <div className="my-7 h-px w-full bg-border" />

        {/* Formulaire */}
        <form className="w-full" onSubmit={submit}>
          <div className="mb-6">
            <h2 className="mb-1 text-2xl font-semibold tracking-tight">Connexion</h2>
            <p className="text-[15px] font-semibold text-muted-foreground">
              Accédez à votre espace comptable.
            </p>
          </div>

          {err && (
            <div className="mb-4 flex items-center gap-2.5 rounded-[10px] bg-destructive/10 px-3 py-3 text-[13.5px] font-bold text-destructive">
              <TriangleAlert size={17} />
              <span>{err}</span>
            </div>
          )}

          <div className="mb-4">
            <Label htmlFor="username" className="mb-2">Nom d'utilisateur</Label>
            <InputGroup className="h-11">
              <InputGroupAddon>
                <User />
              </InputGroupAddon>
              <InputGroupInput
                id="username"
                value={username}
                autoFocus
                autoComplete="username"
                placeholder="ex. admin"
                onChange={(e) => setUsername(e.target.value)}
              />
            </InputGroup>
          </div>

          <div className="mb-2.5">
            <Label htmlFor="password" className="mb-2">Mot de passe</Label>
            <InputGroup className="h-11">
              <InputGroupAddon>
                <Lock />
              </InputGroupAddon>
              <InputGroupInput
                id="password"
                type={showPw ? 'text' : 'password'}
                value={password}
                autoComplete="current-password"
                placeholder="••••••••"
                onChange={(e) => setPassword(e.target.value)}
              />
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  size="icon-sm"
                  tabIndex={-1}
                  onClick={() => setShowPw((s) => !s)}
                  aria-label={showPw ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  {showPw ? <EyeOff /> : <Eye />}
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
          </div>

          <Button type="submit" size="lg" disabled={loading} className="mt-3.5 h-11 w-full">
            {loading ? (
              'Connexion…'
            ) : (
              <>
                Se connecter <ArrowRight size={18} />
              </>
            )}
          </Button>

          <div className="mt-5 flex items-center justify-center gap-1.5 rounded-[10px] bg-secondary p-3 text-[13px] font-semibold text-muted-foreground">
            <Info size={14} />
            Démo — <b className="font-extrabold text-foreground">admin</b> ou{' '}
            <b className="font-extrabold text-foreground">user</b>, mot de passe{' '}
            <b className="font-extrabold text-foreground">password</b>
          </div>
        </form>

        {/* Footer */}
        <div className="mt-7 flex justify-between text-xs font-semibold text-muted-foreground">
          <span>© 2026 Siconex Supermarché</span>
          <span>v{__APP_VERSION__} · Abidjan, CI</span>
        </div>
      </Card>
    </div>
  );
}
