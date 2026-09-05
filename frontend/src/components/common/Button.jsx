import { forwardRef } from 'react';

const VARIANTS = {
  accent: 'btn-accent font-semibold',
  ghost: 'text-dim hover:text-ink hover:bg-soft',
  outline: 'border border-line text-ink hover:bg-soft',
  danger: 'border border-red-500/40 text-red-400 hover:bg-red-500/10',
};

const SIZES = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2',
  icon: 'h-9 w-9 justify-center',
  'icon-sm': 'h-8 w-8 justify-center',
};

export const Button = forwardRef(function Button(
  { variant = 'ghost', size = 'md', className = '', active = false, children, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type="button"
      className={[
        'inline-flex items-center rounded-xl transition-all disabled:opacity-40 disabled:pointer-events-none',
        VARIANTS[variant] || VARIANTS.ghost,
        SIZES[size] || SIZES.md,
        active ? 'text-[color:var(--accent)]' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {children}
    </button>
  );
});

/** Boton circular de icono, con tooltip nativo. */
export const IconButton = forwardRef(function IconButton({ label, className = '', ...props }, ref) {
  return (
    <Button
      ref={ref}
      size="icon"
      title={label}
      aria-label={label}
      className={`rounded-full ${className}`}
      {...props}
    />
  );
});

export default Button;
