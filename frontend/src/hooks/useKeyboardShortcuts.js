import { useEffect } from 'react';
import toast from 'react-hot-toast';

import { useApp } from '../context/AppContext';

export const SHORTCUTS = [
  { keys: 'Espacio', action: 'Reproducir / pausar' },
  { keys: '←  →', action: 'Retroceder / adelantar 5 s' },
  { keys: '↑  ↓', action: 'Subir / bajar volumen' },
  { keys: 'N  /  P', action: 'Siguiente / anterior' },
  { keys: 'M', action: 'Silenciar' },
  { keys: 'S', action: 'Modo aleatorio' },
  { keys: 'R', action: 'Modo repeticion' },
  { keys: 'Q', action: 'Abrir la cola' },
  { keys: '/', action: 'Ir al buscador' },
  { keys: 'F', action: 'Pantalla completa' },
];

/** Atajos globales. Se desactivan mientras se escribe en un campo de texto. */
export function useKeyboardShortcuts() {
  const {
    toggle, nudge, next, previous, volume, setVolume, toggleMute,
    toggleShuffle, cycleRepeat, setQueueOpen, currentTrack,
  } = useApp();

  useEffect(() => {
    const isTyping = (target) => {
      if (!target) return false;
      const tag = target.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
    };

    const onKeyDown = (event) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      // "/" siempre lleva al buscador, salvo que ya estemos escribiendo.
      if (event.key === '/' && !isTyping(event.target)) {
        event.preventDefault();
        const input = document.querySelector('[data-search-input]');
        if (input) input.focus();
        return;
      }

      if (isTyping(event.target)) return;

      switch (event.key) {
        case ' ':
          event.preventDefault();
          if (currentTrack) toggle();
          break;
        case 'ArrowRight':
          event.preventDefault();
          nudge(5);
          break;
        case 'ArrowLeft':
          event.preventDefault();
          nudge(-5);
          break;
        case 'ArrowUp':
          event.preventDefault();
          setVolume((v) => Math.min(1, Number((v + 0.05).toFixed(2))));
          break;
        case 'ArrowDown':
          event.preventDefault();
          setVolume((v) => Math.max(0, Number((v - 0.05).toFixed(2))));
          break;
        case 'n':
        case 'N':
          next();
          break;
        case 'p':
        case 'P':
          previous();
          break;
        case 'm':
        case 'M':
          toggleMute();
          break;
        case 's':
        case 'S':
          toggleShuffle();
          break;
        case 'r':
        case 'R':
          cycleRepeat();
          break;
        case 'q':
        case 'Q':
          setQueueOpen((open) => !open);
          break;
        case 'f':
        case 'F':
          if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
          else
            document.documentElement.requestFullscreen().catch(() => {
              toast('Tu navegador no permite pantalla completa aqui');
            });
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    toggle, nudge, next, previous, volume, setVolume, toggleMute,
    toggleShuffle, cycleRepeat, setQueueOpen, currentTrack,
  ]);
}
