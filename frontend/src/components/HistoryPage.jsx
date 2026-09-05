import { Clock3, Search, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { useApp } from '../context/AppContext';
import Button from './common/Button';
import ResultList from './ResultList';
import TrackMenu from './TrackMenu';
import { SectionTitle } from './HomePage';

const relativeTime = (timestamp) => {
  if (!timestamp) return '';
  const diff = Date.now() - timestamp;
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return 'hace un momento';
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.round(hours / 24);
  return days === 1 ? 'ayer' : `hace ${days} dias`;
};

/** Las ultimas 50 canciones reproducidas. */
export function HistoryPage() {
  const { history, clearHistory, topArtists } = useApp();
  const navigate = useNavigate();

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:py-8">
      <SectionTitle
        icon={Clock3}
        title="Historial"
        hint={`ultimas ${history.length} reproducciones`}
        action={
          history.length > 0 && (
            <Button variant="danger" size="sm" onClick={clearHistory}>
              <Trash2 size={14} />
              Borrar
            </Button>
          )
        }
      />

      {topArtists.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {topArtists.map(({ artist, plays }) => (
            <span
              key={artist}
              className="rounded-full px-3 py-1.5 text-xs"
              style={{ background: 'var(--bg-soft)', color: 'var(--text-dim)' }}
            >
              <strong className="text-ink">{artist}</strong> · {plays}
            </span>
          ))}
        </div>
      )}

      <ResultList
        tracks={history}
        showIndex={false}
        emptyIcon={Clock3}
        emptyTitle="Sin historial todavia"
        emptyDescription="Reproduce algo y aparecera aqui automaticamente."
        emptyAction={
          <Button variant="accent" size="sm" onClick={() => navigate('/')}>
            <Search size={14} />
            Buscar musica
          </Button>
        }
        renderTrailing={(track) => (
          <>
            <span className="hidden w-20 shrink-0 text-right text-[11px] text-dim md:block">
              {relativeTime(track.playedAt)}
            </span>
            <TrackMenu track={track} />
          </>
        )}
      />
    </div>
  );
}

export default HistoryPage;
