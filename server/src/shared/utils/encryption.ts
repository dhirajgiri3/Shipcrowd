/**
 * Encryption Utilities for Sensitive Data
 *
 * Uses AES-256-CBC encryption for storing sensitive data at rest
 * Used for: API tokens, credentials, PII data
 *
 * @see Security best practices for encryption key management
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

/**
 * Get encryption key from environment
 * Must be 32 bytes (64 hex characters)
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;

  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is not set');
  }

  if (key.length !== 64) {
    throw new Error('ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
  }

  return Buffer.from(key, 'hex');
}

/**
 * Encrypt a string using AES-256-CBC
 *
 * @param text - Plain text to encrypt
 * @returns Encrypted string in format: iv:encryptedData
 */
export function encryptData(text: string): string {
  if (!text) {
    throw new Error('Cannot encrypt empty text');
  }

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  return iv.toString('hex') + ':' + encrypted;
}

/**
 * Decrypt a string that was encrypted with encryptData()
 *
 * @param encryptedText - Encrypted string in format: iv:encryptedData
 * @returns Decrypted plain text
 */
export function decryptData(encryptedText: string): string {
  if (!encryptedText) {
    throw new Error('Cannot decrypt empty text');
  }

  const parts = encryptedText.split(':');
  if (parts.length !== 2) {
    throw new Error('Invalid encrypted data format');
  }

  const [ivHex, encrypted] = parts;
  const iv = Buffer.from(ivHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, getEncryptionKey(), iv);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Generate a random encryption key (64 hex characters)
 * Use this to generate ENCRYPTION_KEY for .env
 *
 * @returns 64-character hex string
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Hash a password using bcrypt-compatible algorithm
 * Note: For passwords, use bcrypt from auth module instead
 *
 * @param text - Text to hash
 * @returns Hashed text
 */
export function hashData(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex');
}
