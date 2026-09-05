/**
 * Slider con relleno de acento. El porcentaje se pasa como variable CSS
 * (--progress) y el track lo pinta en styles/index.css.
 */
export function Slider({ value = 0, max = 100, onChange, ariaLabel, className = '', step = 0.1 }) {
  const safeMax = max > 0 ? max : 100;
  const percent = Math.min(100, Math.max(0, (value / safeMax) * 100));

  return (
    <input
      type="range"
      min={0}
      max={safeMax}
      step={step}
      value={Math.min(value, safeMax)}
      onChange={(event) => onChange(Number(event.target.value))}
      aria-label={ariaLabel}
      className={`coar-range ${className}`}
      style={{ '--progress': `${percent}%` }}
    />
  );
}

export default Slider;
