import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ListMusic, Pencil, Play, Plus, Trash2, X } from 'lucide-react';

import { useApp } from '../context/AppContext';
import Button, { IconButton } from './common/Button';
import Cover from './common/Cover';
import EmptyState from './common/EmptyState';
import ResultList from './ResultList';
import { SectionTitle } from './HomePage';

/** Listado de playlists locales. */
export function PlaylistsPage() {
  const { playlists, createPlaylist, deletePlaylist, playAll } = useApp();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');

  const submit = (event) => {
    event.preventDefault();
    if (createPlaylist(name)) {
      setName('');
      setCreating(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:py-8">
      <SectionTitle
        icon={ListMusic}
        title="Tus playlists"
        hint={`${playlists.length} guardadas`}
        action={
          <Button variant="accent" size="sm" onClick={() => setCreating((v) => !v)}>
            <Plus size={14} />
            Nueva
          </Button>
        }
      />

      {creating && (
        <form onSubmit={submit} className="surface mb-6 flex gap-2 p-3">
          <input
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Nombre de la playlist"
            maxLength={60}
            className="min-w-0 flex-1 rounded-lg px-3 py-2 text-sm outline-none"
            style={{ background: 'var(--bg-soft)', color: 'var(--text)' }}
          />
          <Button variant="accent" size="sm" type="submit">
            Crear
          </Button>
          <IconButton label="Cancelar" onClick={() => setCreating(false)}>
            <X size={16} />
          </IconButton>
        </form>
      )}

      {playlists.length === 0 ? (
        <EmptyState
          icon={ListMusic}
          title="Aun no tienes playlists"
          description="Crea una y ve anadiendo canciones desde el menu de cada resultado."
          action={
            <Button variant="accent" size="sm" onClick={() => setCreating(true)}>
              <Plus size={14} />
              Crear la primera
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {playlists.map((playlist) => {
            const cover = playlist.tracks.length ? playlist.tracks[0].cover : '';
            return (
              <div key={playlist.id} className="group relative">
                <button
                  type="button"
                  onClick={() => navigate(`/playlists/${playlist.id}`)}
                  className="w-full text-left"
                >
                  <div className="relative">
                    <Cover
                      src={cover}
                      alt={playlist.name}
                      rounded="rounded-xl"
                      className="aspect-square w-full transition-transform group-hover:scale-[1.02]"
                      iconSize={30}
                    />
                    {playlist.tracks.length > 0 && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          playAll(playlist.tracks, 0);
                        }}
                        aria-label={`Reproducir ${playlist.name}`}
                        className="btn-accent absolute bottom-2 right-2 grid h-10 w-10 place-items-center rounded-full opacity-0 shadow-lg transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                      >
                        <Play size={16} fill="currentColor" className="ml-0.5" />
                      </button>
                    )}
                  </div>
                  <div className="mt-2 truncate text-sm font-semibold text-ink">{playlist.name}</div>
                  <div className="truncate text-[11px] text-dim">
                    {playlist.tracks.length}{' '}
                    {playlist.tracks.length === 1 ? 'cancion' : 'canciones'}
                  </div>
                </button>

                <IconButton
                  label="Eliminar playlist"
                  size="icon-sm"
                  onClick={() => deletePlaylist(playlist.id)}
                  className="absolute right-1 top-1 bg-black/50 text-white opacity-0 backdrop-blur transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                >
                  <Trash2 size={14} />
                </IconButton>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Detalle de una playlist. */
export function PlaylistDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { playlists, renamePlaylist, deletePlaylist, removeFromPlaylist } = useApp();

  const playlist = playlists.find((p) => p.id === id);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(playlist ? playlist.name : '');

  if (!playlist) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
        <EmptyState
          icon={ListMusic}
          title="Esta playlist ya no existe"
          action={
            <Button variant="accent" size="sm" onClick={() => navigate('/playlists')}>
              Volver a playlists
            </Button>
          }
        />
      </div>
    );
  }

  const submitRename = (event) => {
    event.preventDefault();
    renamePlaylist(playlist.id, name);
    setEditing(false);
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:py-8">
      <button
        type="button"
        onClick={() => navigate('/playlists')}
        className="mb-4 inline-flex items-center gap-1.5 text-xs text-dim transition-colors hover:text-ink"
      >
        <ArrowLeft size={14} />
        Playlists
      </button>

      <div className="mb-6 flex items-end gap-4">
        <Cover
          src={playlist.tracks.length ? playlist.tracks[0].cover : ''}
          alt={playlist.name}
          rounded="rounded-2xl"
          className="h-28 w-28 sm:h-36 sm:w-36"
          iconSize={34}
        />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-dim">Playlist</p>
          {editing ? (
            <form onSubmit={submitRename} className="mt-1 flex gap-2">
              <input
                autoFocus
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={60}
                className="min-w-0 flex-1 rounded-lg px-3 py-2 text-lg font-bold outline-none"
                style={{ background: 'var(--bg-soft)', color: 'var(--text)' }}
              />
              <Button variant="accent" size="sm" type="submit">
                Guardar
              </Button>
            </form>
          ) : (
            <h1 className="mt-1 truncate text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
              {playlist.name}
            </h1>
          )}
          <p className="mt-1 text-xs text-dim">
            {playlist.tracks.length} {playlist.tracks.length === 1 ? 'cancion' : 'canciones'}
          </p>

          <div className="mt-3 flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditing((v) => !v)}>
              <Pencil size={13} />
              Renombrar
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                deletePlaylist(playlist.id);
                navigate('/playlists');
              }}
            >
              <Trash2 size={13} />
              Eliminar
            </Button>
          </div>
        </div>
      </div>

      <ResultList
        tracks={playlist.tracks}
        emptyIcon={ListMusic}
        emptyTitle="Esta playlist esta vacia"
        emptyDescription="Anade canciones desde el menu (...) de cualquier resultado."
        renderTrailing={(track) => (
          <IconButton
            label="Quitar de la playlist"
            onClick={() => removeFromPlaylist(playlist.id, track.id)}
          >
            <X size={16} />
          </IconButton>
        )}
      />
    </div>
  );
}

export default PlaylistsPage;
