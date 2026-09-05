/** Fila fantasma mientras llega la respuesta del backend. */
export function SkeletonRow() {
  return (
    <div className="flex animate-pulse items-center gap-4 rounded-xl px-3 py-2.5">
      <div className="h-14 w-14 shrink-0 rounded-lg" style={{ background: 'var(--bg-soft)' }} />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="h-3 w-2/5 rounded" style={{ background: 'var(--bg-soft)' }} />
        <div className="h-2.5 w-1/4 rounded" style={{ background: 'var(--bg-soft)' }} />
      </div>
      <div className="h-2.5 w-10 rounded" style={{ background: 'var(--bg-soft)' }} />
    </div>
  );
}

export default SkeletonRow;
