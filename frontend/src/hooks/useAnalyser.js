import { useEffect, useRef } from 'react';

/**
 * Conecta el <audio> a un AnalyserNode de la Web Audio API.
 *
 * Un elemento solo admite UN MediaElementSource en toda su vida, asi que el
 * grafo se crea una vez y se guarda en un modulo compartido. Como el audio
 * viene de nuestro propio backend (mismo origen) no hay problema de CORS.
 */

let graph = null;

function ensureGraph(audioEl) {
  if (graph) return graph;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx || !audioEl) return null;

  try {
    const context = new Ctx();
    const source = context.createMediaElementSource(audioEl);
    const analyser = context.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.8;

    source.connect(analyser);
    analyser.connect(context.destination); // sin esto el audio se silencia

    graph = { context, analyser, data: new Uint8Array(analyser.frequencyBinCount) };
    return graph;
  } catch (_) {
    // Si falla, la app sigue funcionando: solo no hay visualizador.
    return null;
  }
}

/**
 * Llama a `onFrame(data, average)` en cada cuadro mientras `active` sea true.
 * `data` son las magnitudes por banda (0-255) y `average` su promedio (0-1).
 */
export function useAnalyser(audioRef, active, onFrame) {
  const frameRef = useRef(0);
  const callbackRef = useRef(onFrame);
  callbackRef.current = onFrame;

  useEffect(() => {
    if (!active) return undefined;

    const built = ensureGraph(audioRef.current);
    if (!built) return undefined;

    const { context, analyser, data } = built;
    if (context.state === 'suspended') context.resume().catch(() => {});

    const tick = () => {
      analyser.getByteFrequencyData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i += 1) sum += data[i];
      callbackRef.current(data, sum / data.length / 255);
      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [active, audioRef]);
}
