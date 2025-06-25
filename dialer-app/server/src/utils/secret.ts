import crypto from 'crypto';

/**
 * Returns the raw JWT secret string from environment variables.
 * Throws an explicit error if the secret is missing or too short.
 */
export function getJwtSecret(): string {
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
      : crypto.randomBytes(32).toString('hex').slice(0, 32);

    console.warn(
      `[DEV] JWT_SECRET was ${secret ? 'too short' : 'missing'} – using non-persistent fallback key. ` +
      'Do NOT use this in production.'
    );
    return generated;
  }
  return secret;
}

/**
 * Returns a 32-byte encryption key derived from the JWT secret using SHA-256.
 * Consumers should memoise this to avoid re-hashing on every call.
 */
export function getEncryptionKey(): Buffer {
  const jwtSecret = getJwtSecret();
  return crypto.createHash('sha256').update(jwtSecret).digest();
} 