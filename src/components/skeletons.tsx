import { Skeleton } from '@/components/ui/skeleton';

/**
 * Skeletons de chargement reutilisables, calques sur les mises en page reelles
 * des modules (tableaux, grilles de KPIs, listes de cartes). A utiliser a la
 * place d'un placeholder textuel pendant `loading`.
 */

/**
 * Bloc de lignes imitant un tableau. `columns` controle la largeur/nombre de
 * cellules par ligne ; chaque entree est une classe de largeur Tailwind.
 */
export function TableSkeleton({
  rows = 7,
  columns = ['w-24', 'flex-1', 'w-28', 'w-20', 'w-20'],
  card = true,
}: {
  rows?: number;
  columns?: string[];
  card?: boolean;
}): React.JSX.Element {
  const body = (
    <div className="flex flex-col">
      {/* En-tete */}
      <div className="flex items-center gap-4 border-b border-border bg-muted/40 px-4 py-3">
        {columns.map((w, i) => (
          <Skeleton key={i} className={`h-3.5 ${w}`} />
        ))}
      </div>
      {/* Lignes */}
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          className="flex items-center gap-4 border-b border-border px-4 py-3 last:border-0"
        >
          {columns.map((w, i) => (
            <Skeleton key={i} className={`h-5 ${w}`} />
          ))}
        </div>
      ))}
    </div>
  );

  if (!card) return body;
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">{body}</div>
  );
}

/**
 * Grille de cartes KPI squelette (en-tete + valeur).
 */
export function KpiGridSkeleton({
  count = 4,
  className = 'grid grid-cols-2 gap-4 lg:grid-cols-4',
}: {
  count?: number;
  className?: string;
}): React.JSX.Element {
  return (
    <div className={className}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-lg border border-border bg-card p-4">
          <Skeleton className="mb-2 h-3 w-24" />
          <Skeleton className="h-7 w-28" />
        </div>
      ))}
    </div>
  );
}

/**
 * Liste de cartes squelette (societes, magasins, exercices, journaux...).
 */
export function CardListSkeleton({
  count = 4,
  className = 'grid grid-cols-1 gap-4 xl:grid-cols-2',
}: {
  count?: number;
  className?: string;
}): React.JSX.Element {
  return (
    <div className={className}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-lg border border-border bg-card px-5 py-[18px] shadow-sm">
          <div className="mb-[14px] flex items-start gap-[13px]">
            <Skeleton className="size-12 flex-none rounded-xl" />
            <div className="min-w-0 flex-1">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="mt-2 h-3.5 w-1/2" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-5 gap-y-3 border-t border-border pt-[14px]">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
}
