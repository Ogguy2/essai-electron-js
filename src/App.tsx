import React, { useState } from 'react';
import { LoginScreen } from '@/features/auth/LoginScreen';
import { AppShell } from '@/components/layout/AppShell';
import type { AuthUser } from '@/shared/ipc';

export function App(): React.JSX.Element {
  const [user, setUser] = useState<AuthUser | null>(null);

  async function handleLogout() {
    await window.api.auth.logout();
    setUser(null);
  }

  if (!user) {
    return <LoginScreen onLogin={setUser} />;
  }

  return <AppShell user={user} onLogout={handleLogout} />;
}
