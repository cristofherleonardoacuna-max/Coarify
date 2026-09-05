/** Estado vacio con icono, titulo y accion opcional. */
export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      {Icon && (
        <div
          className="grid h-16 w-16 place-items-center rounded-2xl"
          style={{ background: 'var(--bg-soft)', color: 'var(--accent)' }}
        >
          <Icon size={28} />
        </div>
      )}
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      {description && <p className="max-w-sm text-sm text-dim">{description}</p>}
      {action}
    </div>
  );
}

export default EmptyState;
