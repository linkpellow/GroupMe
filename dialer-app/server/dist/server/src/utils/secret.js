"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getJwtSecret = getJwtSecret;
exports.getEncryptionKey = getEncryptionKey;
const crypto_1 = __importDefault(require("crypto"));
/**
 * Returns the raw JWT secret string from environment variables.
 * Throws an explicit error if the secret is missing or too short.
 */
function getJwtSecret() {
    const secret = process.env.JWT_SECRET;
    if (!secret || secret.length < 32) {
        // In production we still want to fail fast – but in local/dev its better to self-heal
        const env = process.env.NODE_ENV || 'development';
        if (env === 'production') {
            throw new Error('JWT_SECRET must be defined and at least 32 characters long');
        }
        // DEV fallback: auto-generate or pad the secret so the server can boot
        const generated = secret && secret.length > 0
            ? secret.padEnd(32, '0')
            : crypto_1.default.randomBytes(32).toString('hex').slice(0, 32);
        console.warn(`[DEV] JWT_SECRET was ${secret ? 'too short' : 'missing'} – using non-persistent fallback key. ` +
            'Do NOT use this in production.');
        return generated;
    }
    return secret;
}
/**
 * Returns a 32-byte encryption key derived from the JWT secret using SHA-256.
 * Consumers should memoise this to avoid re-hashing on every call.
 */
function getEncryptionKey() {
    const jwtSecret = getJwtSecret();
    return crypto_1.default.createHash('sha256').update(jwtSecret).digest();
}
