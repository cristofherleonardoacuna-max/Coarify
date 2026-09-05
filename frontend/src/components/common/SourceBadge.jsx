const STYLES = {
  deezer: { label: 'Deezer', bg: 'rgba(162,56,255,.16)', color: '#c084fc', border: 'rgba(162,56,255,.35)' },
  youtube: { label: 'YouTube', bg: 'rgba(255,0,0,.14)', color: '#ff6b6b', border: 'rgba(255,0,0,.32)' },
};

/** Etiqueta que indica de donde salio el resultado. */
export function SourceBadge({ source }) {
  const style = STYLES[source];
  if (!style) return null;

  return (
    <span
      className="chip"
      style={{ background: style.bg, color: style.color, border: `1px solid ${style.border}` }}
    >
      {style.label}
    </span>
  );
}

export default SourceBadge;
