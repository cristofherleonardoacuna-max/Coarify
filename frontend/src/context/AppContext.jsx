import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import toast from 'react-hot-toast';

import { useAudio } from '../hooks/useAudio';
import { useLocalStorage, clearStored } from '../hooks/useLocalStorage';
import * as api from '../services/api';
import { applyPalette, extractPalette } from '../utils/colorExtractor';

/**
 * Tres contextos en lugar de uno:
 *   AppContext       -> todo lo estable (preferencias, cola, biblioteca, acciones)
 *   PlaybackContext  -> isPlaying / isLoading (cambian pocas veces)
 *   ProgressContext  -> progress / duration (cambian ~4 veces por segundo)
 *
 * Asi el tick del reproductor no vuelve a renderizar la lista de resultados.
 */
const AppContext = createContext(null);
const PlaybackContext = createContext(null);
const ProgressContext = createContext(null);

export const THEMES = [
  { id: 'dark', name: 'Oscuro', hint: 'El clasico de COARIFY' },
  { id: 'light', name: 'Claro', hint: 'Para ambientes iluminados' },
  { id: 'amoled', name: 'AMOLED', hint: 'Negro puro, ahorra bateria' },
  { id: 'dynamic', name: 'Dinamico', hint: 'Colores tomados de la portada' },
];

const HISTORY_LIMIT = 50;
const uid = () => Math.random().toString(36).slice(2, 10);

export function AppProvider({ children }) {
  /* ------------------------------- preferencias ------------------------------ */
  const [theme, setTheme] = useLocalStorage('theme', 'dark');
  const [dynamicColor, setDynamicColor] = useLocalStorage('dynamicColor', true);
  const [partyMode, setPartyMode] = useLocalStorage('partyMode', false);
  const [animations, setAnimations] = useLocalStorage('animations', true);
  const [bitrate, setBitrate] = useLocalStorage('bitrate', '128');
  const [volume, setVolume] = useLocalStorage('volume', 0.85);
  const [muted, setMuted] = useLocalStorage('muted', false);
  const [tutorialSeen, setTutorialSeen] = useLocalStorage('tutorialSeen', false);

  /* -------------------------------- biblioteca ------------------------------- */
  const [favorites, setFavorites] = useLocalStorage('favorites', []);
  const [playlists, setPlaylists] = useLocalStorage('playlists', []);
  const [history, setHistory] = useLocalStorage('history', []);

  /* ------------------------------- reproduccion ------------------------------ */
  const [queue, setQueue] = useLocalStorage('queue', []);
  const [index, setIndex] = useLocalStorage('queueIndex', -1);
  const [shuffle, setShuffle] = useLocalStorage('shuffle', false);
  const [repeat, setRepeat] = useLocalStorage('repeat', 'off'); // off | one | all
  const [queueOpen, setQueueOpen] = useState(false);

  /* --------------------------------- busqueda -------------------------------- */
  const [query, setQuery] = useState('');
  const [source, setSource] = useState('all');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  const currentTrack = index >= 0 && index < queue.length ? queue[index] : null;

  /* ------------------------------- audio nativo ------------------------------ */

  const handleEndedRef = useRef(null);
  const handleEnded = useCallback(() => handleEndedRef.current && handleEndedRef.current(), []);
  const handleError = useCallback(() => {
    toast.error('No se pudo reproducir esta cancion. Prueba con otra version.');
  }, []);

  const audio = useAudio({ onEnded: handleEnded, onError: handleError });
  // Todas estas funciones son estables (useCallback con dependencias vacias).
  const { audioRef, load, play, pause, toggle, seek, nudge, stop } = audio;

  /* Espejo del estado para leerlo desde callbacks estables. */
  const stateRef = useRef({});
  stateRef.current = {
    queue,
    index,
    shuffle,
    repeat,
    currentTrack,
    progress: audio.progress,
  };

  /**
   * Una pista solo empieza a sonar sola si el cambio lo pidio el usuario.
   * Al recargar la pagina la cola se recupera, pero se queda en pausa.
   */
  const autoplayRef = useRef(false);
  const requestPlayback = useCallback(() => {
    autoplayRef.current = true;
  }, []);

  const pickNextIndex = useCallback(() => {
    const { queue: q, index: i, shuffle: sh, repeat: rp } = stateRef.current;
    if (!q.length) return -1;
    if (rp === 'one') return i;

    if (sh) {
      if (q.length === 1) return rp === 'off' ? -1 : 0;
      let candidate = i;
      while (candidate === i) candidate = Math.floor(Math.random() * q.length);
      return candidate;
    }

    if (i + 1 < q.length) return i + 1;
    return rp === 'all' ? 0 : -1;
  }, []);

  handleEndedRef.current = () => {
    const { index: i } = stateRef.current;
    const target = pickNextIndex();
    if (target === -1) return; // fin de la cola
    if (target === i) {
      seek(0);
      play();
      return;
    }
    requestPlayback();
    setIndex(target);
  };

  /* --------------------------- carga de la pista ----------------------------- */

  const trackId = currentTrack ? currentTrack.id : null;

  useEffect(() => {
    if (!trackId) return;
    const track = stateRef.current.currentTrack;
    const autoplay = autoplayRef.current;
    autoplayRef.current = false;

    load(api.streamUrl(track), { autoplay });
    if (!autoplay) return;

    setHistory((prev) => {
      const first = prev[0];
      if (first && first.id === track.id) return prev;
      return [{ ...track, playedAt: Date.now() }, ...prev].slice(0, HISTORY_LIMIT);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackId, load]);

  /* Volumen */
  useEffect(() => {
    const el = audioRef.current;
    if (el) el.volume = muted ? 0 : Math.min(1, Math.max(0, volume));
  }, [volume, muted, audioRef]);

  /* Tema */
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'light' ? '#f5f7fb' : '#0b0f18');
  }, [theme]);

  /* Colores dinamicos segun la portada */
  const cover = currentTrack ? currentTrack.coverBig || currentTrack.cover : '';
  useEffect(() => {
    const useDynamic = theme === 'dynamic' || dynamicColor;
    if (!useDynamic || !cover) {
      applyPalette(null);
      return undefined;
    }
    let cancelled = false;
    extractPalette(cover, { light: theme === 'light' }).then((palette) => {
      if (!cancelled) applyPalette(palette);
    });
    return () => {
      cancelled = true;
    };
  }, [cover, theme, dynamicColor]);

  /* ------------------------------ cola y acciones ---------------------------- */

  const playTrack = useCallback(
    (track, list) => {
      if (!track) return;
      const { currentTrack: current, queue: q } = stateRef.current;

      if (current && current.id === track.id) {
        seek(0);
        play();
        return;
      }

      requestPlayback();

      if (Array.isArray(list) && list.length) {
        const at = list.findIndex((t) => t.id === track.id);
        setQueue(list);
        setIndex(at === -1 ? 0 : at);
        return;
      }

      const existing = q.findIndex((t) => t.id === track.id);
      if (existing !== -1) {
        setIndex(existing);
        return;
      }
      setQueue([...q, track]);
      setIndex(q.length);
    },
    [seek, play, setQueue, setIndex, requestPlayback]
  );

  const playAll = useCallback(
    (list, startAt = 0) => {
      if (!list || !list.length) return;
      requestPlayback();
      setQueue(list);
      setIndex(Math.min(Math.max(0, startAt), list.length - 1));
      toast.success(`Reproduciendo ${list.length} canciones`);
    },
    [setQueue, setIndex, requestPlayback]
  );

  const addToQueue = useCallback(
    (track) => {
      const { queue: q, index: i } = stateRef.current;
      if (q.some((t) => t.id === track.id)) {
        toast('Ya esta en la cola');
        return;
      }
      setQueue([...q, track]);
      if (i === -1) {
        requestPlayback();
        setIndex(q.length);
      }
      toast.success('Anadida a la cola');
    },
    [setQueue, setIndex, requestPlayback]
  );

  const removeFromQueue = useCallback(
    (position) => {
      const { queue: q, index: i } = stateRef.current;
      const nextQueue = q.filter((_, at) => at !== position);
      setQueue(nextQueue);

      if (position < i) setIndex(i - 1);
      else if (position === i) setIndex(nextQueue.length ? Math.min(i, nextQueue.length - 1) : -1);
    },
    [setQueue, setIndex]
  );

  const moveInQueue = useCallback(
    (from, to) => {
      const { queue: q, index: i } = stateRef.current;
      if (to < 0 || to >= q.length || from === to) return;

      const nextQueue = [...q];
      const [item] = nextQueue.splice(from, 1);
      nextQueue.splice(to, 0, item);
      setQueue(nextQueue);

      if (i === from) setIndex(to);
      else if (from < i && to >= i) setIndex(i - 1);
      else if (from > i && to <= i) setIndex(i + 1);
    },
    [setQueue, setIndex]
  );

  const clearQueue = useCallback(() => {
    stop();
    setQueue([]);
    setIndex(-1);
    toast('Cola vaciada');
  }, [stop, setQueue, setIndex]);

  const next = useCallback(() => {
    const { index: i } = stateRef.current;
    const target = pickNextIndex();
    if (target === -1) return;
    if (target === i) {
      seek(0);
      play();
      return;
    }
    requestPlayback();
    setIndex(target);
  }, [pickNextIndex, seek, play, setIndex, requestPlayback]);

  const previous = useCallback(() => {
    // Como en Spotify: si la cancion ya avanzo, el boton la reinicia.
    const { progress, index: i, repeat: rp, queue: q } = stateRef.current;
    if (progress > 3) {
      seek(0);
      return;
    }
    requestPlayback();
    if (i > 0) setIndex(i - 1);
    else if (rp === 'all' && q.length) setIndex(q.length - 1);
    else seek(0);
  }, [seek, setIndex, requestPlayback]);

  const cycleRepeat = useCallback(() => {
    setRepeat((r) => (r === 'off' ? 'all' : r === 'all' ? 'one' : 'off'));
  }, [setRepeat]);

  const toggleShuffle = useCallback(() => setShuffle((s) => !s), [setShuffle]);
  const toggleMute = useCallback(() => setMuted((m) => !m), [setMuted]);

  /* ------------------- controles del sistema (Media Session) ------------------ */

  useEffect(() => {
    if (!('mediaSession' in navigator) || !currentTrack) return;
    try {
      // eslint-disable-next-line no-undef
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title,
        artist: currentTrack.artist,
        album: currentTrack.album || 'COARIFY',
        artwork: [96, 192, 512].map((size) => ({
          src: currentTrack.coverBig || currentTrack.cover,
          sizes: `${size}x${size}`,
          type: 'image/jpeg',
        })),
      });
    } catch (_) {
      /* MediaMetadata no soportado */
    }
  }, [currentTrack]);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return undefined;
    const handlers = {
      play,
      pause,
      nexttrack: next,
      previoustrack: previous,
      seekbackward: () => nudge(-10),
      seekforward: () => nudge(10),
    };
    Object.entries(handlers).forEach(([action, fn]) => {
      try {
        navigator.mediaSession.setActionHandler(action, fn);
      } catch (_) {
        /* accion no soportada por el navegador */
      }
    });
    return () => {
      Object.keys(handlers).forEach((action) => {
        try {
          navigator.mediaSession.setActionHandler(action, null);
        } catch (_) {
          /* ignorado */
        }
      });
    };
  }, [play, pause, next, previous, nudge]);

  /* --------------------------------- favoritos ------------------------------- */

  const favoriteIds = useMemo(() => new Set(favorites.map((t) => t.id)), [favorites]);
  const isFavorite = useCallback((track) => !!track && favoriteIds.has(track.id), [favoriteIds]);

  const toggleFavorite = useCallback(
    (track) => {
      if (!track) return;
      setFavorites((prev) => {
        const exists = prev.some((t) => t.id === track.id);
        return exists ? prev.filter((t) => t.id !== track.id) : [track, ...prev];
      });
      toast(favoriteIds.has(track.id) ? 'Quitada de favoritos' : 'Anadida a favoritos', {
        icon: favoriteIds.has(track.id) ? '💔' : '💛',
      });
    },
    [setFavorites, favoriteIds]
  );

  /* --------------------------------- playlists ------------------------------- */

  const createPlaylist = useCallback(
    (name, tracks = []) => {
      const clean = String(name || '').trim();
      if (!clean) return null;
      const playlist = { id: uid(), name: clean, tracks, createdAt: Date.now() };
      setPlaylists((prev) => [playlist, ...prev]);
      toast.success(`Playlist "${clean}" creada`);
      return playlist;
    },
    [setPlaylists]
  );

  const deletePlaylist = useCallback(
    (id) => {
      setPlaylists((prev) => prev.filter((p) => p.id !== id));
      toast('Playlist eliminada');
    },
    [setPlaylists]
  );

  const renamePlaylist = useCallback(
    (id, name) => {
      const clean = String(name || '').trim();
      if (!clean) return;
      setPlaylists((prev) => prev.map((p) => (p.id === id ? { ...p, name: clean } : p)));
    },
    [setPlaylists]
  );

  const addToPlaylist = useCallback(
    (playlistId, track) => {
      const target = playlists.find((p) => p.id === playlistId);
      if (!target) return;
      if (target.tracks.some((t) => t.id === track.id)) {
        toast('Esa cancion ya esta en la playlist');
        return;
      }
      setPlaylists((prev) =>
        prev.map((p) => (p.id === playlistId ? { ...p, tracks: [...p.tracks, track] } : p))
      );
      toast.success(`Anadida a "${target.name}"`);
    },
    [playlists, setPlaylists]
  );

  const removeFromPlaylist = useCallback(
    (playlistId, trackIdToRemove) => {
      setPlaylists((prev) =>
        prev.map((p) =>
          p.id === playlistId
            ? { ...p, tracks: p.tracks.filter((t) => t.id !== trackIdToRemove) }
            : p
        )
      );
    },
    [setPlaylists]
  );

  const saveQueueAsPlaylist = useCallback(
    (name) => {
      const { queue: q } = stateRef.current;
      if (!q.length) {
        toast.error('La cola esta vacia');
        return;
      }
      createPlaylist(name, q);
    },
    [createPlaylist]
  );

  const clearHistory = useCallback(() => {
    setHistory([]);
    toast('Historial borrado');
  }, [setHistory]);

  /* --------------------------------- descargas ------------------------------- */

  const download = useCallback(
    (track) => {
      if (!track) return;
      const link = document.createElement('a');
      link.href = api.downloadUrl(track, bitrate);
      link.rel = 'noopener';
      link.download = `${track.artist} - ${track.title}.mp3`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success(`Convirtiendo "${track.title}" a MP3 ${bitrate} kbps...`, { duration: 5000 });
    },
    [bitrate]
  );

  /* --------------------------------- busqueda -------------------------------- */

  const abortRef = useRef(null);

  const runSearch = useCallback(async (text, src = 'all') => {
    const clean = String(text || '').trim();

    if (abortRef.current) abortRef.current.abort();

    if (!clean) {
      setResults([]);
      setSearchError('');
      setSearching(false);
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;

    setSearching(true);
    setSearchError('');
    try {
      const data = await api.search(clean, src, controller.signal);
      setResults(data.results || []);
      if (!data.results || !data.results.length)
        setSearchError('Sin resultados. Prueba con otras palabras.');
    } catch (err) {
      if (err.name === 'AbortError') return;
      setResults([]);
      setSearchError(err.message || 'No se pudo completar la busqueda');
    } finally {
      if (abortRef.current === controller) {
        setSearching(false);
        abortRef.current = null;
      }
    }
  }, []);

  /* --------------------------- datos derivados ------------------------------- */

  const topArtists = useMemo(() => {
    const counts = new Map();
    history.forEach((t) => counts.set(t.artist, (counts.get(t.artist) || 0) + 1));
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([artist, plays]) => ({ artist, plays }));
  }, [history]);

  const resetEverything = useCallback(() => {
    stop();
    clearStored();
    window.location.reload();
  }, [stop]);

  /* --------------------------------- contextos ------------------------------- */

  const appValue = useMemo(
    () => ({
      // preferencias
      theme, setTheme,
      dynamicColor, setDynamicColor,
      partyMode, setPartyMode,
      animations, setAnimations,
      bitrate, setBitrate,
      volume, setVolume,
      muted, setMuted, toggleMute,
      tutorialSeen, setTutorialSeen,

      // reproductor
      audioRef, play, pause, toggle, seek, nudge, stop,
      currentTrack,

      // cola
      queue, index, shuffle, toggleShuffle, repeat, cycleRepeat,
      queueOpen, setQueueOpen,
      playTrack, playAll, addToQueue, removeFromQueue, moveInQueue, clearQueue,
      next, previous,

      // biblioteca
      favorites, isFavorite, toggleFavorite,
      playlists, createPlaylist, deletePlaylist, renamePlaylist,
      addToPlaylist, removeFromPlaylist, saveQueueAsPlaylist,
      history, clearHistory, topArtists,

      // busqueda
      query, setQuery, source, setSource, results, searching, searchError, runSearch,

      // varios
      download, resetEverything,
    }),
    [
      theme, setTheme, dynamicColor, setDynamicColor, partyMode, setPartyMode,
      animations, setAnimations, bitrate, setBitrate, volume, setVolume,
      muted, setMuted, toggleMute, tutorialSeen, setTutorialSeen,
      audioRef, play, pause, toggle, seek, nudge, stop, currentTrack,
      queue, index, shuffle, toggleShuffle, repeat, cycleRepeat, queueOpen,
      playTrack, playAll, addToQueue, removeFromQueue, moveInQueue, clearQueue,
      next, previous, favorites, isFavorite, toggleFavorite, playlists,
      createPlaylist, deletePlaylist, renamePlaylist, addToPlaylist,
      removeFromPlaylist, saveQueueAsPlaylist, history, clearHistory, topArtists,
      query, source, results, searching, searchError, runSearch,
      download, resetEverything,
    ]
  );

  const playbackValue = useMemo(
    () => ({ isPlaying: audio.isPlaying, isLoading: audio.isLoading }),
    [audio.isPlaying, audio.isLoading]
  );

  const progressValue = useMemo(
    () => ({ progress: audio.progress, duration: audio.duration }),
    [audio.progress, audio.duration]
  );

  return (
    <AppContext.Provider value={appValue}>
      <PlaybackContext.Provider value={playbackValue}>
        <ProgressContext.Provider value={progressValue}>{children}</ProgressContext.Provider>
      </PlaybackContext.Provider>
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp debe usarse dentro de <AppProvider>');
  return ctx;
}

/** Estado grueso: sonando / cargando. */
export function usePlayback() {
  const ctx = useContext(PlaybackContext);
  if (!ctx) throw new Error('usePlayback debe usarse dentro de <AppProvider>');
  return ctx;
}

/** Tiempo transcurrido y duracion. Se actualiza varias veces por segundo. */
export function useProgress() {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error('useProgress debe usarse dentro de <AppProvider>');
  return ctx;
}
