import { useEffect, useState } from 'react';
import { Clock3, Music2, Search, Sparkles } from 'lucide-react';

import { useApp } from '../context/AppContext';
import * as api from '../services/api';
import SearchBar from './SearchBar';
import ResultList from './ResultList';
import Cover from './common/Cover';

const SUGGESTIONS = [
  'Bad Bunny',
  'Taylor Swift',
  'Eslabon Armado',
  'Coldplay',
  'Karol G',
  'Gustavo Cerati',
  'Bruno Mars',
  'Los Mirlos',
];

/** Pantalla principal: buscador, resultados y descubrimiento. */
export function HomePage() {
  const { query, setQuery, results, searching, searchError, history, topArtists, playAll } = useApp();

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:py-8">
      <SearchBar />

      <div className="tour-results mt-7">
        {query.trim() ? (
          <>
            {searchError && !searching && results.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-sm text-dim">{searchError}</p>
              </div>
            ) : (
              <ResultList
                tracks={results}
                loading={searching}
                emptyIcon={Search}
                emptyTitle="Sin resultados"
                emptyDescription="Prueba con el nombre del artista y la cancion."
                header={
                  results.length
                    ? `${results.length} resultados para "${query.trim()}"`
                    : undefined
                }
              />
            )}
          </>
        ) : (
          <Discover
            history={history}
            topArtists={topArtists}
            onSuggestion={setQuery}
            playAll={playAll}
          />
        )}
      </div>
    </div>
  );
}

/** Contenido inicial cuando aun no se ha buscado nada. */
function Discover({ history, topArtists, onSuggestion, playAll }) {
  const [recommended, setRecommended] = useState([]);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const seedArtist = topArtists.length ? topArtists[0].artist : '';

  useEffect(() => {
    if (!seedArtist) {
      setRecommended([]);
      return undefined;
    }
    let cancelled = false;
    setLoadingRecs(true);
    api
      .related(seedArtist)
      .then((data) => {
        if (!cancelled) setRecommended(data.results || []);
      })
      .catch(() => {
        if (!cancelled) setRecommended([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingRecs(false);
      });
    return () => {
      cancelled = true;
    };
  }, [seedArtist]);

  const recent = history.slice(0, 6);

  return (
    <div className="space-y-10">
      {/* Bienvenida */}
      <section
        className="relative overflow-hidden rounded-2xl p-6 sm:p-8"
        style={{
          background:
            'linear-gradient(135deg, color-mix(in srgb, var(--accent) 16%, var(--bg-elev)), var(--bg-elev))',
          border: '1px solid var(--border)',
        }}
      >
        <div
          className="absolute -right-16 -top-16 h-56 w-56 rounded-full blur-3xl"
          style={{ background: 'var(--accent)', opacity: 0.16 }}
        />
        <div className="relative">
          <p
            className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em]"
            style={{ color: 'var(--accent)' }}
          >
            Colegio de Alto Rendimiento
          </p>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
            Toda la musica, sin pagar nada.
          </h1>
          <p className="mt-2 max-w-xl text-sm text-dim">
            Busca en Deezer y YouTube desde un solo lugar, arma tus playlists y descarga en MP3.
            Sin cuentas, sin anuncios y sin suscripciones.
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => onSuggestion(suggestion)}
                className="rounded-full px-3 py-1.5 text-xs font-semibold transition-all hover:scale-[1.03]"
                style={{ background: 'var(--bg-soft)', color: 'var(--text)' }}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Escuchado recientemente */}
      {recent.length > 0 && (
        <section>
          <SectionTitle icon={Clock3} title="Escuchado hace poco" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {recent.map((track) => (
              <button
                key={`${track.id}-${track.playedAt}`}
                type="button"
                onClick={() => playAll([track], 0)}
                className="group text-left"
              >
                <Cover
                  src={track.cover}
                  alt={track.title}
                  rounded="rounded-xl"
                  className="aspect-square w-full transition-transform group-hover:scale-[1.03]"
                  iconSize={26}
                />
                <div className="mt-2 truncate text-xs font-semibold text-ink">{track.title}</div>
                <div className="truncate text-[11px] text-dim">{track.artist}</div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Recomendaciones */}
      {seedArtist && (
        <section>
          <SectionTitle
            icon={Sparkles}
            title={`Porque escuchas a ${seedArtist}`}
            hint="Sugerencias de Deezer"
          />
          <ResultList
            tracks={recommended}
            loading={loadingRecs}
            paginate={false}
            showIndex={false}
            emptyIcon={Music2}
            emptyTitle="Aun no hay sugerencias"
            emptyDescription="Escucha algunas canciones y COARIFY aprendera que recomendarte."
          />
        </section>
      )}

      {!seedArtist && recent.length === 0 && (
        <section className="py-8 text-center">
          <Music2 size={40} className="mx-auto mb-3" style={{ color: 'var(--accent)' }} />
          <p className="text-sm text-dim">
            Empieza escribiendo arriba. Tu historial y tus recomendaciones apareceran aqui.
          </p>
        </section>
      )}
    </div>
  );
}

export function SectionTitle({ icon: Icon, title, hint, action }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      {Icon && <Icon size={17} style={{ color: 'var(--accent)' }} />}
      <h2 className="text-base font-bold text-ink">{title}</h2>
      {hint && <span className="text-xs text-dim">· {hint}</span>}
      {action && <div className="ml-auto">{action}</div>}
    </div>
  );
}

export default HomePage;
