import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Check,
  Download,
  Info,
  Keyboard,
  Palette,
  PartyPopper,
  RotateCcw,
  Settings,
  Shield,
  Smartphone,
  Sparkles,
} from 'lucide-react';

import { useApp, THEMES } from '../context/AppContext';
import { SHORTCUTS } from '../hooks/useKeyboardShortcuts';
import Button from './common/Button';
import { LogoMark } from './common/Logo';
import { SectionTitle } from './HomePage';

const BITRATES = [
  { id: '128', label: '128 kbps', hint: 'Equilibrado (recomendado)' },
  { id: '192', label: '192 kbps', hint: 'Mejor calidad' },
  { id: '320', label: '320 kbps', hint: 'Maxima calidad, archivos mas pesados' },
];

const THEME_SWATCHES = {
  dark: ['#0b0f18', '#131a28', '#d4af37'],
  light: ['#f5f7fb', '#ffffff', '#1a2b4c'],
  amoled: ['#000000', '#08090c', '#ffc63d'],
  dynamic: ['#0a0d14', '#141a26', 'var(--accent)'],
};

/** Pantalla de ajustes y preferencias. */
export function ConfigPage() {
  const {
    theme, setTheme,
    dynamicColor, setDynamicColor,
    partyMode, setPartyMode,
    animations, setAnimations,
    bitrate, setBitrate,
    setTutorialSeen,
    resetEverything,
    favorites, playlists, history,
  } = useApp();

  const install = useInstallPrompt();

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 lg:py-8">
      <SectionTitle icon={Settings} title="Configuracion" />

      {/* ---------------------------------- Temas --------------------------------- */}
      <Card icon={Palette} title="Tema visual" description="Se aplica al instante y se recuerda en este dispositivo.">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {THEMES.map((option) => {
            const active = theme === option.id;
            const swatch = THEME_SWATCHES[option.id];
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setTheme(option.id)}
                className="relative rounded-xl p-3 text-left transition-all"
                style={{
                  background: 'var(--bg-soft)',
                  border: `2px solid ${active ? 'var(--accent)' : 'transparent'}`,
                }}
              >
                <div className="mb-2 flex gap-1">
                  {swatch.map((color, i) => (
                    <span
                      // eslint-disable-next-line react/no-array-index-key
                      key={i}
                      className="h-5 w-5 rounded-md"
                      style={{ background: color, border: '1px solid rgba(128,128,128,.25)' }}
                    />
                  ))}
                </div>
                <div className="text-xs font-bold text-ink">{option.name}</div>
                <div className="mt-0.5 text-[10px] leading-tight text-dim">{option.hint}</div>
                {active && (
                  <Check
                    size={14}
                    className="absolute right-2 top-2"
                    style={{ color: 'var(--accent)' }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </Card>

      {/* --------------------------------- Efectos -------------------------------- */}
      <Card icon={Sparkles} title="Efectos" description="Detalles visuales que puedes apagar si prefieres algo sobrio.">
        <Toggle
          checked={dynamicColor}
          onChange={setDynamicColor}
          title="Colores dinamicos"
          description="Toma el acento de la portada de la cancion que suena."
        />
        <Toggle
          checked={partyMode}
          onChange={setPartyMode}
          title="Modo fiesta"
          icon={PartyPopper}
          description="Espectro y particulas que reaccionan al ritmo mientras suena la musica."
        />
        <Toggle
          checked={animations}
          onChange={setAnimations}
          title="Animaciones de lista"
          description="Entrada escalonada de los resultados. Apagalo en equipos lentos."
        />
      </Card>

      {/* -------------------------------- Descargas ------------------------------- */}
      <Card icon={Download} title="Calidad de descarga" description="Se aplica al convertir a MP3 con ffmpeg.">
        <div className="grid gap-2 sm:grid-cols-3">
          {BITRATES.map((option) => {
            const active = bitrate === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setBitrate(option.id)}
                className="rounded-xl p-3 text-left transition-all"
                style={{
                  background: 'var(--bg-soft)',
                  border: `2px solid ${active ? 'var(--accent)' : 'transparent'}`,
                }}
              >
                <div className="text-sm font-bold text-ink">{option.label}</div>
                <div className="mt-0.5 text-[11px] leading-tight text-dim">{option.hint}</div>
              </button>
            );
          })}
        </div>
      </Card>

      {/* --------------------------------- Atajos --------------------------------- */}
      <Card icon={Keyboard} title="Atajos de teclado" description="Funcionan mientras no estes escribiendo en un campo.">
        <div className="grid gap-1.5 sm:grid-cols-2">
          {SHORTCUTS.map((shortcut) => (
            <div key={shortcut.keys} className="flex items-center justify-between gap-3 py-1">
              <span className="text-xs text-dim">{shortcut.action}</span>
              <kbd
                className="shrink-0 rounded-md px-2 py-1 text-[11px] font-semibold"
                style={{ background: 'var(--bg-soft)', color: 'var(--text)' }}
              >
                {shortcut.keys}
              </kbd>
            </div>
          ))}
        </div>
      </Card>

      {/* ------------------------------- Instalacion ------------------------------ */}
      <Card
        icon={Smartphone}
        title="Instalar COARIFY"
        description="Funciona como una app: icono propio, pantalla completa y arranque directo."
      >
        {install.available ? (
          <Button variant="accent" size="sm" onClick={install.prompt}>
            <Download size={14} />
            Instalar en este dispositivo
          </Button>
        ) : (
          <p className="text-xs text-dim">
            {install.installed
              ? 'Ya esta instalada en este dispositivo.'
              : 'Si no ves el boton, usa el menu de tu navegador: "Instalar aplicacion" o "Anadir a la pantalla de inicio".'}
          </p>
        )}
      </Card>

      {/* --------------------------------- Datos ---------------------------------- */}
      <Card icon={Shield} title="Tus datos" description="Todo se guarda solo en este navegador. El servidor no almacena nada.">
        <div className="mb-4 grid grid-cols-3 gap-3">
          <Stat label="Favoritos" value={favorites.length} />
          <Stat label="Playlists" value={playlists.length} />
          <Stat label="Historial" value={history.length} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setTutorialSeen(false);
              toast.success('El tutorial volvera a aparecer en la pantalla de inicio');
            }}
          >
            <RotateCcw size={14} />
            Ver el tutorial otra vez
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => {
              // eslint-disable-next-line no-alert
              if (window.confirm('Se borraran favoritos, playlists, historial y preferencias. ¿Continuar?'))
                resetEverything();
            }}
          >
            Borrar todos mis datos
          </Button>
        </div>
      </Card>

      {/* -------------------------------- Acerca de ------------------------------- */}
      <Card icon={Info} title="Acerca de COARIFY">
        <div className="flex items-start gap-4">
          <LogoMark size={56} className="shrink-0" />
          <div className="min-w-0 text-xs leading-relaxed text-dim">
            <p className="mb-1 text-sm font-bold text-ink">COARIFY v1.0.0</p>
            <p>
              Reproductor musical libre para la comunidad del Colegio de Alto Rendimiento.
              Los metadatos y portadas vienen de la API publica de Deezer; el audio, de YouTube.
            </p>
            <p className="mt-2">
              COARIFY no aloja ni redistribuye musica. Es una herramienta de uso personal y
              educativo: respetar los derechos de autor del contenido que reproduces o descargas
              es responsabilidad de cada usuario.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

/* ------------------------------- subcomponentes ------------------------------ */

function Card({ icon: Icon, title, description, children }) {
  return (
    <section className="surface mb-4 p-5">
      <div className="mb-4">
        <div className="flex items-center gap-2">
          {Icon && <Icon size={16} style={{ color: 'var(--accent)' }} />}
          <h2 className="text-sm font-bold text-ink">{title}</h2>
        </div>
        {description && <p className="mt-1 text-xs text-dim">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function Toggle({ checked, onChange, title, description, icon: Icon }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 py-2.5">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className="relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors"
        style={{ background: checked ? 'var(--accent)' : 'var(--bg-soft)' }}
      >
        <span
          className="absolute top-1 h-4 w-4 rounded-full bg-white transition-all"
          style={{ left: checked ? 'calc(100% - 1.25rem)' : '0.25rem' }}
        />
      </button>
      <span className="min-w-0">
        <span className="flex items-center gap-1.5 text-sm font-semibold text-ink">
          {Icon && <Icon size={14} style={{ color: 'var(--accent)' }} />}
          {title}
        </span>
        <span className="mt-0.5 block text-xs text-dim">{description}</span>
      </span>
    </label>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-xl p-3 text-center" style={{ background: 'var(--bg-soft)' }}>
      <div className="text-lg font-extrabold tabular-nums" style={{ color: 'var(--accent)' }}>
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-wider text-dim">{label}</div>
    </div>
  );
}

/** Captura el evento de instalacion de la PWA. */
function useInstallPrompt() {
  const [deferred, setDeferred] = useState(null);
  const [installed, setInstalled] = useState(
    typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(display-mode: standalone)').matches
  );

  useEffect(() => {
    const onPrompt = (event) => {
      event.preventDefault();
      setDeferred(event);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
      toast.success('COARIFY instalada');
    };

    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  return {
    available: !!deferred && !installed,
    installed,
    prompt: async () => {
      if (!deferred) return;
      deferred.prompt();
      await deferred.userChoice;
      setDeferred(null);
    },
  };
}

export default ConfigPage;
