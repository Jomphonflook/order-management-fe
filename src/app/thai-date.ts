type DateStyle = 'short' | 'medium' | 'long' | 'full';

export function formatThaiDate(value: string, dateStyle: DateStyle, timeStyle?: DateStyle): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '—';
  return new Intl.DateTimeFormat('th-TH', {
    dateStyle,
    ...(timeStyle ? { timeStyle } : {}),
  }).format(date);
}
