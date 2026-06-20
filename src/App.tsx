import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { LoginScreen } from '@/features/auth/LoginScreen';
import { SplashScreen } from '@/features/auth/SplashScreen';
import { AppShell } from '@/components/layout/AppShell';
import type { AuthUser } from '@/shared/ipc';

export function App(): React.JSX.Element {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [checking, setChecking] = useState(true);

  // Restaure la session au démarrage : le processus principal conserve
  // l'utilisateur courant, donc un rechargement du renderer ne déconnecte pas.
  useEffect(() => {
    let cancelled = false;
    window.api.auth
      .me()
      .then((res) => {
        if (!cancelled && res.success) setUser(res.data);
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Mises à jour auto : barre de progression pendant le téléchargement, puis
  // toast « prête → Redémarrer » quand c'est terminé. Un id stable garde un
  // seul toast qui se met à jour (progression) avant d'être remplacé.
  useEffect(() => {
    const TOAST_ID = 'app-update';

    const offProgress = window.api.updates.onProgress(({ percent, bytesPerSecond }) => {
      const pct = Math.min(100, Math.max(0, Math.round(percent)));
      const speed = `${(bytesPerSecond / 1_000_000).toFixed(1)} Mo/s`;
      toast(
        <div className="flex w-full flex-col gap-2">
          <div className="flex items-center justify-between text-sm font-semibold">
            <span>Téléchargement de la mise à jour…</span>
            <span className="tabular-nums">{pct}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-primary transition-all duration-200"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="text-xs font-medium text-muted-foreground tabular-nums">{speed}</div>
        </div>,
        { id: TOAST_ID, duration: Infinity },
      );
    });

    const offReady = window.api.updates.onReady(({ version }) => {
      toast.info(`Mise à jour ${version} prête à installer`, {
        id: TOAST_ID,
        description: 'Redémarrez pour appliquer la nouvelle version.',
        duration: Infinity,
        action: {
          label: 'Redémarrer maintenant',
          onClick: () => {
            void window.api.updates.install();
          },
        },
        cancel: {
          label: 'Plus tard',
          onClick: () => undefined,
        },
      });
    });

    return () => {
      offProgress();
      offReady();
    };
  }, []);

  async function handleLogout() {
    await window.api.auth.logout();
    setUser(null);
  }

  if (checking) {
    return <SplashScreen />;
  }

  if (!user) {
    return <LoginScreen onLogin={setUser} />;
  }

  return <AppShell user={user} onLogout={handleLogout} />;
}
