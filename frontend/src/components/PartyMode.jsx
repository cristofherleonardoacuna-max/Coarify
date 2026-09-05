import { useEffect, useRef } from 'react';

import { useApp, usePlayback } from '../context/AppContext';
import { useAnalyser } from '../hooks/useAnalyser';

/**
 * Modo fiesta: barras de espectro y particulas que reaccionan a la musica.
 * Es puramente decorativo, va detras de la interfaz y no captura clics.
 */
export function PartyMode() {
  const { partyMode, audioRef } = useApp();
  const { isPlaying } = usePlayback();

  const canvasRef = useRef(null);
  const glowRef = useRef(null);
  const particlesRef = useRef([]);
  const accentRef = useRef('#d4af37');
  const chromeHeightRef = useRef(0);

  const active = partyMode && isPlaying;

  /* Lee el acento actual (puede cambiar con cada portada). */
  useEffect(() => {
    if (!partyMode) return undefined;
    const read = () => {
      accentRef.current =
        getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#d4af37';
    };
    read();
    const timer = setInterval(read, 1000);
    return () => clearInterval(timer);
  }, [partyMode]);

  /* Ajusta el canvas al tamano de la ventana. */
  useEffect(() => {
    if (!partyMode) return undefined;
    const resize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      // Alto del reproductor (+ nav movil) para no dibujar debajo de ellos.
      const player = document.querySelector('.tour-player');
      chromeHeightRef.current = player && player.parentElement ? player.parentElement.offsetHeight : 0;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [partyMode]);

  /* Particulas iniciales. */
  useEffect(() => {
    if (!partyMode) {
      particlesRef.current = [];
      return;
    }
    particlesRef.current = Array.from({ length: 42 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: 1 + Math.random() * 2.5,
      vy: 0.15 + Math.random() * 0.5,
      vx: (Math.random() - 0.5) * 0.3,
    }));
  }, [partyMode]);

  useAnalyser(audioRef, active, (data, average) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = window.innerWidth;
    const h = window.innerHeight;
    const accent = accentRef.current;

    ctx.clearRect(0, 0, w, h);

    // El espectro apoya sobre el reproductor, no debajo de el (ahi no se veria).
    const baseline = h - chromeHeightRef.current;

    const bars = 56;
    const barWidth = w / bars;
    ctx.globalAlpha = 0.5;
    for (let i = 0; i < bars; i += 1) {
      const value = data[Math.floor((i / bars) * data.length)] / 255;
      const barHeight = value * h * 0.26;
      const gradient = ctx.createLinearGradient(0, baseline - barHeight, 0, baseline);
      gradient.addColorStop(0, accent);
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.fillRect(i * barWidth + barWidth * 0.15, baseline - barHeight, barWidth * 0.7, barHeight);
    }

    // Particulas que suben mas rapido cuando la musica pega fuerte.
    ctx.globalAlpha = 0.35 + average * 0.4;
    ctx.fillStyle = accent;
    particlesRef.current.forEach((p) => {
      p.y -= p.vy * (1 + average * 5);
      p.x += p.vx;
      if (p.y < -10) {
        p.y = h + 10;
        p.x = Math.random() * w;
      }
      if (p.x < -10) p.x = w + 10;
      if (p.x > w + 10) p.x = -10;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * (1 + average), 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    // Resplandor de fondo al ritmo del promedio.
    if (glowRef.current) {
      glowRef.current.style.setProperty('--party-intensity', String(0.18 + average * 0.75));
    }
  });

  if (!partyMode) return null;

  return (
    <>
      <div ref={glowRef} className="party-glow" aria-hidden="true" />
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0"
        style={{ opacity: active ? 1 : 0, transition: 'opacity .4s ease' }}
      />
    </>
  );
}

export default PartyMode;
