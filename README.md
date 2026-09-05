<div align="center">

<img src="frontend/public/icons/icon-192.png" width="96" alt="COARIFY" />

# COARIFY

**Reproductor musical libre del Colegio de Alto Rendimiento.**
Busca en Deezer y YouTube desde un solo lugar, escucha sin límites y descarga en MP3.
Sin cuentas, sin anuncios, sin suscripciones.

</div>

---

## Qué es

COARIFY es una aplicación web (instalable como PWA) que unifica el catálogo de **Deezer**
—de donde salen las portadas, los álbumes y los metadatos limpios— con el de **YouTube**
—de donde sale el audio—. Todo lo tuyo (favoritos, playlists, historial y preferencias) se
guarda **solo en tu navegador**: el servidor no almacena absolutamente nada.

### Funciona hoy

| | |
|---|---|
| 🔎 **Búsqueda unificada** | Deezer + YouTube en paralelo, sin duplicados, con etiqueta de origen |
| ▶️ **Reproducción continua** | Cola, aleatorio, repetición (una / todas), avance automático |
| ⏩ **Adelantar de verdad** | El backend reenvía cabeceras `Range`, así que la barra de progreso salta al instante |
| ⬇️ **Descarga en MP3** | Conversión con ffmpeg a 128 / 192 / 320 kbps |
| 🎨 **4 temas** | Claro, Oscuro, AMOLED y Dinámico (el acento se extrae de la portada) |
| 🎉 **Modo fiesta** | Espectro y partículas que reaccionan al audio real (Web Audio API) |
| 📚 **Biblioteca local** | Playlists, favoritos, historial de 50 canciones y recomendaciones |
| ⌨️ **Atajos de teclado** | Espacio, flechas, N/P, M, S, R, Q, F y `/` |
| 📱 **PWA** | Instalable en móvil y escritorio, con controles en la pantalla de bloqueo |
| 🎓 **Tutorial** | Recorrido guiado de 4 pasos, en español, la primera vez |

---

## Puesta en marcha (local)

**Requisitos:** solo [Node.js 18+](https://nodejs.org). ffmpeg y yt-dlp se descargan solos.

```bash
git clone <la-url-de-tu-repositorio> coarify
cd coarify
npm run setup
npm run build
npm start
```

Abre **http://localhost:3000**.

### Durante el desarrollo

```bash
npm run dev
```

Levanta el backend con recarga automática (nodemon, puerto 3000) y Vite con HMR
(puerto 5173, con proxy de `/api` al backend). Trabaja en **http://localhost:5173**.

### Otros comandos

| Comando | Qué hace |
|---|---|
| `npm run setup` | Instala dependencias de raíz y frontend |
| `npm run build` | Compila el frontend a `frontend/dist` |
| `npm start` | Arranca el servidor de producción |
| `npm run fetch-ytdlp` | Fuerza la actualización del binario de yt-dlp |
| `npm run icons` | Regenera el favicon y los iconos PWA desde el logo |

---

## Desplegar en Render (gratis)

1. Sube el proyecto a un repositorio de GitHub:

   ```bash
   git init
   git add .
   git commit -m "COARIFY v1.0.0"
   git branch -M main
   git remote add origin https://github.com/TU-USUARIO/coarify.git
   git push -u origin main
   ```

2. Entra en [render.com](https://render.com) y crea una cuenta gratuita.
3. **New +** → **Web Service** → conecta tu repositorio.
4. Configura:

   | Campo | Valor |
   |---|---|
   | Name | `coarify` |
   | Runtime | `Node` |
   | Build Command | `npm install && npm run build` |
   | Start Command | `npm start` |
   | Instance Type | `Free` |

5. **Create Web Service**. En unos minutos tendrás tu enlace público:
   `https://coarify.onrender.com`

El repositorio ya incluye un `render.yaml`, así que también puedes usar
**New + → Blueprint** y Render leerá la configuración solo.

### ⚠️ Lee esto antes de desplegar

**YouTube bloquea las IPs de los servidores en la nube.** Desde tu computadora todo
funciona; desde Render, YouTube responde a menudo *"Sign in to confirm you're not a bot"*
y el audio deja de cargar. Es una limitación de YouTube, no del código.

La solución es darle a yt-dlp las cookies de una sesión iniciada:

1. Instala una extensión tipo *Get cookies.txt LOCALLY* en tu navegador.
2. Entra a youtube.com con tu cuenta y exporta el `cookies.txt`.
3. Conviértelo a base64:

   ```bash
   node -e "console.log(require('fs').readFileSync('cookies.txt').toString('base64'))"
   ```

4. En Render → tu servicio → **Environment** → añade la variable
   `YTDLP_COOKIES_B64` con ese texto. Guarda y redespliega.

Comprueba que se aplicaron en `https://tu-app.onrender.com/api/health`: debe decir
`"cookies": true`.

**Otras cosas del plan gratuito:**

- El servicio **se duerme tras 15 min** sin visitas y tarda ~30 s en despertar.
  Puedes evitarlo con un ping cada 10 minutos desde [UptimeRobot](https://uptimerobot.com).
- Solo 512 MB de RAM: la conversión a MP3 de varias canciones a la vez puede ir justa.

### Alternativas

| Servicio | Sirve | Nota |
|---|---|---|
| **Render** | ✅ | La opción recomendada |
| **Railway** | ✅ | Similar, ~500 h/mes gratis |
| **Fly.io** | ✅ | Más control, configuración más manual |
| **Vercel / Netlify** | ❌ | Solo frontend: no soportan ffmpeg ni procesos largos |

---

## Cómo está hecho

```
coarify/
├── server.js                  # Backend Express (búsqueda, stream, descarga, proxy)
├── package.json
├── render.yaml                # Blueprint de despliegue
├── bin/                       # yt-dlp (se descarga en el postinstall)
├── scripts/
│   ├── fetch-ytdlp.js         # Descarga el binario oficial de yt-dlp
│   └── make-icons.js          # Genera favicon e iconos PWA sin dependencias
└── frontend/
    ├── index.html
    ├── vite.config.js
    ├── tailwind.config.js
    ├── public/                # manifest, service worker, iconos
    └── src/
        ├── main.jsx
        ├── App.jsx            # Rutas y layout
        ├── context/
        │   └── AppContext.jsx # Estado global (3 contextos, ver abajo)
        ├── components/
        │   ├── Sidebar.jsx        SearchBar.jsx     ResultList.jsx
        │   ├── ResultCard.jsx     PlayerControls.jsx  Queue.jsx
        │   ├── TrackMenu.jsx      Onboarding.jsx    PartyMode.jsx
        │   ├── HomePage.jsx       PlaylistsPage.jsx FavoritesPage.jsx
        │   ├── HistoryPage.jsx    ConfigPage.jsx
        │   └── common/            Logo, Button, Slider, Cover, ...
        ├── hooks/             useAudio, useAnalyser, useDebounce,
        │                      useLocalStorage, useKeyboardShortcuts
        ├── services/api.js
        ├── utils/             formatTime, colorExtractor
        └── styles/index.css   # Tokens de tema y componentes
```

### API

| Ruta | Qué devuelve |
|---|---|
| `GET /api/health` | Estado, versión, extractor activo y si hay cookies |
| `GET /api/search?q=&source=` | Resultados unificados (`source`: `all`\|`deezer`\|`youtube`) |
| `GET /api/resolve?q=` | URL de YouTube para una canción de Deezer |
| `GET /api/related?artist=` | Top del artista (recomendaciones) |
| `GET /api/stream?url=\|q=` | Audio con soporte de `Range` |
| `GET /api/download?url=\|q=&bitrate=` | MP3 convertido con ffmpeg |
| `GET /api/image?url=` | Proxy de portadas con CORS (para el color dinámico) |

### Tres decisiones que vale la pena conocer

**1. yt-dlp en vez de ytdl-core.** La especificación original pedía `ytdl-core`, pero hoy
está roto: YouTube exige un *PoToken* y la librería (y su fork `@distube/ytdl-core`)
devuelve *"Failed to find any playable formats"* con todos los clientes. COARIFY descarga
el binario oficial de **yt-dlp** en el `postinstall` y lo usa como extractor principal;
`@distube/ytdl-core` queda como respaldo automático si el binario falta.

**2. El estado se reparte en tres contextos.** El progreso de la canción cambia unas cuatro
veces por segundo. Si viviera en el mismo contexto que la lista de resultados, esas
cincuenta filas se volverían a renderizar cuatro veces por segundo. Por eso hay
`AppContext` (estable), `PlaybackContext` (sonando / cargando) y `ProgressContext`
(tiempo y duración), y solo el reproductor se suscribe al último.

**3. El color dinámico pasa por el backend.** Para leer los píxeles de una portada con
ColorThief hace falta que la imagen llegue con cabeceras CORS, y ni Deezer ni YouTube las
envían. `/api/image` hace de proxy y las añade.

---

## Privacidad y uso legítimo

- **No se recopila nada.** No hay cuentas, ni cookies de seguimiento, ni analítica.
  Favoritos, playlists, historial y ajustes viven en el `localStorage` de tu navegador
  y puedes borrarlos desde *Configuración → Borrar todos mis datos*.
- **El servidor no guarda música.** Solo hace de puente: pide, reenvía y olvida.
  La caché en memoria dura entre 5 y 60 minutos y no se escribe a disco.
- **Deezer** se consulta a través de su API pública, para búsqueda y metadatos.
- **YouTube:** extraer audio con yt-dlp **no** usa la API oficial y puede ir en contra de
  los Términos de Servicio de YouTube. COARIFY es una herramienta de uso personal y
  educativo. Respetar los derechos de autor de lo que reproduces o descargas es
  responsabilidad de cada usuario.

---

## Solución de problemas

| Síntoma | Qué hacer |
|---|---|
| *"No se pudo reproducir esta canción"* | Ejecuta `npm run fetch-ytdlp` (YouTube cambia seguido y yt-dlp se actualiza casi a diario) |
| En Render no suena nada | Configura `YTDLP_COOKIES_B64` (ver arriba) |
| La descarga MP3 falla | Revisa la consola del servidor; suele ser ffmpeg. Comprueba `/api/health` |
| La página dice "frontend sin compilar" | Ejecuta `npm run build` |
| El buscador no devuelve nada | Mira `/api/health` y la consola: puede ser un corte de red hacia Deezer |
| El modo fiesta no reacciona | Necesita que la música esté sonando; algunos navegadores bloquean la Web Audio API hasta el primer clic |

---

## Hoja de ruta

- **v1.1** — Letras sincronizadas, ecualizador, exportar/importar playlists en JSON
- **v1.2** — Arrastrar y soltar entre playlists, modo radio infinito
- **v2.0** — Cuentas opcionales y sincronización entre dispositivos, más fuentes (SoundCloud, Bandcamp), scrobbling a Last.fm

---

<div align="center">

**COARIFY v1.0.0** · Hecho para la comunidad del Colegio de Alto Rendimiento
Azul marino `#1A2B4C` · Dorado `#D4AF37`

</div>
