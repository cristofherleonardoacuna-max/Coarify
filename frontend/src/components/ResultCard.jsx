import { memo } from 'react';
import { Download, Heart, Pause, Play } from 'lucide-react';

import { usePlayback } from '../context/AppContext';
import { formatTime } from '../utils/formatTime';
import Cover from './common/Cover';
import SourceBadge from './common/SourceBadge';
import { IconButton } from './common/Button';
import TrackMenu from './TrackMenu';

/**
 * Fila de resultado. Va memoizada porque una busqueda pinta decenas de estas
 * y solo debe volver a renderizarse la que cambia de estado.
 */
function ResultCardBase({
  track,
  isCurrent,
  isFavorite,
  onPlay,
  onDownload,
  onToggleFavorite,
  index,
  showIndex = false,
  trailing,
}) {
  const { isPlaying } = usePlayback();
  const playingNow = isCurrent && isPlaying;

  return (
    <div
      onDoubleClick={() => onPlay(track)}
      className="group relative flex items-center gap-3 rounded-xl px-2 py-2 transition-colors sm:gap-4 sm:px-3"
      style={{ background: isCurrent ? 'var(--bg-soft)' : 'transparent' }}
    >
      {/* Indice / indicador de reproduccion */}
      {showIndex && (
        <div className="hidden w-6 shrink-0 text-right text-xs tabular-nums text-dim sm:block">
          {playingNow ? <EqualizerBars /> : index + 1}
        </div>
      )}

      {/* Portada con boton de reproducir superpuesto */}
      <div className="relative shrink-0">
        <Cover src={track.cover} alt={track.title} className="h-12 w-12 sm:h-14 sm:w-14" />
        <button
          type="button"
          onClick={() => onPlay(track)}
          aria-label={playingNow ? `Pausar ${track.title}` : `Reproducir ${track.title}`}
          className="absolute inset-0 grid place-items-center rounded-lg bg-black/55 opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
          style={{ opacity: playingNow ? 1 : undefined }}
        >
          {playingNow ? (
            <Pause size={18} fill="white" className="text-white" />
          ) : (
            <Play size={18} fill="white" className="ml-0.5 text-white" />
          )}
        </button>
      </div>

      {/* Titulo y artista */}
      <button
        type="button"
        onClick={() => onPlay(track)}
        className="min-w-0 flex-1 text-left"
      >
        <div
          className="truncate text-sm font-semibold"
          style={{ color: isCurrent ? 'var(--accent)' : 'var(--text)' }}
        >
          {track.title}
        </div>
        <div className="mt-0.5 flex items-center gap-2 truncate text-xs text-dim">
          <span className="truncate">{track.artist}</span>
          {track.album && <span className="hidden truncate opacity-70 md:inline">· {track.album}</span>}
        </div>
      </button>

      {/* Fuente */}
      <div className="hidden shrink-0 sm:block">
        <SourceBadge source={track.source} />
      </div>

      {/* Acciones */}
      <div className="flex shrink-0 items-center gap-0.5">
        <IconButton
          label={isFavorite ? 'Quitar de favoritos' : 'Anadir a favoritos'}
          onClick={() => onToggleFavorite(track)}
          className={`hidden sm:inline-flex ${
            isFavorite ? '' : 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100'
          }`}
          style={isFavorite ? { color: 'var(--accent)' } : undefined}
        >
          <Heart size={17} fill={isFavorite ? 'currentColor' : 'none'} />
        </IconButton>

        <IconButton
          label="Descargar en MP3"
          onClick={() => onDownload(track)}
          className="hidden opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100 sm:inline-flex"
        >
          <Download size={17} />
        </IconButton>

        <span className="w-11 shrink-0 text-right text-xs tabular-nums text-dim">
          {track.durationText || formatTime(track.duration)}
        </span>

        {trailing || <TrackMenu track={track} />}
      </div>
    </div>
  );
}

/** Barritas animadas que indican "sonando ahora". */
function EqualizerBars() {
  return (
    <span className="inline-flex h-3 items-end gap-[2px]" aria-label="Sonando">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-[3px] rounded-sm"
          style={{
            background: 'var(--accent)',
            height: '100%',
            animation: `eqBar .9s ease-in-out ${i * 0.15}s infinite alternate`,
          }}
        />
      ))}
    </span>
  );
}

export const ResultCard = memo(ResultCardBase);
export default ResultCard;
