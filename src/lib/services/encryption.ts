/**
 * Encryption Service
 *
 * Provides AES-256-GCM encryption/decryption for sensitive data like OAuth tokens.
 * Uses Node.js crypto module for production-grade security.
 *
 * Environment Variables Required:
 * - ENCRYPTION_KEY: 32-byte hex string (64 characters)
 * - ENCRYPTION_SALT: Random string for additional security
 *
 * Generate keys with:
 * node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 */

import crypto from "crypto";
import { logger } from "@/lib/logger";

// Algorithm and configuration
const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits for GCM
const ENCODING: BufferEncoding = "hex";

/**
 * Encrypted data format:
 * <iv>:<encrypted>:<authTag>
 * All parts are hex-encoded
 */

/**
 * Get encryption key from environment
 * Key must be 32 bytes (64 hex characters)
 */
function getEncryptionKey(): Buffer {
  const keyHex = process.env.ENCRYPTION_KEY;

  if (!keyHex) {
    throw new Error("ENCRYPTION_KEY environment variable is not set");
  }

  if (keyHex.length !== 64) {
    throw new Error(
      `ENCRYPTION_KEY must be 64 hex characters (32 bytes), got ${keyHex.length} characters`,
    );
  }

  try {
    return Buffer.from(keyHex, ENCODING);
  } catch (_error) {
    throw new Error("ENCRYPTION_KEY must be a valid hex string");
  }
}

/**
 * Derive key from password (for backward compatibility or testing)
 * Not recommended for production - use direct key instead
 */
function _deriveKey(password: string, salt: string): Buffer {
  return crypto.pbkdf2Sync(password, salt, 100000, KEY_LENGTH, "sha256");
}

/**
 * Encrypt a string using AES-256-GCM
 *
 * @param plaintext - The data to encrypt
 * @returns Encrypted string in format: iv:encrypted:authTag (all hex-encoded)
 *
 * @example
 * const encrypted = await encryptToken('my-secret-token')
 * // Returns: "a1b2c3d4....:e5f6g7h8....:i9j0k1l2...."
 */
export async function encryptToken(plaintext: string): Promise<string> {
  if (!plaintext || typeof plaintext !== "string") {
    throw new Error("Plaintext must be a non-empty string");
  }

  try {
    const key = getEncryptionKey();

    // Generate random IV (initialization vector)
    const iv = crypto.randomBytes(IV_LENGTH);

    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    // Encrypt the plaintext
    let encrypted = cipher.update(plaintext, "utf8", ENCODING);
    encrypted += cipher.final(ENCODING);

    // Get authentication tag (for GCM mode)
    const authTag = cipher.getAuthTag();

    // Combine iv:encrypted:authTag
    const result = `${iv.toString(ENCODING)}:${encrypted}:${authTag.toString(ENCODING)}`;

    return result;
  } catch (error) {
    logger.error("Encryption error:", error as Error, {
      component: "encryption",
    });
    throw new Error("Failed to encrypt token");
  }
}

/**
 * Decrypt a string that was encrypted with encryptToken
 *
 * @param encryptedData - String in format: iv:encrypted:authTag
 * @returns Decrypted plaintext string
 *
 * @example
 * const decrypted = await decryptToken(encrypted)
 * // Returns: "my-secret-token"
 */
export async function decryptToken(encryptedData: string): Promise<string> {
  if (!encryptedData || typeof encryptedData !== "string") {
    throw new Error("Encrypted data must be a non-empty string");
  }

  try {
    const key = getEncryptionKey();

    // Split the encrypted data into parts
    const parts = encryptedData.split(":");
    if (parts.length !== 3) {
      throw new Error(
        "Invalid encrypted data format (expected iv:encrypted:authTag)",
      );
    }

    const [ivHex, encryptedHex, authTagHex] = parts;

    // Convert from hex to buffers
    const iv = Buffer.from(ivHex, ENCODING);
    const authTag = Buffer.from(authTagHex, ENCODING);

    // Validate lengths
    if (iv.length !== IV_LENGTH) {
      throw new Error(
        `Invalid IV length: expected ${IV_LENGTH}, got ${iv.length}`,
      );
    }
    if (authTag.length !== AUTH_TAG_LENGTH) {
      throw new Error(
        `Invalid auth tag length: expected ${AUTH_TAG_LENGTH}, got ${authTag.length}`,
      );
    }

    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    // Decrypt
    let decrypted = decipher.update(encryptedHex, ENCODING, "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    logger.error("Decryption error:", error as Error, {
      component: "encryption",
    });
    throw new Error(
      "Failed to decrypt token - data may be corrupted or key is incorrect",
    );
  }
}

/**
 * Validate that encryption is properly configured
 * Use this on app startup to fail fast if keys are missing/invalid
 *
 * @returns true if encryption is properly configured
 * @throws Error if configuration is invalid
 */
export function validateEncryptionConfig(): boolean {
  try {
    getEncryptionKey();
    return true;
  } catch (error) {
    throw new Error(
      `Encryption not properly configured: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Test encryption/decryption roundtrip
 * Use for diagnostics and testing
 *
 * @returns true if roundtrip successful
 */
export async function testEncryption(): Promise<boolean> {
  const testData = "test-token-" + Date.now();

  try {
    const encrypted = await encryptToken(testData);
    const decrypted = await decryptToken(encrypted);

    if (decrypted !== testData) {
      throw new Error(
        "Roundtrip test failed: decrypted data does not match original",
      );
    }

    return true;
  } catch (error) {
    logger.error("Encryption test failed:", error as Error, {
      component: "encryption",
    });
    throw error;
  }
}

/**
 * Generate a new encryption key
 * Use this to generate ENCRYPTION_KEY for environment variables
 *
 * @returns 64-character hex string (32 bytes)
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(KEY_LENGTH).toString(ENCODING);
}
