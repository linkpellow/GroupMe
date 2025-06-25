export interface ParsedFollowUp {
  name: string;
  phone: string;
  state?: string;
}

/**
 * Parse a reminder string of the form:
 *   "Follow up with NAME (PHONE) - STATE"  (state optional)
 *   Extra HTML tags and double parentheses are tolerated.
 *
 * Returns null if the string does not match the expected pattern.
 */
export function parseFollowUpString(raw: string): ParsedFollowUp | null {
  if (!raw) return null;
  // Strip any HTML markup (e.g. <mark> from search highlighting)
  const text = raw.replace(/<[^>]+>/g, '').trim();

  // Allow one or two opening parentheses around phone, and make state optional.
  const regex = /^Follow up with\s+(.+)\s+\(\(?([^)]+)\)?\)\s*(?:-\s*([A-Za-z]{2}))?$/i;
  const match = text.match(regex);
  if (!match) return null;
  const [, name, phone, state] = match;
  return {
    name: name.trim(),
    phone: phone.trim(),
    state: state?.trim().toUpperCase(),
  };
} 