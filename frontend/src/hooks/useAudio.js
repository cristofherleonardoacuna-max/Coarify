import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Envuelve un elemento <audio> nativo y expone su estado a React.
 * Vive fuera del arbol de componentes para que la reproduccion no se corte
 * al navegar entre paginas.
 */
export function useAudio({ onEnded, onError } = {}) {
  const audioRef = useRef(null);
  if (audioRef.current === null && typeof window !== 'undefined') {
    const el = new Audio();
    el.preload = 'auto';
    el.crossOrigin = 'anonymous'; // necesario para el analizador del modo fiesta
    audioRef.current = el;
  }

  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  const endedRef = useRef(onEnded);
  const errorRef = useRef(onError);
  endedRef.current = onEnded;
  errorRef.current = onError;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return undefined;

    const onTime = () => setProgress(audio.currentTime || 0);
    const onMeta = () => setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onWaiting = () => setIsLoading(true);
    const onPlaying = () => setIsLoading(false);
    const onCanPlay = () => setIsLoading(false);
    const onEndedEvt = () => {
      setIsPlaying(false);
      if (endedRef.current) endedRef.current();
    };
    const onErrorEvt = () => {
      setIsLoading(false);
      setIsPlaying(false);
      if (errorRef.current) errorRef.current(audio.error);
    };

    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('durationchange', onMeta);
    audio.addEventListener('loadedmetadata', onMeta);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('playing', onPlaying);
    audio.addEventListener('canplay', onCanPlay);
    audio.addEventListener('ended', onEndedEvt);
    audio.addEventListener('error', onErrorEvt);

    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('durationchange', onMeta);
      audio.removeEventListener('loadedmetadata', onMeta);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('playing', onPlaying);
      audio.removeEventListener('canplay', onCanPlay);
      audio.removeEventListener('ended', onEndedEvt);
      audio.removeEventListener('error', onErrorEvt);
    };
  }, []);

  /** Carga una fuente nueva y (opcionalmente) empieza a sonar. */
  const load = useCallback((src, { autoplay = true } = {}) => {
    const audio = audioRef.current;
    if (!audio) return;

    setProgress(0);
    setDuration(0);
    setIsLoading(true);
    audio.src = src;
    audio.load();

    if (autoplay) {
      const attempt = audio.play();
      if (attempt && attempt.catch) {
        attempt.catch((err) => {
          // El navegador puede bloquear el autoplay hasta la primera interaccion.
          if (err && err.name !== 'AbortError') setIsPlaying(false);
          setIsLoading(false);
        });
      }
    }
  }, []);

  const play = useCallback(() => {
    const attempt = audioRef.current && audioRef.current.play();
    if (attempt && attempt.catch) attempt.catch(() => setIsPlaying(false));
  }, []);

  const pause = useCallback(() => {
    if (audioRef.current) audioRef.current.pause();
  }, []);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !audio.src) return;
    if (audio.paused) play();
    else pause();
  }, [play, pause]);

  const seek = useCallback((seconds) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(seconds)) return;
    try {
      audio.currentTime = Math.max(0, seconds);
      setProgress(audio.currentTime);
    } catch (_) {
      /* la fuente aun no admite seek */
    }
  }, []);

  const nudge = useCallback(
    (delta) => {
      const audio = audioRef.current;
      if (audio) seek((audio.currentTime || 0) + delta);
    },
    [seek]
  );

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
    setProgress(0);
    setDuration(0);
  }, []);

  return {
    audioRef,
    isPlaying,
    isLoading,
    progress,
    duration,
    load,
    play,
    pause,
    toggle,
    seek,
    nudge,
    stop,
  };
}
