import { useCallback, useEffect, useRef, useState } from 'react';
import { Music2 } from 'lucide-react';

/**
 * Portada con marcador de posicion mientras carga y respaldo si falla.
 *
 * Ojo con las imagenes en cache: se completan antes de que React monte el
 * onLoad, asi que ademas del evento se comprueba `complete` al enlazar el
 * elemento. Sin eso la portada se quedaba invisible.
 */
export function Cover({ src, alt = '', className = '', rounded = 'rounded-lg', iconSize = 20 }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const previousSrc = useRef(src);

  useEffect(() => {
    if (previousSrc.current === src) return; // primer montaje: no reiniciar
    previousSrc.current = src;
    setLoaded(false);
    setFailed(false);
  }, [src]);

  const attach = useCallback((el) => {
    if (el && el.complete && el.naturalWidth > 0) setLoaded(true);
  }, []);

  const showPlaceholder = !src || failed || !loaded;

  return (
    <div
      className={`relative shrink-0 overflow-hidden ${rounded} ${className}`}
      style={{ background: 'var(--bg-soft)' }}
    >
      {showPlaceholder && (
        <div className="absolute inset-0 grid place-items-center text-dim">
          <Music2 size={iconSize} />
        </div>
      )}
      {src && !failed && (
        <img
          ref={attach}
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={`h-full w-full object-cover transition-opacity duration-300 ${
            loaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}
    </div>
  );
}

export default Cover;
