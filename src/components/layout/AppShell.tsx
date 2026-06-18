import React, { useEffect, useState } from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { PAGE_TITLES, type RouteId } from '@/lib/navigation';
import { brouillonsCount } from '@/lib/mock-data';
import { SocietesModule } from '@/features/societes/SocietesModule';
import { MagasinsModule } from '@/features/magasins/MagasinsModule';
import type { AuthUser, Magasin, Exercice } from '@/shared/ipc';

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
  const [magasins, setMagasins] = useState<Magasin[]>([]);
  const [magasin, setMagasin] = useState<Magasin | null>(null);
  const [exercices, setExercices] = useState<Exercice[]>([]);
  const [exercice, setExercice] = useState<Exercice | null>(null);

  // Charge la liste des magasins (référentiel global).
  async function loadMagasins() {
    const res = await window.api.magasins.list();
    if (res.success) {
      setMagasins(res.data);
      setMagasin((cur) => cur ?? res.data[0] ?? null);
    }
  }
  useEffect(() => { void loadMagasins(); }, []);

  // Charge les exercices du magasin courant.
  useEffect(() => {
    if (!magasin) { setExercices([]); setExercice(null); return; }
    let cancelled = false;
    void window.api.exercices.list(magasin.id).then((res) => {
      if (cancelled || !res.success) return;
      setExercices(res.data);
      setExercice(res.data.find((e) => e.statut === 'ouvert') ?? res.data[0] ?? null);
    });
    return () => { cancelled = true; };
  }, [magasin]);

  function renderRoute(): React.JSX.Element {
    switch (route) {
      case 'societes':
        return <SocietesModule user={user} onChanged={loadMagasins} />;
      case 'magasins':
        return <MagasinsModule user={user} onChanged={loadMagasins} />;
      default:
        return <Placeholder route={route} />;
    }
  }

  return (
    <SidebarProvider>
      <AppSidebar
        route={route}
        onNavigate={setRoute}
        badges={{ ecritures: magasin ? brouillonsCount(magasin.id) : 0 }}
      />
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
        <main className="flex-1 overflow-y-auto">{renderRoute()}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
