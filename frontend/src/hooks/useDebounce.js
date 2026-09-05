import { useEffect, useState } from 'react';

/** Devuelve `value` retrasado `delay` ms. Evita disparar una busqueda por tecla. */
export function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
