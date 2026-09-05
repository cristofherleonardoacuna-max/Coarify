/**
 * COARIFY - Servidor Express
 * -------------------------------------------------------------
 * Actua como puente entre el frontend y las fuentes de musica.
 * No guarda musica ni datos de usuario: solo orquesta peticiones.
 *
 *   GET /api/health              Estado del servicio
 *   GET /api/search?q=           Busqueda unificada Deezer + YouTube
 *   GET /api/resolve?q=          Resuelve un track a una URL de YouTube
 *   GET /api/related?artist=     Recomendaciones basicas via Deezer
 *   GET /api/stream?url=|q=      Stream de audio (soporta Range/seek)
 *   GET /api/download?url=|q=    Descarga en MP3 (conversion con ffmpeg)
 *   GET /api/image?url=          Proxy de portadas con CORS (color dinamico)
 *   GET /*                       Frontend compilado (frontend/dist)
 */

require('dotenv').config();

const path = require('path');
const fs = require('fs');
const { execFile, spawn } = require('child_process');
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const ytdl = require('@distube/ytdl-core');
const yts = require('yt-search');
const ffmpeg = require('fluent-ffmpeg');

try {
  ffmpeg.setFfmpegPath(require('@ffmpeg-installer/ffmpeg').path);
} catch (err) {
  console.warn('[COARIFY] ffmpeg no disponible, la descarga MP3 no funcionara:', err.message);
}

const app = express();
const PORT = process.env.PORT || 3000;
const DIST_DIR = path.join(__dirname, 'frontend', 'dist');

app.use(cors());
app.use(express.json());
app.disable('x-powered-by');

/* ------------------------------------------------------------------ */
/*  Cache en memoria con TTL                                           */
/* ------------------------------------------------------------------ */

const cache = new Map();

function cacheGet(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

function cacheSet(key, value, ttlMs) {
  cache.set(key, { value, expires: Date.now() + ttlMs });
  // Limpieza perezosa para que el mapa no crezca sin control.
  if (cache.size > 500) {
    const now = Date.now();
    for (const [k, v] of cache) if (now > v.expires) cache.delete(k);
  }
  return value;
}

const TTL_SEARCH = 10 * 60 * 1000; // 10 min
const TTL_STREAM = 5 * 60 * 1000; //  5 min (segun especificacion)
const TTL_RESOLVE = 60 * 60 * 1000; // 60 min

/* ------------------------------------------------------------------ */
/*  Extractor de audio                                                 */
/*                                                                     */
/*  yt-dlp va primero porque es el unico que sigue el ritmo de los      */
/*  cambios de YouTube; ytdl-core queda como respaldo si el binario no  */
/*  esta disponible. `npm install` lo descarga en ./bin automaticamente */
/*  (scripts/fetch-ytdlp.js).                                          */
/* ------------------------------------------------------------------ */

const YTDLP_PATH = (() => {
  if (process.env.YTDLP_PATH) return process.env.YTDLP_PATH;
  const local = path.join(__dirname, 'bin', process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp');
  return fs.existsSync(local) ? local : null;
})();

const hasYtdlp = !!YTDLP_PATH;

/**
 * Cookies de YouTube (opcional pero muy recomendable al desplegar).
 * Desde un servidor en la nube, YouTube suele pedir "confirma que no eres un
 * bot". Con las cookies de una sesion iniciada deja de bloquear.
 *
 *   YTDLP_COOKIES      -> ruta a un cookies.txt ya presente en el servidor
 *   YTDLP_COOKIES_B64  -> el mismo archivo codificado en base64 (para Render)
 */
const COOKIES_PATH = (() => {
  if (process.env.YTDLP_COOKIES && fs.existsSync(process.env.YTDLP_COOKIES))
    return process.env.YTDLP_COOKIES;

  if (process.env.YTDLP_COOKIES_B64) {
    try {
      const target = path.join(__dirname, 'bin', 'cookies.txt');
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, Buffer.from(process.env.YTDLP_COOKIES_B64, 'base64'));
      return target;
    } catch (err) {
      console.warn('[COARIFY] No se pudieron escribir las cookies:', err.message);
    }
  }
  return null;
})();

const YTDLP_BASE_ARGS = [
  '--no-playlist',
  '--no-warnings',
  '--quiet',
  '--no-progress',
  '--socket-timeout',
  '15',
  '--retries',
  '3',
  ...(COOKIES_PATH ? ['--cookies', COOKIES_PATH] : []),
];

/** Ejecuta yt-dlp con los argumentos dados y devuelve su JSON. */
function ytdlpJson(args, timeout = 45000) {
  return new Promise((resolve, reject) => {
    execFile(
      YTDLP_PATH,
      [...YTDLP_BASE_ARGS, ...args],
      { maxBuffer: 32 * 1024 * 1024, timeout, windowsHide: true },
      (err, stdout, stderr) => {
        if (err) return reject(new Error(String(stderr || err.message).trim().slice(0, 300)));
        try {
          return resolve(JSON.parse(stdout));
        } catch (parseErr) {
          return reject(new Error('Respuesta ilegible de yt-dlp'));
        }
      }
    );
  });
}

/** Datos del mejor formato de audio de un video. */
function ytdlpInfo(youtubeUrl) {
  return ytdlpJson(['-f', 'bestaudio/best', '--skip-download', '--dump-single-json', youtubeUrl]);
}

/** Busqueda en YouTube. `--flat-playlist` la mantiene rapida (~3 s). */
function ytdlpSearch(query, limit) {
  // La consulta va como argumento suelto: nunca pasa por un shell.
  return ytdlpJson(
    ['--flat-playlist', '--dump-single-json', `ytsearch${limit}:${query}`],
    30000
  );
}

/* ------------------------------------------------------------------ */
/*  Utilidades                                                         */
/* ------------------------------------------------------------------ */

const normalize = (s = '') =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\((?:official|video|audio|lyric|lyrics|hd|4k)[^)]*\)/g, '')
    .replace(/\[(?:official|video|audio|lyric|lyrics|hd|4k)[^\]]*\]/g, '')
    .replace(/\b(official|video|oficial|audio|lyrics?|letra|hd|4k|mv|m\/v)\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const sanitizeFilename = (s = 'coarify') =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120) || 'coarify';

const formatDuration = (seconds) => {
  const s = Math.max(0, Math.round(Number(seconds) || 0));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
};

/* ------------------------------------------------------------------ */
/*  Fuentes de busqueda                                                */
/* ------------------------------------------------------------------ */

async function searchDeezer(q, limit = 15) {
  const { data } = await axios.get('https://api.deezer.com/search', {
    params: { q, limit },
    timeout: 8000,
  });
  if (!data || !Array.isArray(data.data)) return [];

  return data.data
    .filter((t) => t && t.title && t.artist)
    .map((t) => ({
      id: `dz-${t.id}`,
      title: t.title_short || t.title,
      artist: t.artist.name,
      album: t.album ? t.album.title : '',
      cover: (t.album && (t.album.cover_medium || t.album.cover)) || '',
      coverBig: (t.album && (t.album.cover_big || t.album.cover_medium)) || '',
      duration: Number(t.duration) || 0,
      durationText: formatDuration(t.duration),
      source: 'deezer',
      url: '', // Deezer solo entrega preview de 30s: el audio real se resuelve en YouTube
      preview: t.preview || '',
      query: `${t.artist.name} ${t.title_short || t.title}`,
    }));
}

/** Los titulos de YouTube repiten el canal y arrastran etiquetas de ruido. */
function cleanYouTubeTitle(rawTitle, channel) {
  let title = String(rawTitle || '').trim();
  const artist = String(channel || '')
    .replace(/\s*-\s*Topic$/i, '')
    .trim();

  // "Coldplay - Coldplay - Viva La Vida" -> "Viva La Vida"
  if (artist) {
    const escaped = artist.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    title = title.replace(new RegExp(`^\\s*${escaped}\\s*[-–—|:]\\s*`, 'i'), '').trim();
  }

  // Etiquetas de ruido al final: (Official Video), [Lyrics], (Audio)...
  title = title
    .replace(
      /\s*[([]\s*(official\s*)?(music\s*)?(video|audio|lyric[s]?|visualizer|hd|4k|mv)\s*[)\]]\s*$/gi,
      ''
    )
    .replace(/\s*[|]\s*(official\s*)?(video|audio|lyrics?)\s*$/gi, '')
    .trim();

  return title || String(rawTitle || '').trim();
}

/** Da forma de "track" a un video de YouTube, venga de donde venga. */
function toYouTubeTrack({ videoId, title, channel, seconds }) {
  const artist = String(channel || 'YouTube')
    .replace(/\s*-\s*Topic$/i, '')
    .trim();

  return {
    id: `yt-${videoId}`,
    title: cleanYouTubeTitle(title, channel),
    artist,
    album: '',
    cover: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
    // hqdefault existe siempre; maxresdefault falta en muchisimos videos.
    coverBig: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    duration: Number(seconds) || 0,
    durationText: formatDuration(seconds),
    source: 'youtube',
    url: `https://www.youtube.com/watch?v=${videoId}`,
    preview: '',
    query: `${artist} ${title}`.trim(),
  };
}

const isPlayableLength = (seconds) => seconds > 30 && seconds < 60 * 30;

async function searchYouTube(q, limit = 12) {
  if (hasYtdlp) {
    const data = await ytdlpSearch(q, limit + 6);
    return (data.entries || [])
      .filter((e) => e && e.id && isPlayableLength(Number(e.duration)))
      .slice(0, limit)
      .map((e) =>
        toYouTubeTrack({
          videoId: e.id,
          title: e.title,
          channel: e.uploader || e.channel,
          seconds: e.duration,
        })
      );
  }

  // Respaldo. Ojo: yt-search revienta con algunas consultas, por eso hay
  // ademas una red de seguridad para excepciones no capturadas mas abajo.
  const res = await yts({ query: q, category: 'music' });
  return ((res && res.videos) || [])
    .filter((v) => v && v.videoId && isPlayableLength(v.seconds))
    .slice(0, limit)
    .map((v) =>
      toYouTubeTrack({
        videoId: v.videoId,
        title: v.title,
        channel: v.author && v.author.name,
        seconds: v.seconds,
      })
    );
}

/**
 * Une los resultados de ambas fuentes eliminando duplicados
 * (mismo titulo + artista normalizados) y los intercala para que
 * la lista no quede agrupada por proveedor.
 */
function mergeResults(deezer, youtube) {
  const seen = new Set();
  const keep = (list) =>
    list.filter((track) => {
      const key = `${normalize(track.title)}|${normalize(track.artist)}`;
      if (!key.replace('|', '').trim()) return false;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  // Deezer primero: sus metadatos (album, artista limpio, portada) son mejores.
  const dz = keep(deezer);
  const yt = keep(youtube);

  const merged = [];
  const max = Math.max(dz.length, yt.length);
  for (let i = 0; i < max; i += 1) {
    if (dz[i]) merged.push(dz[i]);
    if (yt[i]) merged.push(yt[i]);
  }
  return merged;
}

/* ------------------------------------------------------------------ */
/*  GET /api/health                                                    */
/* ------------------------------------------------------------------ */

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    app: 'COARIFY',
    version: require('./package.json').version,
    extractor: hasYtdlp ? 'yt-dlp' : 'ytdl-core (respaldo)',
    cookies: !!COOKIES_PATH,
    frontendBuilt: fs.existsSync(path.join(DIST_DIR, 'index.html')),
    uptime: Math.round(process.uptime()),
  });
});

/* ------------------------------------------------------------------ */
/*  GET /api/search                                                    */
/* ------------------------------------------------------------------ */

app.get('/api/search', async (req, res) => {
  const q = String(req.query.q || '').trim();
  const source = String(req.query.source || 'all');

  if (!q) return res.json({ query: '', results: [], sources: {} });

  const cacheKey = `search:${source}:${normalize(q)}`;
  const cached = cacheGet(cacheKey);
  if (cached) return res.json(cached);

  try {
    const tasks = [
      source === 'youtube' ? Promise.resolve([]) : searchDeezer(q),
      source === 'deezer' ? Promise.resolve([]) : searchYouTube(q),
    ];
    const [dzRes, ytRes] = await Promise.allSettled(tasks);

    const deezer = dzRes.status === 'fulfilled' ? dzRes.value : [];
    const youtube = ytRes.status === 'fulfilled' ? ytRes.value : [];

    if (dzRes.status === 'rejected') console.warn('[search] Deezer fallo:', dzRes.reason.message);
    if (ytRes.status === 'rejected') console.warn('[search] YouTube fallo:', ytRes.reason.message);

    if (!deezer.length && !youtube.length && dzRes.status === 'rejected' && ytRes.status === 'rejected') {
      return res.status(502).json({ error: 'No se pudo consultar ninguna fuente de musica.' });
    }

    const payload = {
      query: q,
      results: mergeResults(deezer, youtube),
      sources: { deezer: deezer.length, youtube: youtube.length },
    };

    cacheSet(cacheKey, payload, TTL_SEARCH);
    res.json(payload);
  } catch (err) {
    console.error('[search]', err);
    res.status(500).json({ error: 'Error al buscar musica', detail: err.message });
  }
});

/* ------------------------------------------------------------------ */
/*  Resolucion de una consulta a un video de YouTube                   */
/* ------------------------------------------------------------------ */

async function resolveToYouTube(query) {
  const key = `resolve:${normalize(query)}`;
  const cached = cacheGet(key);
  if (cached) return cached;

  let videoId = null;

  if (hasYtdlp) {
    const data = await ytdlpSearch(query, 5);
    const entries = (data.entries || []).filter((e) => e && e.id);
    const best = entries.find((e) => isPlayableLength(Number(e.duration))) || entries[0];
    videoId = best ? best.id : null;
  } else {
    const res = await yts({ query, category: 'music' });
    const videos = (res && res.videos) || [];
    const best = videos.find((v) => isPlayableLength(v.seconds)) || videos[0];
    videoId = best ? best.videoId : null;
  }

  if (!videoId) throw new Error(`Sin resultados de audio para: ${query}`);
  return cacheSet(key, `https://www.youtube.com/watch?v=${videoId}`, TTL_RESOLVE);
}

/** Obtiene la URL de YouTube desde ?url= o resolviendo ?q= */
async function resolveRequest(query) {
  const url = String(query.url || '').trim();
  if (url) {
    if (!ytdl.validateURL(url)) throw new Error('URL de YouTube invalida');
    return url;
  }
  const q = String(query.q || '').trim();
  if (!q) throw new Error('Falta el parametro "url" o "q"');
  return resolveToYouTube(q);
}

app.get('/api/resolve', async (req, res) => {
  try {
    const url = await resolveRequest(req.query);
    res.json({ url });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/* ------------------------------------------------------------------ */
/*  GET /api/related  - recomendaciones basicas                        */
/* ------------------------------------------------------------------ */

app.get('/api/related', async (req, res) => {
  const artist = String(req.query.artist || '').trim();
  if (!artist) return res.json({ results: [] });

  const key = `related:${normalize(artist)}`;
  const cached = cacheGet(key);
  if (cached) return res.json(cached);

  try {
    const search = await axios.get('https://api.deezer.com/search/artist', {
      params: { q: artist, limit: 1 },
      timeout: 8000,
    });
    const found = search.data && search.data.data && search.data.data[0];
    if (!found) return res.json({ results: [] });

    const top = await axios.get(`https://api.deezer.com/artist/${found.id}/top`, {
      params: { limit: 10 },
      timeout: 8000,
    });

    const results = (top.data.data || []).map((t) => ({
      id: `dz-${t.id}`,
      title: t.title_short || t.title,
      artist: t.artist.name,
      album: t.album ? t.album.title : '',
      cover: (t.album && (t.album.cover_medium || t.album.cover)) || '',
      coverBig: (t.album && (t.album.cover_big || t.album.cover_medium)) || '',
      duration: Number(t.duration) || 0,
      durationText: formatDuration(t.duration),
      source: 'deezer',
      url: '',
      preview: t.preview || '',
      query: `${t.artist.name} ${t.title_short || t.title}`,
    }));

    const payload = { artist: found.name, results };
    cacheSet(key, payload, TTL_SEARCH);
    res.json(payload);
  } catch (err) {
    console.warn('[related]', err.message);
    res.json({ results: [] });
  }
});

/* ------------------------------------------------------------------ */
/*  GET /api/stream  - audio con soporte de Range (permite adelantar)  */
/* ------------------------------------------------------------------ */

const EXT_MIME = {
  webm: 'audio/webm',
  m4a: 'audio/mp4',
  mp4: 'audio/mp4',
  mp3: 'audio/mpeg',
  opus: 'audio/ogg',
  ogg: 'audio/ogg',
};

/** Cabeceras que googlevideo espera; sin ellas puede responder 403. */
function upstreamHeaders(format, range) {
  const headers = {};
  Object.entries(format.headers || {}).forEach(([name, value]) => {
    if (name.toLowerCase() !== 'range') headers[name] = value;
  });
  if (range) headers.Range = range;
  return headers;
}

async function getAudioFormat(youtubeUrl) {
  const key = `format:${youtubeUrl}`;
  const cached = cacheGet(key);
  if (cached) return cached;

  let format = null;

  if (hasYtdlp) {
    try {
      const info = await ytdlpInfo(youtubeUrl);
      const chosen =
        info.url ||
        (info.requested_downloads && info.requested_downloads[0] && info.requested_downloads[0].url) ||
        (info.requested_formats && info.requested_formats[0] && info.requested_formats[0].url);

      if (chosen) {
        format = {
          url: chosen,
          mimeType: EXT_MIME[info.ext] || 'audio/webm',
          contentLength: info.filesize || info.filesize_approx || null,
          headers: info.http_headers || {},
          title: info.title || '',
          author: info.uploader || info.channel || '',
          duration: info.duration || 0,
        };
      }
    } catch (err) {
      console.warn('[extractor] yt-dlp fallo, se intenta ytdl-core:', err.message);
    }
  }

  if (!format) {
    // Respaldo. YouTube suele bloquearlo, pero cuesta poco intentarlo.
    const info = await ytdl.getInfo(youtubeUrl);
    const chosen = ytdl.chooseFormat(info.formats, { quality: 'highestaudio', filter: 'audioonly' });
    if (!chosen || !chosen.url) throw new Error('No se encontro una pista de audio');

    format = {
      url: chosen.url,
      mimeType: (chosen.mimeType || 'audio/webm').split(';')[0],
      contentLength: chosen.contentLength,
      headers: {},
      title: info.videoDetails.title,
      author: info.videoDetails.author ? info.videoDetails.author.name : '',
      duration: Number(info.videoDetails.lengthSeconds) || 0,
    };
  }

  return cacheSet(key, format, TTL_STREAM);
}

app.get('/api/stream', async (req, res) => {
  try {
    const youtubeUrl = await resolveRequest(req.query);
    const format = await getAudioFormat(youtubeUrl);

    const range = req.headers.range;
    const upstream = await axios.get(format.url, {
      responseType: 'stream',
      timeout: 20000,
      headers: upstreamHeaders(format, range),
      validateStatus: (s) => s >= 200 && s < 400,
    });

    res.status(upstream.status === 206 ? 206 : 200);
    res.setHeader('Content-Type', upstream.headers['content-type'] || format.mimeType);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'no-store');
    if (upstream.headers['content-length'])
      res.setHeader('Content-Length', upstream.headers['content-length']);
    if (upstream.headers['content-range'])
      res.setHeader('Content-Range', upstream.headers['content-range']);

    upstream.data.on('error', (err) => {
      console.warn('[stream] corte de flujo:', err.message);
      res.destroy();
    });
    req.on('close', () => upstream.data.destroy());
    upstream.data.pipe(res);
  } catch (err) {
    console.error('[stream]', err.message);
    if (res.headersSent) return res.destroy();

    // Plan B: yt-dlp escribiendo a stdout. Sin Range, pero suena.
    try {
      const youtubeUrl = await resolveRequest(req.query);
      if (!hasYtdlp) throw new Error('yt-dlp no disponible');

      res.setHeader('Content-Type', 'audio/webm');
      const child = spawn(YTDLP_PATH, [...YTDLP_BASE_ARGS, '-f', 'bestaudio/best', '-o', '-', youtubeUrl], {
        windowsHide: true,
      });
      child.stdout.pipe(res);
      child.on('error', () => res.destroy());
      req.on('close', () => child.kill('SIGKILL'));
      return undefined;
    } catch (fallbackErr) {
      return res
        .status(500)
        .json({ error: 'No se pudo reproducir la cancion', detail: fallbackErr.message });
    }
  }
  return undefined;
});

/* ------------------------------------------------------------------ */
/*  GET /api/download  - conversion a MP3                              */
/* ------------------------------------------------------------------ */

const ALLOWED_BITRATES = new Set(['128', '192', '320']);

app.get('/api/download', async (req, res) => {
  try {
    const youtubeUrl = await resolveRequest(req.query);
    const bitrate = ALLOWED_BITRATES.has(String(req.query.bitrate)) ? String(req.query.bitrate) : '128';

    const info = await getAudioFormat(youtubeUrl).catch(() => null);
    const rawName =
      String(req.query.title || '').trim() ||
      (info ? `${info.author} - ${info.title}` : 'COARIFY');
    const filename = `${sanitizeFilename(rawName)}.mp3`;

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename.replace(/[^\x20-\x7e]/g, '_')}"; filename*=UTF-8''${encodeURIComponent(filename)}`
    );

    // El audio original llega por stdout de yt-dlp y sale de ffmpeg como MP3.
    let child = null;
    let source;

    if (hasYtdlp) {
      child = spawn(YTDLP_PATH, [...YTDLP_BASE_ARGS, '-f', 'bestaudio/best', '-o', '-', youtubeUrl], {
        windowsHide: true,
      });
      child.on('error', (err) => {
        console.error('[download:yt-dlp]', err.message);
        res.destroy();
      });
      child.stderr.on('data', (chunk) => {
        const text = String(chunk).trim();
        if (text) console.warn('[download:yt-dlp]', text.slice(0, 200));
      });
      source = child.stdout;
    } else {
      source = ytdl(youtubeUrl, { filter: 'audioonly', quality: 'highestaudio', highWaterMark: 1 << 25 });
      source.on('error', (err) => {
        console.error('[download:ytdl]', err.message);
        res.destroy();
      });
    }

    const command = ffmpeg(source)
      .audioBitrate(bitrate)
      .audioCodec('libmp3lame')
      .format('mp3')
      // Sin esto, ffmpeg intenta escribir cabeceras al final y falla en un pipe.
      .outputOptions('-write_xing', '0')
      .on('error', (err) => {
        console.error('[download:ffmpeg]', err.message);
        if (!res.headersSent) res.status(500).json({ error: 'Error al convertir a MP3' });
        else res.destroy();
      });

    const cleanup = () => {
      try {
        command.kill('SIGKILL');
      } catch (_) {
        /* ignorado */
      }
      if (child) child.kill('SIGKILL');
    };

    req.on('close', cleanup);
    command.pipe(res, { end: true });
  } catch (err) {
    console.error('[download]', err.message);
    if (!res.headersSent) res.status(500).json({ error: 'No se pudo descargar', detail: err.message });
  }
});

/* ------------------------------------------------------------------ */
/*  GET /api/image  - proxy CORS para extraer colores de la portada    */
/* ------------------------------------------------------------------ */

const IMAGE_HOSTS = [
  'dzcdn.net',
  'deezer.com',
  'ytimg.com',
  'ggpht.com',
  'googleusercontent.com',
];

app.get('/api/image', async (req, res) => {
  const url = String(req.query.url || '');
  try {
    const parsed = new URL(url);
    const allowed =
      parsed.protocol === 'https:' &&
      IMAGE_HOSTS.some((host) => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`));
    if (!allowed) return res.status(400).json({ error: 'Origen de imagen no permitido' });

    const upstream = await axios.get(url, { responseType: 'stream', timeout: 8000 });
    res.setHeader('Content-Type', upstream.headers['content-type'] || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Access-Control-Allow-Origin', '*');
    upstream.data.pipe(res);
  } catch (err) {
    res.status(404).json({ error: 'Portada no disponible' });
  }
});

/* ------------------------------------------------------------------ */
/*  Frontend compilado + catch-all para React Router                   */
/* ------------------------------------------------------------------ */

app.use(express.static(DIST_DIR, { index: false, maxAge: '7d' }));

app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Ruta no encontrada' });

  const indexFile = path.join(DIST_DIR, 'index.html');
  if (!fs.existsSync(indexFile)) {
    return res
      .status(503)
      .type('html')
      .send(
        '<h1>COARIFY</h1><p>El frontend aun no esta compilado.</p>' +
          '<p>Ejecuta <code>npm run build</code> en la raiz del proyecto y recarga esta pagina.</p>'
      );
  }
  res.sendFile(indexFile);
});

/* ------------------------------------------------------------------ */
/*  Red de seguridad                                                   */
/*                                                                     */
/*  Algunas librerias (yt-search entre ellas) lanzan errores desde un   */
/*  callback de stream, fuera de cualquier promesa: sin esto, un solo   */
/*  titulo raro en YouTube tumbaria el servidor entero.                */
/* ------------------------------------------------------------------ */

process.on('uncaughtException', (err) => {
  console.error('[COARIFY] Excepcion no capturada (el servidor sigue):', err.message);
});

process.on('unhandledRejection', (reason) => {
  console.error('[COARIFY] Promesa rechazada sin manejar:', reason && reason.message ? reason.message : reason);
});

app.listen(PORT, () => {
  console.log(`\n  COARIFY escuchando en http://localhost:${PORT}`);
  console.log(`  Extractor de audio: ${hasYtdlp ? `yt-dlp (${YTDLP_PATH})` : 'ytdl-core (respaldo)'}`);
  if (COOKIES_PATH) console.log(`  Cookies de YouTube: ${COOKIES_PATH}`);
  if (!hasYtdlp)
    console.log('  Sugerencia: ejecuta "npm run fetch-ytdlp" para una reproduccion fiable.');
  if (!fs.existsSync(path.join(DIST_DIR, 'index.html')))
    console.log('  (frontend sin compilar: usa "npm run dev" o "npm run build")');
  console.log('');
});
