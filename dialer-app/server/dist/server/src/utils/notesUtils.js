"use strict";
// Utility helpers for server-side notes sanitization
Object.defineProperty(exports, "__esModule", { value: true });
exports.META_REGEX = exports.BANNER_REGEX = void 0;
exports.sanitizeNotes = sanitizeNotes;
/**
 * Regex that matches the star banner line we want to hide / strip.
 * Any line beginning with the star emoji is considered a banner.
 */
exports.BANNER_REGEX = /^\s*(?:🌟\s*)?New\s+(?:Marketplace|NextGen)\s+Lead/im;
// Additional metadata markers we may want to hide on output (same as client)
exports.META_REGEX = /^(Imported on:|File:|Location:|Demographics:|DOB:|Gender:|Campaign:|Source:|Original Status:)/i;
/**
 * Remove banner & metadata lines from a notes string.
 * @param raw the original notes string from DB
 */
function sanitizeNotes(raw) {
    if (!raw)
        return '';
    return raw
        .split(/\r?\n/)
        .filter((line) => {
        const cleaned = line.replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
        if (exports.BANNER_REGEX.test(cleaned))
            return false;
        if (exports.META_REGEX.test(cleaned))
            return false;
        return true;
    })
        .join('\n')
        .trim();
}
