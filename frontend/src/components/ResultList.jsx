import { useCallback, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ListPlus, Play, Search as SearchIcon } from 'lucide-react';

import { useApp } from '../context/AppContext';
import Button from './common/Button';
import EmptyState from './common/EmptyState';
import SkeletonRow from './common/SkeletonRow';
import ResultCard from './ResultCard';

const PAGE = 20;

/**
 * Lista de canciones reutilizable (resultados, favoritos, playlists, historial).
 * Muestra de a 20 y crece con "Ver mas" para no pintar cientos de filas.
 */
export function ResultList({
  tracks,
  loading = false,
  emptyTitle = 'Nada por aqui',
  emptyDescription,
  emptyIcon = SearchIcon,
  emptyAction,
  showIndex = true,
  header,
  renderTrailing,
  paginate = true,
}) {
  const { currentTrack, playTrack, playAll, download, toggleFavorite, isFavorite, animations } =
    useApp();
  const [visible, setVisible] = useState(PAGE);

  const shown = useMemo(
    () => (paginate ? tracks.slice(0, visible) : tracks),
    [tracks, visible, paginate]
  );

  const handlePlay = useCallback(
    (track) => playTrack(track, tracks),
    [playTrack, tracks]
  );

  if (loading) {
    return (
      <div className="space-y-1">
        {Array.from({ length: 6 }).map((_, i) => (
          // eslint-disable-next-line react/no-array-index-key
          <SkeletonRow key={i} />
        ))}
      </div>
    );
  }

  if (!tracks.length) {
    return (
      <EmptyState
        icon={emptyIcon}
        title={emptyTitle}
        description={emptyDescription}
        action={emptyAction}
      />
    );
  }

  return (
    <div>
      {header !== null && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-dim">
            {header || `${tracks.length} ${tracks.length === 1 ? 'cancion' : 'canciones'}`}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="accent" size="sm" onClick={() => playAll(tracks, 0)}>
              <Play size={14} fill="currentColor" />
              Reproducir todo
            </Button>
            <Button variant="outline" size="sm" onClick={() => playAll(tracks, 0)} className="hidden sm:inline-flex">
              <ListPlus size={14} />
              Como cola
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-0.5">
        {shown.map((track, i) => {
          const row = (
            <ResultCard
              track={track}
              index={i}
              showIndex={showIndex}
              isCurrent={!!currentTrack && currentTrack.id === track.id}
              isFavorite={isFavorite(track)}
              onPlay={handlePlay}
              onDownload={download}
              onToggleFavorite={toggleFavorite}
              trailing={renderTrailing ? renderTrailing(track, i) : undefined}
            />
          );

          return animations ? (
            <motion.div
              key={track.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, delay: Math.min(i, 12) * 0.02 }}
            >
              {row}
            </motion.div>
          ) : (
            <div key={track.id}>{row}</div>
          );
        })}
      </div>

      {paginate && visible < tracks.length && (
        <div className="mt-4 flex justify-center">
          <Button variant="outline" size="sm" onClick={() => setVisible((v) => v + PAGE)}>
            Ver mas ({tracks.length - visible} restantes)
          </Button>
        </div>
      )}
    </div>
  );
}

export default ResultList;
