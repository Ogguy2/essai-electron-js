import React from 'react';
import { Store, CalendarDays, ChevronDown, Building2, Check, User, LogOut, Settings } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { PAGE_TITLES, type RouteId } from '@/lib/navigation';
import { societeById } from '@/lib/mock-data';
import type { Magasin, Exercice } from '@/shared/ipc';
import type { AuthUser } from '@/shared/ipc';

interface TopbarProps {
  route: RouteId;
  magasin: Magasin | null;
  magasins: Magasin[];
  onMagasinChange: (m: Magasin) => void;
  exercice: Exercice | null;
  exercices: Exercice[];
  onExerciceChange: (e: Exercice) => void;
  user: AuthUser;
  onLogout: () => void;
}

function initials(name: string): string {
  return name
    .split(' ')
    .map((s) => s[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function Topbar({
  route,
  magasin,
  magasins,
  onMagasinChange,
  exercice,
  exercices,
  onExerciceChange,
  user,
  onLogout,
}: TopbarProps): React.JSX.Element {
  const societesAvecMagasins = Object.values(societeById).filter((s) =>
    magasins.some((m) => m.societe_id === s.id),
  );

  return (
    <header className="flex h-16 flex-none items-center gap-3 border-b border-border bg-card px-6">
      <SidebarTrigger className="-ml-2" />
      <div className="text-lg font-bold tracking-tight">{PAGE_TITLES[route]}</div>
      <div className="flex-1" />

      {/* Sélecteur de magasin */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2.5 rounded-lg border border-border bg-background px-3 py-1.5 text-left transition-colors hover:bg-secondary">
            <span className="grid h-7 w-7 flex-none place-items-center rounded-md bg-primary/10 text-primary">
              <Store size={16} />
            </span>
            <span className="flex flex-col leading-tight">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {magasin ? (societeById[magasin.societe_id]?.raison_sociale ?? 'Magasin') : '—'}
              </span>
              <span className="text-[13px] font-bold">
                {magasin ? magasin.libelle.replace('Siconex - ', '') : '—'}
              </span>
            </span>
            <ChevronDown size={15} className="text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72">
          <DropdownMenuLabel>Changer de magasin</DropdownMenuLabel>
          {societesAvecMagasins.map((s) => (
            <React.Fragment key={s.id}>
              <div className="flex items-center gap-1.5 px-2 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <Building2 size={12} /> {s.raison_sociale}
              </div>
              {magasins
                .filter((m) => m.societe_id === s.id)
                .map((m) => (
                  <DropdownMenuItem key={m.id} onClick={() => onMagasinChange(m)} className="gap-2">
                    <Store size={16} />
                    <div className="flex-1">
                      <div className="font-bold">{m.libelle}</div>
                      <div className="text-[11.5px] font-semibold text-muted-foreground">{s.rccm}</div>
                    </div>
                    {magasin && m.id === magasin.id && <Check size={16} className="text-primary" />}
                  </DropdownMenuItem>
                ))}
            </React.Fragment>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Sélecteur d'exercice */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2.5 rounded-lg border border-border bg-background px-3 py-1.5 text-left transition-colors hover:bg-secondary">
            <span className="grid h-7 w-7 flex-none place-items-center rounded-md bg-primary/10 text-primary">
              <CalendarDays size={16} />
            </span>
            <span className="flex flex-col leading-tight">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Exercice</span>
              <span className="text-[13px] font-bold">{exercice ? exercice.libelle : '—'}</span>
            </span>
            <ChevronDown size={15} className="text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Exercice comptable</DropdownMenuLabel>
          {exercices.map((ex) => (
            <DropdownMenuItem key={ex.id} onClick={() => onExerciceChange(ex)} className="gap-2">
              <CalendarDays size={16} />
              <div className="flex-1">
                <div className="font-bold">{ex.libelle}</div>
                <div className="text-[11.5px] font-semibold text-muted-foreground">
                  {ex.statut === 'ouvert' ? 'Ouvert' : 'Clôturé'}
                </div>
              </div>
              {exercice && ex.id === exercice.id && <Check size={16} className="text-primary" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="mx-1 h-7 w-px bg-border" />

      {/* Menu utilisateur */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 rounded-lg p-1 transition-colors hover:bg-secondary">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary text-xs font-bold text-primary-foreground">
                {initials(user.name)}
              </AvatarFallback>
            </Avatar>
            <ChevronDown size={15} className="text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <div className="px-2 py-1.5">
            <div className="text-sm font-extrabold">{user.name}</div>
            {user.email && <div className="text-xs font-semibold text-muted-foreground">{user.email}</div>}
            <Badge className="mt-1.5">{user.role}</Badge>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="gap-2">
            <User size={16} /> Mon profil
          </DropdownMenuItem>
          <DropdownMenuItem className="gap-2">
            <Settings size={16} /> Paramètres
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" className="gap-2" onClick={onLogout}>
            <LogOut size={16} /> Se déconnecter
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
