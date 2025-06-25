// Utility helpers for server-side notes sanitization

/**
 * Regex that matches the star banner line we want to hide / strip.
 * Any line beginning with the star emoji is considered a banner.
 */
export const BANNER_REGEX = /^\s*(?:🌟\s*)?New\s+(?:Marketplace|NextGen)\s+Lead/im;

// Additional metadata markers we may want to hide on output (same as client)
export const META_REGEX = /^(Imported on:|File:|Location:|Demographics:|DOB:|Gender:|Campaign:|Source:|Original Status:)/i;

/**
 * Remove banner & metadata lines from a notes string.
 * @param raw the original notes string from DB
 */
export function sanitizeNotes(raw: string | undefined | null): string {
  if (!raw) return '';
  return raw
    .split(/\r?\n/)
    .filter((line) => {
      const cleaned = line.replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
      if (BANNER_REGEX.test(cleaned)) return false;
      if (META_REGEX.test(cleaned)) return false;
      return true;
    })
    .join('\n')
    .trim();
} 