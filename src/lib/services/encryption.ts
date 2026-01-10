/**
 * Encryption Service
 *
 * Provides AES-256-GCM encryption/decryption for sensitive data like OAuth tokens.
 * Uses Node.js crypto module for production-grade security.
 *
 * Environment Variables Required:
 * - ENCRYPTION_KEY: Current 32-byte hex string (64 characters)
 * - ENCRYPTION_KEY_PREVIOUS: Previous key for rotation support (optional)
 * - ENCRYPTION_KEY_ID: Version identifier for current key (optional, defaults to "v1")
 *
 * Key Rotation Process:
 * 1. Generate new key: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 * 2. Set ENCRYPTION_KEY_PREVIOUS to current ENCRYPTION_KEY
 * 3. Set ENCRYPTION_KEY to new key
 * 4. Increment ENCRYPTION_KEY_ID (e.g., "v1" -> "v2")
 * 5. Run re-encryption job to update stored tokens
 * 6. After all tokens re-encrypted, remove ENCRYPTION_KEY_PREVIOUS
 */

import crypto from "crypto";
import { logger } from "@/lib/logger";

// Algorithm and configuration
const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits for GCM
const ENCODING: BufferEncoding = "hex";

// Key version prefix for encrypted data
const KEY_VERSION_SEPARATOR = "$";

/**
 * Encrypted data format:
 * <iv>:<encrypted>:<authTag>
 * All parts are hex-encoded
 */

/**
 * Get the current key version identifier
 */
function getCurrentKeyId(): string {
  return process.env.ENCRYPTION_KEY_ID || "v1";
}

/**
 * Parse a hex key string into a Buffer
 */
function parseKeyHex(keyHex: string, keyName: string): Buffer {
  if (keyHex.length !== 64) {
    throw new Error(
      `${keyName} must be 64 hex characters (32 bytes), got ${keyHex.length} characters`,
    );
  }

  try {
    return Buffer.from(keyHex, ENCODING);
  } catch (_error) {
    throw new Error(`${keyName} must be a valid hex string`);
  }
}

/**
 * Get current encryption key from environment
 * Key must be 32 bytes (64 hex characters)
 */
function getEncryptionKey(): Buffer {
  const keyHex = process.env.ENCRYPTION_KEY;

  if (!keyHex) {
    throw new Error("ENCRYPTION_KEY environment variable is not set");
  }

  return parseKeyHex(keyHex, "ENCRYPTION_KEY");
}

/**
 * Get previous encryption key for rotation support
 * Returns null if not configured
 */
function getPreviousEncryptionKey(): Buffer | null {
  const keyHex = process.env.ENCRYPTION_KEY_PREVIOUS;

  if (!keyHex) {
    return null;
  }

  try {
    return parseKeyHex(keyHex, "ENCRYPTION_KEY_PREVIOUS");
  } catch (error) {
    logger.warn("Invalid ENCRYPTION_KEY_PREVIOUS configured", {
      component: "encryption",
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return null;
  }
}

/**
 * Check if key rotation is currently active
 */
export function isKeyRotationActive(): boolean {
  return !!process.env.ENCRYPTION_KEY_PREVIOUS;
}

/**
 * Derive key from password (for backward compatibility or testing)
 * Not recommended for production - use direct key instead
 */
function _deriveKey(password: string, salt: string): Buffer {
  return crypto.pbkdf2Sync(password, salt, 100000, KEY_LENGTH, "sha256");
}

/**
 * Encrypt a string using AES-256-GCM with key versioning
 *
 * @param plaintext - The data to encrypt
 * @returns Encrypted string in format: keyId$iv:encrypted:authTag (all hex-encoded)
 *
 * @example
 * const encrypted = await encryptToken('my-secret-token')
 * // Returns: "v1$a1b2c3d4....:e5f6g7h8....:i9j0k1l2...."
 */
export async function encryptToken(plaintext: string): Promise<string> {
  if (!plaintext || typeof plaintext !== "string") {
    throw new Error("Plaintext must be a non-empty string");
  }

  try {
    const key = getEncryptionKey();
    const keyId = getCurrentKeyId();

    // Generate random IV (initialization vector)
    const iv = crypto.randomBytes(IV_LENGTH);

    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    // Encrypt the plaintext
    let encrypted = cipher.update(plaintext, "utf8", ENCODING);
    encrypted += cipher.final(ENCODING);

    // Get authentication tag (for GCM mode)
    const authTag = cipher.getAuthTag();

    // Combine keyId$iv:encrypted:authTag (with key version prefix)
    const encryptedData = `${iv.toString(ENCODING)}:${encrypted}:${authTag.toString(ENCODING)}`;
    const result = `${keyId}${KEY_VERSION_SEPARATOR}${encryptedData}`;

    return result;
  } catch (error) {
    logger.error("Encryption error:", error as Error, {
      component: "encryption",
    });
    throw new Error("Failed to encrypt token");
  }
}

/**
 * Parse encrypted data format to extract key version and encrypted parts
 */
function parseEncryptedData(encryptedData: string): { keyId: string | null; data: string } {
  const separatorIndex = encryptedData.indexOf(KEY_VERSION_SEPARATOR);

  // Check if data has key version prefix
  if (separatorIndex > 0 && separatorIndex < 10) {
    // Key IDs should be short (e.g., "v1", "v2")
    const potentialKeyId = encryptedData.substring(0, separatorIndex);
    // Validate it looks like a key ID (alphanumeric, short)
    if (/^[a-zA-Z0-9]{1,8}$/.test(potentialKeyId)) {
      return {
        keyId: potentialKeyId,
        data: encryptedData.substring(separatorIndex + 1),
      };
    }
  }

  // Legacy format without key version
  return { keyId: null, data: encryptedData };
}

/**
 * Decrypt with a specific key
 */
function decryptWithKey(encryptedParts: string, key: Buffer): string {
  const parts = encryptedParts.split(":");
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
}

/**
 * Decrypt a string that was encrypted with encryptToken
 * Supports key rotation by trying current key first, then falling back to previous key
 *
 * @param encryptedData - String in format: keyId$iv:encrypted:authTag or legacy iv:encrypted:authTag
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

  const { keyId, data } = parseEncryptedData(encryptedData);
  const currentKey = getEncryptionKey();
  const currentKeyId = getCurrentKeyId();
  const previousKey = getPreviousEncryptionKey();

  // Determine which key to try first based on key ID
  const keysToTry: Array<{ key: Buffer; name: string }> = [];

  if (keyId === currentKeyId || keyId === null) {
    // Current key matches or legacy format - try current first
    keysToTry.push({ key: currentKey, name: "current" });
    if (previousKey) {
      keysToTry.push({ key: previousKey, name: "previous" });
    }
  } else if (previousKey) {
    // Different key ID - try previous first (likely encrypted with old key)
    keysToTry.push({ key: previousKey, name: "previous" });
    keysToTry.push({ key: currentKey, name: "current" });
  } else {
    // Only current key available
    keysToTry.push({ key: currentKey, name: "current" });
  }

  let lastError: Error | null = null;

  for (const { key, name } of keysToTry) {
    try {
      const result = decryptWithKey(data, key);

      // Log if we had to fall back to previous key
      if (name === "previous") {
        logger.debug("Decrypted with previous key - token needs re-encryption", {
          component: "encryption",
          keyId: keyId || "legacy",
        });
      }

      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Unknown decryption error");
      // Continue to try next key
    }
  }

  // All keys failed
  logger.error("Decryption failed with all available keys:", lastError as Error, {
    component: "encryption",
    keyId: keyId || "legacy",
    hasCurrentKey: true,
    hasPreviousKey: !!previousKey,
  });

  throw new Error(
    "Failed to decrypt token - data may be corrupted or keys are incorrect",
  );
}

/**
 * Check if encrypted data needs re-encryption with current key
 * Used during key rotation to identify tokens that need updating
 */
export function needsReEncryption(encryptedData: string): boolean {
  if (!encryptedData || typeof encryptedData !== "string") {
    return false;
  }

  const { keyId } = parseEncryptedData(encryptedData);
  const currentKeyId = getCurrentKeyId();

  // Needs re-encryption if:
  // 1. No key ID (legacy format)
  // 2. Key ID doesn't match current
  return keyId === null || keyId !== currentKeyId;
}

/**
 * Re-encrypt data with the current key
 * Use this during key rotation to update stored tokens
 */
export async function reEncryptToken(encryptedData: string): Promise<string> {
  const plaintext = await decryptToken(encryptedData);
  return encryptToken(plaintext);
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
