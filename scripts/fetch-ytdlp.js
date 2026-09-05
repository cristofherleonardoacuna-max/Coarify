/**
 * Descarga el binario oficial de yt-dlp en ./bin.
 *
 * Se ejecuta en el postinstall. yt-dlp es el unico extractor que hoy sigue
 * el ritmo de los cambios de YouTube; ytdl-core queda como respaldo.
 * El binario es autonomo: no necesita Python instalado.
 *
 *   node scripts/fetch-ytdlp.js [--force]
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const BIN_DIR = path.join(__dirname, '..', 'bin');

const ASSETS = {
  win32: 'yt-dlp.exe',
  darwin: 'yt-dlp_macos',
  linux: process.arch === 'arm64' ? 'yt-dlp_linux_aarch64' : 'yt-dlp_linux',
};

function targetPath() {
  return path.join(BIN_DIR, process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp');
}

function download(url, dest, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > 6) return reject(new Error('Demasiadas redirecciones'));

    https
      .get(url, { headers: { 'User-Agent': 'coarify-setup' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume();
          return resolve(download(res.headers.location, dest, redirects + 1));
        }
        if (res.statusCode !== 200) {
          res.resume();
          return reject(new Error(`HTTP ${res.statusCode} al descargar yt-dlp`));
        }

        const total = Number(res.headers['content-length']) || 0;
        let received = 0;
        const file = fs.createWriteStream(dest);

        res.on('data', (chunk) => {
          received += chunk.length;
          if (total && process.stdout.isTTY) {
            process.stdout.write(`\r  yt-dlp: ${Math.round((received / total) * 100)}%   `);
          }
        });

        res.pipe(file);
        file.on('finish', () => file.close(() => resolve(received)));
        file.on('error', reject);
        return undefined;
      })
      .on('error', reject);
  });
}

async function main() {
  const asset = ASSETS[process.platform];
  if (!asset) {
    console.warn(`[coarify] Plataforma ${process.platform} sin binario de yt-dlp. Se usara ytdl-core.`);
    return;
  }

  const dest = targetPath();
  const force = process.argv.includes('--force');

  if (!force && fs.existsSync(dest) && fs.statSync(dest).size > 1_000_000) {
    console.log('  yt-dlp ya esta presente (usa --force para actualizarlo)');
    return;
  }

  fs.mkdirSync(BIN_DIR, { recursive: true });
  const url = `https://github.com/yt-dlp/yt-dlp/releases/latest/download/${asset}`;
  console.log(`  descargando ${asset}...`);

  const tmp = `${dest}.part`;
  try {
    await download(url, tmp);
    fs.renameSync(tmp, dest);
    if (process.platform !== 'win32') fs.chmodSync(dest, 0o755);
    console.log(`\r  yt-dlp listo en bin/${path.basename(dest)}          `);
  } catch (err) {
    try {
      fs.unlinkSync(tmp);
    } catch (_) {
      /* ignorado */
    }
    // No rompemos la instalacion: el servidor caera al respaldo ytdl-core.
    console.warn(`[coarify] No se pudo descargar yt-dlp: ${err.message}`);
    console.warn('[coarify] La reproduccion usara ytdl-core, que puede fallar.');
  }
}

main();
