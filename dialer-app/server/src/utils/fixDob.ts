export function fixDob(raw: string | null | undefined): string | null {
  if (!raw) return null;

  // Canonicalise delimiters to '/'
  const parts = raw.trim().replace(/[-.]/g, '/').split('/');
  if (parts.length !== 3) return null;

  // Locate four-digit year
  const yearIdx = parts.findIndex((p) => /^\d{4}$/.test(p));
  if (yearIdx === -1) return null; // reject 2-digit years

  const year = parts[yearIdx];
  const nums = parts.map((n) => parseInt(n, 10));

  // Pick month/day candidates
  const rest = nums.filter((_, i) => i !== yearIdx);
  let [m, d] = rest;

  // If first > 12 & second ≤ 12, swap (day/month ambiguity)
  if (m > 12 && d <= 12) {
    [m, d] = [d, m];
  }

  // Basic sanity range check
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;

  return `${String(m).padStart(2, '0')}/${String(d).padStart(2, '0')}/${year}`;
} 