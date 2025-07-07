export const safeString = (v: unknown, fallback = ''): string => {
  if (v == null) return fallback; // null or undefined → fallback
  return typeof v === 'string' ? v : String(v);
}; 