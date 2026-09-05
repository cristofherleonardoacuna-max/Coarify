import {
  Download,
  Heart,
  ListMusic,
  Loader2,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume1,
  Volume2,
  VolumeX,
} from 'lucide-react';

import { useApp, usePlayback, useProgress } from '../context/AppContext';
import { formatTime } from '../utils/formatTime';
import Cover from './common/Cover';
import Slider from './common/Slider';
import { IconButton } from './common/Button';

/** Reproductor fijo inferior ("Now Playing"). */
export function PlayerControls() {
  const {
    currentTrack, toggle, next, previous, seek,
    shuffle, toggleShuffle, repeat, cycleRepeat,
    volume, setVolume, muted, toggleMute,
    queueOpen, setQueueOpen, queue,
    isFavorite, toggleFavorite, download,
  } = useApp();
  const { isPlaying, isLoading } = usePlayback();
  const { progress, duration } = useProgress();

  const track = currentTrack;
  const total = duration || (track ? track.duration : 0) || 0;
  const VolumeIcon = muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;
  const RepeatIcon = repeat === 'one' ? Repeat1 : Repeat;

  return (
    <div
      className="tour-player relative"
      style={{ background: 'var(--bg-elev)', borderTop: '1px solid var(--border)' }}
    >
      {/* Barra fina decorativa (en pantallas grandes el seek va en el centro) */}
      <div className="hidden h-[3px] w-full sm:block" style={{ background: 'var(--border)' }}>
        <div
          className="h-full transition-[width] duration-200"
          style={{
            width: total ? `${Math.min(100, (progress / total) * 100)}%` : '0%',
            background: 'var(--accent)',
          }}
        />
      </div>

      {/* En movil el seek va arriba: abajo no cabe junto a los controles. */}
      <div className="flex items-center gap-2 px-3 pt-1.5 sm:hidden">
        <span className="w-9 shrink-0 text-right text-[10px] tabular-nums text-dim">
          {formatTime(progress)}
        </span>
        <Slider
          value={progress}
          max={total || 1}
          onChange={seek}
          ariaLabel="Progreso de la cancion"
          className="flex-1"
        />
        <span className="w-9 shrink-0 text-[10px] tabular-nums text-dim">{formatTime(total)}</span>
      </div>

      <div className="mx-auto flex w-full max-w-[1600px] items-center gap-3 px-3 py-2.5 sm:gap-4 sm:px-4 sm:py-3">
        {/* --- Pista actual --- */}
        <div className="flex min-w-0 flex-1 items-center gap-3 lg:w-[30%] lg:flex-none">
          <Cover
            src={track ? track.cover : ''}
            alt={track ? track.title : ''}
            className="h-12 w-12 sm:h-14 sm:w-14"
            iconSize={22}
          />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-ink">
              {track ? track.title : 'Nada sonando'}
            </div>
            <div className="truncate text-xs text-dim">
              {track ? track.artist : 'Busca una cancion para empezar'}
            </div>
          </div>

          {track && (
            <IconButton
              label={isFavorite(track) ? 'Quitar de favoritos' : 'Anadir a favoritos'}
              onClick={() => toggleFavorite(track)}
              className="hidden shrink-0 sm:inline-flex"
              style={isFavorite(track) ? { color: 'var(--accent)' } : undefined}
            >
              <Heart size={17} fill={isFavorite(track) ? 'currentColor' : 'none'} />
            </IconButton>
          )}
        </div>

        {/* --- Controles centrales --- */}
        <div className="flex flex-col items-center gap-1 lg:w-[40%]">
          <div className="flex items-center gap-1 sm:gap-2">
            <IconButton
              label="Modo aleatorio"
              onClick={toggleShuffle}
              className="hidden sm:inline-flex"
              style={shuffle ? { color: 'var(--accent)' } : undefined}
            >
              <Shuffle size={17} />
            </IconButton>

            <IconButton label="Anterior" onClick={previous} disabled={!track}>
              <SkipBack size={19} fill="currentColor" />
            </IconButton>

            <button
              type="button"
              onClick={toggle}
              disabled={!track}
              aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
              className="btn-accent grid h-11 w-11 shrink-0 place-items-center rounded-full disabled:opacity-40"
            >
              {isLoading ? (
                <Loader2 size={19} className="animate-spin" />
              ) : isPlaying ? (
                <Pause size={19} fill="currentColor" />
              ) : (
                <Play size={19} fill="currentColor" className="ml-0.5" />
              )}
            </button>

            <IconButton label="Siguiente" onClick={next} disabled={!track}>
              <SkipForward size={19} fill="currentColor" />
            </IconButton>

            <IconButton
              label={
                repeat === 'off'
                  ? 'Sin repeticion'
                  : repeat === 'all'
                    ? 'Repetir toda la cola'
                    : 'Repetir esta cancion'
              }
              onClick={cycleRepeat}
              className="hidden sm:inline-flex"
              style={repeat !== 'off' ? { color: 'var(--accent)' } : undefined}
            >
              <RepeatIcon size={17} />
            </IconButton>
          </div>

          {/* Barra de progreso con seek */}
          <div className="hidden w-full items-center gap-2 sm:flex">
            <span className="w-10 shrink-0 text-right text-[11px] tabular-nums text-dim">
              {formatTime(progress)}
            </span>
            <Slider
              value={progress}
              max={total || 1}
              onChange={seek}
              ariaLabel="Progreso de la cancion"
              className="flex-1"
            />
            <span className="w-10 shrink-0 text-[11px] tabular-nums text-dim">
              {formatTime(total)}
            </span>
          </div>
        </div>

        {/* --- Volumen, cola y descarga --- */}
        <div className="flex shrink-0 items-center justify-end gap-1 lg:w-[30%]">
          <IconButton
            label="Descargar en MP3"
            onClick={() => download(track)}
            disabled={!track}
            className="tour-download hidden sm:inline-flex"
          >
            <Download size={18} />
          </IconButton>

          <IconButton
            label="Cola de reproduccion"
            onClick={() => setQueueOpen(!queueOpen)}
            className="relative"
            style={queueOpen ? { color: 'var(--accent)' } : undefined}
          >
            <ListMusic size={18} />
            {queue.length > 0 && (
              <span
                className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[9px] font-bold"
                style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}
              >
                {queue.length > 99 ? '99+' : queue.length}
              </span>
            )}
          </IconButton>

          <div className="hidden items-center gap-1.5 md:flex">
            <IconButton label={muted ? 'Activar sonido' : 'Silenciar'} onClick={toggleMute}>
              <VolumeIcon size={18} />
            </IconButton>
            <Slider
              value={muted ? 0 : volume * 100}
              max={100}
              step={1}
              onChange={(v) => {
                setVolume(v / 100);
                if (muted && v > 0) toggleMute();
              }}
              ariaLabel="Volumen"
              className="w-24"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default PlayerControls;
