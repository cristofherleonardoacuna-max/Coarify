/** Convierte segundos a m:ss (o h:mm:ss cuando corresponde). */
export function formatTime(totalSeconds) {
  const s = Number(totalSeconds);
  if (!Number.isFinite(s) || s < 0) return '0:00';

  const secs = Math.floor(s % 60);
  const mins = Math.floor((s / 60) % 60);
  const hours = Math.floor(s / 3600);

  const pad = (n) => String(n).padStart(2, '0');
  return hours > 0 ? `${hours}:${pad(mins)}:${pad(secs)}` : `${mins}:${pad(secs)}`;
}

/** Texto legible para listas: "12 canciones". */
export function pluralize(count, singular, plural) {
  return `${count} ${count === 1 ? singular : plural}`;
}
