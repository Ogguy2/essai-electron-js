import React, { useState } from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { PAGE_TITLES, type RouteId } from '@/lib/navigation';
import { magasins, exercices, brouillonsCount, type Magasin, type Exercice } from '@/lib/mock-data';
import type { AuthUser } from '@/shared/ipc';

interface AppShellProps {
  user: AuthUser;
  onLogout: () => void;
}

function Placeholder({ route }: { route: RouteId }): React.JSX.Element {
  return (
    <div className="grid h-full place-items-center p-10">
      <div className="text-center">
        <h2 className="text-xl font-bold">{PAGE_TITLES[route]}</h2>
        <p className="mt-1 text-sm font-medium text-muted-foreground">
          Module à construire dans une prochaine itération.
        </p>
      </div>
    </div>
  );
}

export function AppShell({ user, onLogout }: AppShellProps): React.JSX.Element {
  const [route, setRoute] = useState<RouteId>('dashboard');
  const [magasin, setMagasin] = useState<Magasin>(magasins[0]);
  const [exercice, setExercice] = useState<Exercice>(
    exercices.find((e) => e.statut === 'ouvert') ?? exercices[0],
  );

  return (
    <SidebarProvider>
      <AppSidebar route={route} onNavigate={setRoute} badges={{ ecritures: brouillonsCount(magasin.id) }} />
      <SidebarInset className="flex h-screen min-w-0 flex-col overflow-hidden">
        <Topbar
          route={route}
          magasin={magasin}
          magasins={magasins}
          onMagasinChange={setMagasin}
          exercice={exercice}
          exercices={exercices}
          onExerciceChange={setExercice}
          user={user}
          onLogout={onLogout}
        />
        <main className="flex-1 overflow-y-auto">
          <Placeholder route={route} />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
