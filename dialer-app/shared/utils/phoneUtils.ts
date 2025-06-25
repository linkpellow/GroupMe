export const normalizePhone = (phone: string | undefined | null): string => {
  if (!phone) return '';
  // Keep only digits and take the last 10 for a consistent US-based key.
  return phone.replace(/[^\d]/g, '').slice(-10);
}; 