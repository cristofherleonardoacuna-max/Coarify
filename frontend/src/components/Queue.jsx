import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, ChevronUp, GripVertical, ListMusic, Save, Trash2, X } from 'lucide-react';

import { useApp, usePlayback } from '../context/AppContext';
import Button, { IconButton } from './common/Button';
import Cover from './common/Cover';
import EmptyState from './common/EmptyState';

/**
 * Panel lateral con la cola. Se reordena arrastrando (HTML5 drag & drop)
 * o con las flechas, que ademas funcionan con teclado y en movil.
 */
export function Queue() {
  const {
    queue, index, queueOpen, setQueueOpen,
    playAll, removeFromQueue, moveInQueue, clearQueue, saveQueueAsPlaylist,
  } = useApp();
  const { isPlaying } = usePlayback();

  const [dragFrom, setDragFrom] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');

  const handleDrop = (to) => {
    if (dragFrom !== null && dragFrom !== to) moveInQueue(dragFrom, to);
    setDragFrom(null);
    setDragOver(null);
  };

  const submitSave = (event) => {
    if (event) event.preventDefault();
    if (!name.trim()) return;
    saveQueueAsPlaylist(name);
    setName('');
    setSaving(false);
  };

  return (
    <AnimatePresence>
      {queueOpen && (
        <>
          <motion.button
            type="button"
            aria-label="Cerrar cola"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setQueueOpen(false)}
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          />

          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-[380px] flex-col"
            style={{ background: 'var(--bg-elev)', borderLeft: '1px solid var(--border)' }}
          >
            <header
              className="flex items-center gap-2 px-4 py-4"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              <ListMusic size={18} style={{ color: 'var(--accent)' }} />
              <h2 className="flex-1 text-sm font-bold text-ink">
                Cola de reproduccion
                <span className="ml-2 font-normal text-dim">{queue.length}</span>
              </h2>
              <IconButton label="Cerrar" onClick={() => setQueueOpen(false)}>
                <X size={18} />
              </IconButton>
            </header>

            {queue.length > 0 && (
              <div className="flex flex-wrap gap-2 px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
                <Button variant="outline" size="sm" onClick={() => setSaving((v) => !v)}>
                  <Save size={14} />
                  Guardar
                </Button>
                <Button variant="danger" size="sm" onClick={clearQueue}>
                  <Trash2 size={14} />
                  Vaciar
                </Button>
                <Button variant="ghost" size="sm" onClick={() => playAll(queue, 0)}>
                  Desde el inicio
                </Button>
              </div>
            )}

            {saving && (
              <form onSubmit={submitSave} className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
                <input
                  autoFocus
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') submitSave(event);
                  }}
                  placeholder="Nombre de la nueva playlist y Enter"
                  maxLength={60}
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                  style={{ background: 'var(--bg-soft)', color: 'var(--text)' }}
                />
              </form>
            )}

            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              {queue.length === 0 ? (
                <EmptyState
                  icon={ListMusic}
                  title="La cola esta vacia"
                  description="Reproduce una cancion o usa el menu de cada resultado para anadirla aqui."
                />
              ) : (
                queue.map((track, i) => {
                  const current = i === index;
                  return (
                    <div
                      key={`${track.id}-${i}`}
                      draggable
                      onDragStart={() => setDragFrom(i)}
                      onDragOver={(event) => {
                        event.preventDefault();
                        setDragOver(i);
                      }}
                      onDragLeave={() => setDragOver((v) => (v === i ? null : v))}
                      onDrop={() => handleDrop(i)}
                      onDragEnd={() => {
                        setDragFrom(null);
                        setDragOver(null);
                      }}
                      className="group flex items-center gap-2 rounded-xl p-2 transition-colors"
                      style={{
                        background: current ? 'var(--bg-soft)' : 'transparent',
                        outline: dragOver === i ? '2px dashed var(--accent)' : 'none',
                        opacity: dragFrom === i ? 0.4 : 1,
                      }}
                    >
                      <GripVertical
                        size={15}
                        className="shrink-0 cursor-grab text-dim opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
                      />

                      <button
                        type="button"
                        onClick={() => playAll(queue, i)}
                        className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                      >
                        <Cover src={track.cover} alt="" className="h-10 w-10" iconSize={16} />
                        <div className="min-w-0 flex-1">
                          <div
                            className="truncate text-[13px] font-semibold"
                            style={{ color: current ? 'var(--accent)' : 'var(--text)' }}
                          >
                            {track.title}
                          </div>
                          <div className="truncate text-[11px] text-dim">
                            {current && isPlaying ? 'Sonando ahora · ' : ''}
                            {track.artist}
                          </div>
                        </div>
                      </button>

                      <div className="flex shrink-0 flex-col opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                        <button
                          type="button"
                          aria-label="Subir"
                          disabled={i === 0}
                          onClick={() => moveInQueue(i, i - 1)}
                          className="rounded p-0.5 text-dim hover:text-ink disabled:opacity-25"
                        >
                          <ChevronUp size={14} />
                        </button>
                        <button
                          type="button"
                          aria-label="Bajar"
                          disabled={i === queue.length - 1}
                          onClick={() => moveInQueue(i, i + 1)}
                          className="rounded p-0.5 text-dim hover:text-ink disabled:opacity-25"
                        >
                          <ChevronDown size={14} />
                        </button>
                      </div>

                      <IconButton
                        label="Quitar de la cola"
                        size="icon-sm"
                        onClick={() => removeFromQueue(i)}
                        className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                      >
                        <X size={15} />
                      </IconButton>
                    </div>
                  );
                })
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

export default Queue;
