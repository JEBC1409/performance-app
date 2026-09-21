/** Loading placeholders shaped like the content that's coming, so the screen
 * doesn't jump and feels faster than a "Cargando…" line. */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`skeleton rounded-xl ${className}`} />;
}

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="panel-surface p-4" role="status" aria-label="Cargando">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-3 h-7 w-40" />
      <div className="mt-4 flex flex-col gap-2">
        {Array.from({ length: lines }, (_, i) => (
          <Skeleton key={i} className="h-3" />
        ))}
      </div>
    </div>
  );
}

export function SkeletonTiles({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3" role="status" aria-label="Cargando">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="panel-surface p-3.5">
          <Skeleton className="h-2.5 w-16" />
          <Skeleton className="mt-3 h-7 w-20" />
          <Skeleton className="mt-3 h-2.5 w-24" />
        </div>
      ))}
    </div>
  );
}
