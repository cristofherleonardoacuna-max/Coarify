/** Cliente del backend de COARIFY. */

const BASE = '/api';

async function request(path, { signal } = {}) {
  const res = await fetch(`${BASE}${path}`, { signal });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.error || detail;
    } catch (_) {
      /* respuesta no-JSON */
    }
    throw new Error(detail);
  }
  return res.json();
}

/** Busqueda unificada. `source` puede ser 'all' | 'deezer' | 'youtube'. */
export function search(query, source = 'all', signal) {
  return request(`/search?q=${encodeURIComponent(query)}&source=${source}`, { signal });
}

/** Canciones populares de un artista (recomendaciones basicas). */
export function related(artist, signal) {
  return request(`/related?artist=${encodeURIComponent(artist)}`, { signal });
}

export function health() {
  return request('/health');
}

/**
 * Parametros que identifican una pista para el backend:
 * YouTube manda la URL directa, Deezer manda el texto a resolver.
 */
function trackParams(track) {
  if (!track) return '';
  if (track.source === 'youtube' && track.url) return `url=${encodeURIComponent(track.url)}`;
  return `q=${encodeURIComponent(track.query || `${track.artist} ${track.title}`)}`;
}

/** URL de streaming (soporta Range, por eso se puede adelantar). */
export function streamUrl(track) {
  return `${BASE}/stream?${trackParams(track)}`;
}

/** URL de descarga en MP3. */
export function downloadUrl(track, bitrate = '128') {
  const name = encodeURIComponent(`${track.artist} - ${track.title}`);
  return `${BASE}/download?${trackParams(track)}&title=${name}&bitrate=${bitrate}`;
}

/** Portada servida por nuestro proxy: habilita CORS para extraer colores. */
export function proxiedCover(url) {
  if (!url) return '';
  return `${BASE}/image?url=${encodeURIComponent(url)}`;
}
