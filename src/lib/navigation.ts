import {
  LayoutDashboard,
  SquarePen,
  Link2,
  BookOpen,
  Users,
  NotebookText,
  CalendarDays,
  BarChart3,
  Layers,
  ShieldCheck,
  Building2,
  Store,
  Settings,
  type LucideIcon,
} from 'lucide-react';

export type RouteId =
  | 'dashboard'
  | 'ecritures'
  | 'lettrage'
  | 'plan'
  | 'tiers'
  | 'journaux'
  | 'exercices'
  | 'etats'
  | 'consolidation'
  | 'audit'
  | 'societes'
  | 'magasins'
  | 'utilisateurs';

export interface NavItem {
  id: RouteId;
  label: string;
  icon: LucideIcon;
}

export interface NavGroup {
  group: string | null;
  items: NavItem[];
}

export const NAV: NavGroup[] = [
  { group: null, items: [{ id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard }] },
  {
    group: 'Saisie',
    items: [
      { id: 'ecritures', label: 'Écritures', icon: SquarePen },
      { id: 'lettrage', label: 'Lettrage', icon: Link2 },
    ],
  },
  {
    group: 'Référentiel',
    items: [
      { id: 'plan', label: 'Plan comptable', icon: BookOpen },
      { id: 'tiers', label: 'Tiers', icon: Users },
      { id: 'journaux', label: 'Journaux', icon: NotebookText },
    ],
  },
  {
    group: 'Clôture',
    items: [{ id: 'exercices', label: 'Exercices', icon: CalendarDays }],
  },
  {
    group: 'États',
    items: [
      { id: 'etats', label: 'États & reporting', icon: BarChart3 },
      { id: 'consolidation', label: 'Consolidation société', icon: Layers },
    ],
  },
  {
    group: 'Audit',
    items: [{ id: 'audit', label: 'Audit & contrôle', icon: ShieldCheck }],
  },
  {
    group: 'Administration',
    items: [
      { id: 'societes', label: 'Sociétés', icon: Building2 },
      { id: 'magasins', label: 'Magasins', icon: Store },
      { id: 'utilisateurs', label: 'Utilisateurs', icon: Settings },
    ],
  },
];

export const PAGE_TITLES: Record<RouteId, string> = {
  dashboard: 'Tableau de bord',
  ecritures: 'Écritures comptables',
  lettrage: 'Lettrage',
  plan: 'Plan comptable',
  tiers: 'Tiers',
  journaux: 'Journaux',
  exercices: 'Exercices',
  etats: 'États & reporting',
  consolidation: 'Consolidation société',
  audit: 'Audit & contrôle',
  societes: 'Sociétés',
  magasins: 'Magasins',
  utilisateurs: 'Utilisateurs',
};
