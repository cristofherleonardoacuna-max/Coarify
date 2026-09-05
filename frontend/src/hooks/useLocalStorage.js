import { useCallback, useEffect, useRef, useState } from 'react';

const PREFIX = 'coarify:';

export function readStored(key, fallback) {
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch (_) {
    return fallback;
  }
}

export function writeStored(key, value) {
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch (_) {
    /* modo privado o cuota llena: la app sigue funcionando en memoria */
  }
}

export function clearStored() {
  try {
    Object.keys(window.localStorage)
      .filter((k) => k.startsWith(PREFIX))
      .forEach((k) => window.localStorage.removeItem(k));
  } catch (_) {
    /* ignorado */
  }
}

/** useState que persiste en localStorage bajo el prefijo "coarify:". */
export function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => readStored(key, initialValue));
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    writeStored(key, value);
  }, [key, value]);

  const reset = useCallback(() => setValue(initialValue), [initialValue]);

  return [value, setValue, reset];
}
