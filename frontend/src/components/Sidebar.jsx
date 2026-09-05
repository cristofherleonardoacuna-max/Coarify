import { NavLink } from 'react-router-dom';
import {
  Clock3,
  Heart,
  Home,
  ListMusic,
  Moon,
  Palette,
  Settings,
  Sparkles,
  Sun,
} from 'lucide-react';

import { useApp, THEMES } from '../context/AppContext';
import { Logo } from './common/Logo';

export const NAV_ITEMS = [
  { to: '/', label: 'Inicio', icon: Home, end: true },
  { to: '/playlists', label: 'Playlists', icon: ListMusic },
  { to: '/favoritos', label: 'Favoritos', icon: Heart },
  { to: '/historial', label: 'Historial', icon: Clock3 },
  { to: '/configuracion', label: 'Configuracion', icon: Settings },
];

const THEME_ICON = { dark: Moon, light: Sun, amoled: Sparkles, dynamic: Palette };

/** Barra lateral de escritorio: marca COAR, navegacion y cambio rapido de tema. */
export function Sidebar() {
  const { theme, setTheme, playlists, favorites } = useApp();

  const cycleTheme = () => {
    const ids = THEMES.map((t) => t.id);
    setTheme(ids[(ids.indexOf(theme) + 1) % ids.length]);
  };

  const ThemeIcon = THEME_ICON[theme] || Moon;
  const themeName = (THEMES.find((t) => t.id === theme) || THEMES[0]).name;

  const counts = { '/playlists': playlists.length, '/favoritos': favorites.length };

  return (
    <aside
      className="hidden w-[240px] shrink-0 flex-col gap-2 p-4 lg:flex"
      style={{ background: 'var(--bg-elev)', borderRight: '1px solid var(--border)' }}
    >
      <div className="px-2 py-3">
        <Logo />
      </div>

      <nav className="mt-2 flex flex-col gap-1">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => `nav-link ${isActive ? 'is-active' : ''}`}
          >
            <Icon size={18} className="shrink-0" />
            <span className="flex-1">{label}</span>
            {counts[to] > 0 && (
              <span className="text-[11px] font-bold tabular-nums opacity-70">{counts[to]}</span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto space-y-3">
        <button
          type="button"
          onClick={cycleTheme}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-dim transition-colors hover:bg-[color:var(--bg-soft)] hover:text-ink"
          title="Cambiar tema"
        >
          <ThemeIcon size={18} className="shrink-0" />
          <span className="flex-1 text-left">Tema: {themeName}</span>
        </button>

        <div
          className="rounded-xl p-3 text-[11px] leading-relaxed text-dim"
          style={{ background: 'var(--bg-soft)' }}
        >
          <p className="mb-1 font-bold uppercase tracking-wider" style={{ color: 'var(--accent)' }}>
            Colegio de Alto Rendimiento
          </p>
          <p>Musica libre, sin suscripciones ni anuncios.</p>
        </div>
      </div>
    </aside>
  );
}

/** Navegacion inferior para movil. */
export function MobileNav() {
  return (
    <nav
      className="flex items-stretch justify-around lg:hidden"
      style={{ background: 'var(--bg-elev)', borderTop: '1px solid var(--border)' }}
    >
      {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className="flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-semibold transition-colors"
          style={({ isActive }) => ({ color: isActive ? 'var(--accent)' : 'var(--text-dim)' })}
        >
          <Icon size={19} />
          <span className="truncate px-1">{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

export default Sidebar;
