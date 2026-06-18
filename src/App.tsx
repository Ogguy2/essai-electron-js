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

  // Mises à jour auto : le main notifie quand une MAJ est téléchargée et prête.
  // On affiche un toast persistant ; l'utilisateur choisit quand redémarrer.
  useEffect(() => {
    const off = window.api.updates.onReady(({ version }) => {
      toast.info(`Mise à jour ${version} prête à installer`, {
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
    return off;
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
