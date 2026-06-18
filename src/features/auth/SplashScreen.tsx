import React from 'react';
import { Loader2 } from 'lucide-react';
import logoUrl from '@/assets/siconex-logo.png';

/** Écran d'attente pendant la vérification de session au démarrage (auth:me). */
export function SplashScreen(): React.JSX.Element {
  return (
    <div className="grid h-screen place-items-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="grid h-16 w-16 place-items-center rounded-2xl bg-white p-2 shadow-md">
          <img src={logoUrl} alt="Siconex" className="h-full w-full object-contain" />
        </div>
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    </div>
  );
}
