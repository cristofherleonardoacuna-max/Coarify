/**
 * Extrae la paleta dominante de la portada y la aplica como acento de la
 * interfaz (tema "dinamico", al estilo Spicetify).
 *
 * La portada se pide a traves de /api/image para que llegue con cabeceras
 * CORS: sin eso el canvas queda "manchado" y ColorThief no puede leerlo.
 */

import ColorThief from 'colorthief';
import { proxiedCover } from '../services/api';

const DEFAULT_ACCENT = '#d4af37';
const DEFAULT_ACCENT_2 = '#25406f';

/* ----------------------------- conversiones ----------------------------- */

function rgbToHsl([r, g, b]) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;

  if (max === min) return [0, 0, l];

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
  else if (max === gn) h = ((bn - rn) / d + 2) / 6;
  else h = ((rn - gn) / d + 4) / 6;

  return [h, s, l];
}

function hslToHex([h, s, l]) {
  const f = (n) => {
    const k = (n + h * 12) % 12;
    const a = s * Math.min(l, 1 - l);
    const c = l - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)));
    return Math.round(255 * c)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/** Luminancia relativa (WCAG) para decidir el color del texto sobre el acento. */
function luminance([r, g, b]) {
  const channel = (v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/**
 * Lleva un color a un rango usable como acento.
 * En tema claro se oscurece para que siga leyendose sobre fondo blanco.
 */
function toAccent(rgb, light) {
  const [h, s, l] = rgbToHsl(rgb);
  const saturation = Math.min(1, Math.max(s, 0.45));
  const lightness = light
    ? Math.min(0.46, Math.max(l, 0.3))
    : Math.min(0.72, Math.max(l, 0.52));
  return hslToHex([h, saturation, lightness]);
}

function toSecondary(rgb, light) {
  const [h, s, l] = rgbToHsl(rgb);
  const saturation = Math.min(0.85, Math.max(s, 0.35));
  const lightness = light ? Math.min(0.62, Math.max(l, 0.45)) : Math.min(0.5, Math.max(l, 0.28));
  return hslToHex([h, saturation, lightness]);
}

/* ------------------------------- extraccion ------------------------------ */

const memo = new Map();

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('No se pudo cargar la portada'));
    img.src = src;
  });
}

/**
 * Devuelve { accent, accent2, ink } a partir de la URL de una portada.
 * Nunca lanza: si algo falla entrega la paleta institucional del COAR.
 */
export async function extractPalette(coverUrl, { light = false } = {}) {
  const fallback = light
    ? { accent: '#1a2b4c', accent2: '#d4af37', ink: '#ffffff' }
    : { accent: DEFAULT_ACCENT, accent2: DEFAULT_ACCENT_2, ink: '#10182a' };

  if (!coverUrl) return fallback;

  const key = `${light ? 'l' : 'd'}|${coverUrl}`;
  if (memo.has(key)) return memo.get(key);

  try {
    const img = await loadImage(proxiedCover(coverUrl));
    const thief = new ColorThief();
    const palette = thief.getPalette(img, 6) || [];
    if (!palette.length) throw new Error('paleta vacia');

    // El color mas "vivo" manda; el segundo aporta profundidad al fondo.
    const scored = [...palette].sort((a, b) => {
      const [, sa, la] = rgbToHsl(a);
      const [, sb, lb] = rgbToHsl(b);
      return sb * (1 - Math.abs(lb - 0.55)) - sa * (1 - Math.abs(la - 0.55));
    });

    const accent = toAccent(scored[0], light);
    const accent2 = toSecondary(scored[1] || scored[0], light);
    // El texto sobre el acento: negro si el acento es claro, blanco si es oscuro.
    const ink = luminance(hexToRgb(accent)) > 0.4 ? '#10182a' : '#ffffff';

    const result = { accent, accent2, ink };
    if (memo.size > 120) memo.clear();
    memo.set(key, result);
    return result;
  } catch (_) {
    return fallback;
  }
}

function hexToRgb(hex) {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

/** Escribe (o limpia) los acentos dinamicos sobre :root. */
export function applyPalette(palette) {
  const root = document.documentElement;
  if (!palette) {
    root.style.removeProperty('--accent');
    root.style.removeProperty('--accent-2');
    root.style.removeProperty('--accent-ink');
    return;
  }
  root.style.setProperty('--accent', palette.accent);
  root.style.setProperty('--accent-2', palette.accent2);
  root.style.setProperty('--accent-ink', palette.ink);
}
