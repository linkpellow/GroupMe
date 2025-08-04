// Map zip code prefixes to timezone identifiers
// Using first 3 digits of zip codes for broader coverage
export const getTimezoneFromZipCode = (zipCode: string | undefined): string => {
  try {
    if (!zipCode || typeof zipCode !== 'string' || zipCode.length < 3) {
      return 'America/New_York'; // Default to Eastern Time
    }

    const zipPrefix = zipCode.substring(0, 3);
    const zipNum = parseInt(zipPrefix, 10);

    // Pacific Time (PT) - most of CA, WA, OR, NV
    if (
      (zipNum >= 900 && zipNum <= 961) || // CA
      (zipNum >= 970 && zipNum <= 986) || // OR, WA
      (zipNum >= 889 && zipNum <= 898) // NV
    ) {
      return 'America/Los_Angeles';
    }

    // Mountain Time (MT) - AZ, CO, ID, MT, NM, UT, WY
    if (
      (zipNum >= 800 && zipNum <= 816) || // CO
      (zipNum >= 820 && zipNum <= 831) || // WY, ID
      (zipNum >= 832 && zipNum <= 838) || // MT
      (zipNum >= 840 && zipNum <= 847) || // UT
      (zipNum >= 850 && zipNum <= 865) || // AZ, NM
      (zipNum >= 875 && zipNum <= 884) // WY
    ) {
      return 'America/Denver';
    }

    // Central Time (CT) - AR, IL, IA, KS, LA, MN, MS, MO, NE, ND, OK, SD, TX, WI
    if (
      (zipNum >= 500 && zipNum <= 599) || // IA, MN, MT, ND, SD, WI
      (zipNum >= 600 && zipNum <= 658) || // IL, MO
      (zipNum >= 660 && zipNum <= 693) || // KS, MO, NE
      (zipNum >= 700 && zipNum <= 799) || // LA, OK, TX
      (zipNum >= 716 && zipNum <= 729) // AR
    ) {
      return 'America/Chicago';
    }

    // Eastern Time (ET) - All others
    return 'America/New_York';
  } catch (error) {
    console.error('Error determining timezone from zip code:', error);
    return 'America/New_York'; // Default to Eastern Time
  }
};

// Map IANA timezone identifiers to their abbreviations
// Fallback static abbreviations (standard time)
const STATIC_ABBR: Record<string, string> = {
  'America/New_York': 'EST',
  'America/Chicago': 'CST',
  'America/Denver': 'MST',
  'America/Los_Angeles': 'PST',
  'America/Phoenix': 'MST',
  'America/Anchorage': 'AKST',
  'Pacific/Honolulu': 'HST',
};

/**
 * Derive daylight-aware abbreviation (e.g. "EDT") from an IANA zone.
 * Falls back to STATIC_ABBR if Intl fails.
 */
export const getAbbreviation = (ianaZone: string): string => {
  try {
    const fmt = Intl.DateTimeFormat('en-US', {
      timeZone: ianaZone,
      timeZoneName: 'short',
    });
    const part = fmt.formatToParts(new Date()).find((p) => p.type === 'timeZoneName');
    if (part?.value) {
      return part.value.replace(/\s/g, '');
    }
  } catch (_) {
    /* ignore */
  }
  return STATIC_ABBR[ianaZone] || 'UNK';
};

// Format time based on timezone
export const formatTimeInTimezone = (timezone: string): string => {
  try {
    const options: Intl.DateTimeFormatOptions = {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: timezone,
    };

    // Get the time string
    const timeString = new Intl.DateTimeFormat('en-US', options).format(new Date());

    // Daylight-aware abbreviation
    const tzAbbr = getAbbreviation(timezone);

    // Return the time with timezone abbreviation
    return `${timeString} ${tzAbbr}`;
  } catch (error) {
    console.error('Error formatting time:', error);
    // Fallback to browser's local time
    return new Date().toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }
};
