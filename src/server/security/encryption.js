import crypto from 'node:crypto';

const ALGO = 'aes-256-gcm';
const IV_LENGTH = 12;
const VERSION_PREFIX = 'enc:v1';

const ensureKey = () => {
  const raw = process.env.FIELD_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error('Missing FIELD_ENCRYPTION_KEY for field encryption.');
  }

  const trimmed = String(raw).trim();

  // base64 encoded 32 bytes
  try {
    const asBase64 = Buffer.from(trimmed, 'base64');
    if (asBase64.length === 32) return asBase64;
  } catch (_) {
    // no-op
  }

  // hex encoded 32 bytes
  if (/^[a-fA-F0-9]{64}$/.test(trimmed)) {
    return Buffer.from(trimmed, 'hex');
  }

  // fallback: deterministic key derivation from passphrase
  return crypto.createHash('sha256').update(trimmed).digest();
};

const pack = (iv, ciphertext, tag) =>
  `${VERSION_PREFIX}:${iv.toString('base64')}:${ciphertext.toString('base64')}:${tag.toString('base64')}`;

const unpack = (value) => {
  const str = String(value || '');
  const parts = str.split(':');
  if (parts.length !== 5 || `${parts[0]}:${parts[1]}` !== VERSION_PREFIX) {
    throw new Error('Encrypted payload format is invalid.');
  }

  const iv = Buffer.from(parts[2], 'base64');
  const ciphertext = Buffer.from(parts[3], 'base64');
  const tag = Buffer.from(parts[4], 'base64');

  return { iv, ciphertext, tag };
};

export const isEncryptedValue = (value) =>
  typeof value === 'string' && value.startsWith(`${VERSION_PREFIX}:`);

export const encryptString = (plainText) => {
  const key = ensureKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGO, key, iv);

  const plaintextBuffer = Buffer.from(String(plainText ?? ''), 'utf8');
  const ciphertext = Buffer.concat([cipher.update(plaintextBuffer), cipher.final()]);
  const tag = cipher.getAuthTag();

  return pack(iv, ciphertext, tag);
};

export const decryptString = (encryptedText) => {
  const key = ensureKey();
  const { iv, ciphertext, tag } = unpack(encryptedText);

  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);

  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString('utf8');
};

export const encryptJson = (value) => encryptString(JSON.stringify(value ?? null));

export const decryptJson = (encryptedValue) => {
  const plaintext = decryptString(encryptedValue);
  try {
    return JSON.parse(plaintext);
  } catch (error) {
    throw new Error(`Failed to parse decrypted JSON payload: ${error?.message || error}`);
  }
};

export const maybeDecryptJson = (value) => {
  if (!isEncryptedValue(value)) return value;
  return decryptJson(value);
};

export const maybeEncryptJson = (value) => {
  if (isEncryptedValue(value)) return value;
  return encryptJson(value);
};
