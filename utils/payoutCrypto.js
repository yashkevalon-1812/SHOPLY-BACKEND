import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';

// Prefer a dedicated key so payout encryption can be rotated independently of
// session tokens. Falls back to JWT_SECRET so a deployment that sets only one
// secret still works, without ever storing bank details in plaintext.
const getKey = () => {
  const secret = process.env.PAYOUT_ENCRYPTION_KEY || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('PAYOUT_ENCRYPTION_KEY or JWT_SECRET must be set to handle payouts');
  }
  return crypto.createHash('sha256').update(String(secret)).digest();
};

/**
 * Encrypts a single sensitive string. Returns `iv:authTag:ciphertext`, all
 * base64, so the value is self-describing and can be rotated later.
 */
export const encryptValue = (value) => {
  if (value === undefined || value === null || value === '') return undefined;

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()]);

  return `${iv.toString('base64')}:${cipher.getAuthTag().toString('base64')}:${ciphertext.toString('base64')}`;
};

export const decryptValue = (payload) => {
  if (!payload) return undefined;

  const [iv, authTag, ciphertext] = payload.split(':');
  if (!iv || !authTag || !ciphertext) return undefined;

  try {
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      getKey(),
      Buffer.from(iv, 'base64')
    );
    decipher.setAuthTag(Buffer.from(authTag, 'base64'));
    return Buffer.concat([
      decipher.update(Buffer.from(ciphertext, 'base64')),
      decipher.final(),
    ]).toString('utf8');
  } catch {
    // Wrong key or tampered payload: fail closed rather than leaking garbage.
    return undefined;
  }
};

/** Shows only the last 4 characters, e.g. account 50100234567890 -> ••••••••7890 */
export const maskValue = (value) => {
  if (!value) return '';
  const text = String(value);
  if (text.length <= 4) return '•'.repeat(text.length);
  return `${'•'.repeat(Math.min(text.length - 4, 8))}${text.slice(-4)}`;
};
