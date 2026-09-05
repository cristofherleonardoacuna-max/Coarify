import { useId } from 'react';

/**
 * Marca COARIFY: placa institucional + "C" de COAR con una corchea.
 *
 * Los degradados llevan un id unico por instancia: con ids fijos, la copia
 * oculta de la barra lateral se adelanta en el documento y la del movil se
 * queda sin pintar.
 */
export function LogoMark({ size = 40, className = '' }) {
  const uid = useId().replace(/:/g, '');
  const navy = `coarifyNavy-${uid}`;
  const gold = `coarifyGold-${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 128 128"
      className={className}
      role="img"
      aria-label="COARIFY"
    >
      <defs>
        <linearGradient id={navy} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#25406F" />
          <stop offset="100%" stopColor="#12203A" />
        </linearGradient>
        <linearGradient id={gold} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#E9C863" />
          <stop offset="100%" stopColor="#B8912A" />
        </linearGradient>
      </defs>

      <rect x="2" y="2" width="124" height="124" rx="30" fill={`url(#${navy})`} />
      <path
        d="M 96.7 91.4 A 44 44 0 1 1 96.7 32.6"
        fill="none"
        stroke={`url(#${gold})`}
        strokeWidth="9"
        strokeLinecap="round"
      />
      <g fill={`url(#${gold})`}>
        <ellipse cx="57" cy="83" rx="12" ry="9" transform="rotate(-20 57 83)" />
        <rect x="65" y="36" width="5.5" height="47" rx="2.7" />
        <path d="M 70.5 36 C 85 41 94 49 94 62 C 92 53 84 47 70.5 47 Z" />
      </g>
    </svg>
  );
}

/** Logotipo completo (marca + palabra) para la barra lateral. */
export function Logo({ compact = false }) {
  return (
    <div className="flex items-center gap-3 select-none">
      <LogoMark size={compact ? 36 : 40} className="shrink-0 drop-shadow" />
      {!compact && (
        <div className="leading-none">
          <div className="text-[19px] font-extrabold tracking-tight text-ink">
            COAR<span style={{ color: 'var(--accent)' }}>IFY</span>
          </div>
          <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-dim">
            Musica libre
          </div>
        </div>
      )}
    </div>
  );
}

export default Logo;
