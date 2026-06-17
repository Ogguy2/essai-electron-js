import React from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { NAV, type RouteId } from '@/lib/navigation';
import logoUrl from '@/assets/siconex-logo.png';

interface AppSidebarProps {
  route: RouteId;
  onNavigate: (route: RouteId) => void;
  /** Compteurs de badge par route (ex. brouillons sur « ecritures »). */
  badges?: Partial<Record<RouteId, number>>;
}

export function AppSidebar({ route, onNavigate, badges = {} }: AppSidebarProps): React.JSX.Element {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2.5 px-1 py-1">
          <div className="grid h-9 w-9 flex-none place-items-center overflow-hidden rounded-lg bg-white p-1 shadow-sm">
            <img src={logoUrl} alt="" className="h-full w-full object-contain" />
          </div>
          <div className="leading-tight group-data-[collapsible=icon]:hidden">
            <div className="text-sm font-extrabold tracking-tight">Siconex</div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Compta</div>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {NAV.map((g, gi) => (
          <SidebarGroup key={g.group ?? `g-${gi}`}>
            {g.group && <SidebarGroupLabel>{g.group}</SidebarGroupLabel>}
            <SidebarMenu>
              {g.items.map((it) => {
                const Icon = it.icon;
                const badge = badges[it.id];
                return (
                  <SidebarMenuItem key={it.id}>
                    <SidebarMenuButton
                      isActive={route === it.id}
                      tooltip={it.label}
                      onClick={() => onNavigate(it.id)}
                      className="data-[active=true]:bg-primary data-[active=true]:font-semibold data-[active=true]:text-primary-foreground data-[active=true]:hover:bg-primary data-[active=true]:hover:text-primary-foreground"
                    >
                      <Icon />
                      <span>{it.label}</span>
                    </SidebarMenuButton>
                    {badge ? <SidebarMenuBadge>{badge}</SidebarMenuBadge> : null}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
