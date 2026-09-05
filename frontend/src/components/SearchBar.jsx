import { useEffect, useRef } from 'react';
import { Loader2, Search, X } from 'lucide-react';

import { useApp } from '../context/AppContext';
import { useDebounce } from '../hooks/useDebounce';

const FILTERS = [
  { id: 'all', label: 'Todas' },
  { id: 'deezer', label: 'Deezer' },
  { id: 'youtube', label: 'YouTube' },
];

/** Buscador con debounce de 300 ms y filtro por fuente. */
export function SearchBar() {
  const { query, setQuery, source, setSource, runSearch, searching } = useApp();
  const debounced = useDebounce(query, 300);
  const inputRef = useRef(null);
  const lastRun = useRef('');

  useEffect(() => {
    const signature = `${debounced}::${source}`;
    if (signature === lastRun.current) return;
    lastRun.current = signature;
    runSearch(debounced, source);
  }, [debounced, source, runSearch]);

  return (
    <div className="tour-search">
      <div
        className="flex items-center gap-3 rounded-2xl px-4 transition-colors focus-within:ring-2"
        style={{
          background: 'var(--bg-elev)',
          border: '1px solid var(--border)',
          '--tw-ring-color': 'var(--accent)',
        }}
      >
        <Search size={18} className="shrink-0 text-dim" />
        <input
          ref={inputRef}
          data-search-input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              lastRun.current = `${query}::${source}`;
              runSearch(query, source);
            }
            if (event.key === 'Escape') event.currentTarget.blur();
          }}
          placeholder="Busca una cancion, artista o album..."
          aria-label="Buscar musica"
          enterKeyHint="search"
          className="h-14 min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-[color:var(--text-dim)]"
          style={{ color: 'var(--text)' }}
        />

        {searching && <Loader2 size={17} className="shrink-0 animate-spin text-dim" />}

        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              if (inputRef.current) inputRef.current.focus();
            }}
            aria-label="Limpiar busqueda"
            className="shrink-0 rounded-full p-1 text-dim transition-colors hover:text-ink"
          >
            <X size={17} />
          </button>
        )}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <span className="hidden text-xs text-dim sm:inline">Fuente:</span>
        {FILTERS.map((filter) => {
          const active = source === filter.id;
          return (
            <button
              key={filter.id}
              type="button"
              onClick={() => setSource(filter.id)}
              className="rounded-full px-3 py-1 text-xs font-semibold transition-all"
              style={
                active
                  ? { background: 'var(--accent)', color: 'var(--accent-ink)' }
                  : { background: 'var(--bg-soft)', color: 'var(--text-dim)' }
              }
            >
              {filter.label}
            </button>
          );
        })}
        <span className="ml-auto hidden text-[11px] text-dim md:inline">
          Pulsa <kbd className="rounded border border-line px-1">/</kbd> para buscar
        </span>
      </div>
    </div>
  );
}

export default SearchBar;
