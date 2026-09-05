import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Download, Heart, ListMusic, ListPlus, MoreHorizontal, Plus } from 'lucide-react';

import { useApp } from '../context/AppContext';
import { IconButton } from './common/Button';

const MENU_WIDTH = 240;
const MENU_MAX_HEIGHT = 340;

/**
 * Menu contextual de una cancion: cola, playlists, favoritos y descarga.
 *
 * Se dibuja en un portal sobre <body>: dentro de la lista, cada fila crea su
 * propio contexto de apilamiento y las filas siguientes taparian el menu por
 * mucho z-index que le pusieramos.
 */
export function TrackMenu({ track }) {
  const { playlists, addToPlaylist, createPlaylist, addToQueue, toggleFavorite, isFavorite, download } =
    useApp();

  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');

  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const inputRef = useRef(null);

  const close = useCallback(() => {
    setOpen(false);
    setCreating(false);
    setName('');
  }, []);

  const place = useCallback(() => {
    const button = triggerRef.current;
    if (!button) return;
    const rect = button.getBoundingClientRect();

    // Si no cabe hacia abajo, el menu sube por encima del boton.
    const openUpwards = rect.bottom + MENU_MAX_HEIGHT > window.innerHeight && rect.top > MENU_MAX_HEIGHT;

    setPosition({
      top: openUpwards ? rect.top - 6 : rect.bottom + 6,
      left: Math.min(Math.max(8, rect.right - MENU_WIDTH), window.innerWidth - MENU_WIDTH - 8),
      upwards: openUpwards,
    });
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    place();

    const onPointerDown = (event) => {
      const inTrigger = triggerRef.current && triggerRef.current.contains(event.target);
      const inMenu = menuRef.current && menuRef.current.contains(event.target);
      if (!inTrigger && !inMenu) close();
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') close();
    };
    // Al desplazar la lista el menu quedaria descolocado: se cierra.
    const onScroll = () => close();

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [open, place, close]);

  useEffect(() => {
    if (creating && inputRef.current) inputRef.current.focus();
  }, [creating]);

  const run = (action) => {
    action();
    close();
  };

  const submitNewPlaylist = (event) => {
    if (event) event.preventDefault();
    if (createPlaylist(name, [track])) close();
  };

  const favorite = isFavorite(track);

  return (
    <>
      <IconButton
        ref={triggerRef}
        label="Mas opciones"
        onClick={(event) => {
          event.stopPropagation();
          setOpen((v) => !v);
        }}
        className={open ? 'bg-soft text-ink' : ''}
      >
        <MoreHorizontal size={18} />
      </IconButton>

      {createPortal(
        <AnimatePresence>
          {open && position && (
            <motion.div
              ref={menuRef}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.13 }}
              onClick={(event) => event.stopPropagation()}
              className="surface fixed z-[9999] overflow-hidden p-1.5"
              style={{
                top: position.top,
                left: position.left,
                width: MENU_WIDTH,
                transform: position.upwards ? 'translateY(-100%)' : undefined,
                background: 'var(--bg-elev)',
                boxShadow: 'var(--shadow), 0 0 0 1px var(--border)',
              }}
            >
              <MenuItem icon={ListPlus} onClick={() => run(() => addToQueue(track))}>
                Anadir a la cola
              </MenuItem>
              <MenuItem icon={Heart} onClick={() => run(() => toggleFavorite(track))}>
                {favorite ? 'Quitar de favoritos' : 'Anadir a favoritos'}
              </MenuItem>
              <MenuItem icon={Download} onClick={() => run(() => download(track))}>
                Descargar en MP3
              </MenuItem>

              <div className="my-1.5 h-px" style={{ background: 'var(--border)' }} />

              <p className="px-2.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-dim">
                Anadir a playlist
              </p>

              <div className="max-h-40 overflow-y-auto">
                {playlists.length === 0 && (
                  <p className="px-2.5 py-1.5 text-xs text-dim">Aun no tienes playlists.</p>
                )}
                {playlists.map((playlist) => (
                  <MenuItem
                    key={playlist.id}
                    icon={ListMusic}
                    onClick={() => run(() => addToPlaylist(playlist.id, track))}
                  >
                    {playlist.name}
                  </MenuItem>
                ))}
              </div>

              {creating ? (
                <form onSubmit={submitNewPlaylist} className="p-1.5">
                  <input
                    ref={inputRef}
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    // El envio implicito del formulario no es fiable aqui
                    // (el menu vive en un portal), asi que Enter va explicito.
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') submitNewPlaylist(event);
                    }}
                    placeholder="Nombre y pulsa Enter"
                    maxLength={60}
                    className="w-full rounded-lg px-2.5 py-2 text-sm outline-none"
                    style={{ background: 'var(--bg-soft)', color: 'var(--text)' }}
                  />
                </form>
              ) : (
                <MenuItem icon={Plus} onClick={() => setCreating(true)}>
                  Nueva playlist...
                </MenuItem>
              )}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}

function MenuItem({ icon: Icon, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-ink transition-colors hover:bg-[color:var(--bg-soft)]"
    >
      <Icon size={15} className="shrink-0 text-dim" />
      <span className="truncate">{children}</span>
    </button>
  );
}

export default TrackMenu;
