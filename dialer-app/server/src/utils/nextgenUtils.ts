import crypto from 'crypto';

export const generateSid = (): string => {
  return 'crk_' + crypto.randomBytes(16).toString('hex'); // 32 hex chars
};

export const generateApiKey = (): string => {
  return (
    'key_' + crypto.randomBytes(32).toString('hex') // 64 hex chars
  );
}; 