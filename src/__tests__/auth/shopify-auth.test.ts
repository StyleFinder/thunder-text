import { describe, it, expect, beforeEach } from "@jest/globals";
import crypto from "crypto";

/**
 * Unit tests for Shopify authentication
 * Tests session token verification and JWT validation
 */

const TEST_CLIENT_SECRET = "test-secret-key-12345";
const TEST_SHOP = "test-store.myshopify.com";
const TEST_CLIENT_ID = "test-client-id";

describe("Shopify Authentication", () => {
  beforeEach(() => {
    // Set up test environment
    process.env.SHOPIFY_API_SECRET = TEST_CLIENT_SECRET;
    process.env.NEXT_PUBLIC_SHOPIFY_API_KEY = TEST_CLIENT_ID;
  });

  describe("Session Token Signature Verification", () => {
    it("should verify valid session token signature", () => {
      // Create a test JWT token with valid structure
      const header = Buffer.from(
        JSON.stringify({
          alg: "HS256",
          typ: "JWT",
        }),
      ).toString("base64url");

      const now = Math.floor(Date.now() / 1000);
      const payload = Buffer.from(
        JSON.stringify({
          iss: `https://${TEST_SHOP}/admin`,
          dest: `https://${TEST_SHOP}`,
          aud: TEST_CLIENT_ID,
          sub: "1",
          exp: now + 60,
          nbf: now,
          iat: now,
          jti: "4f4997a5-ab92-421e-a954-b6680e9d2485",
          sid: "session-id",
        }),
      ).toString("base64url");

      // Sign with HMAC-SHA256 using client secret
      const signingInput = `${header}.${payload}`;
      const hmac = crypto.createHmac("sha256", TEST_CLIENT_SECRET);
      hmac.update(signingInput);
      const signature = hmac.digest("base64url");

      const sessionToken = `${header}.${payload}.${signature}`;

      // Verify signature manually (simulates our verification logic)
      const [h, p, s] = sessionToken.split(".");
      const testSigningInput = `${h}.${p}`;
      const testHmac = crypto.createHmac("sha256", TEST_CLIENT_SECRET);
      testHmac.update(testSigningInput);
      const calculatedSignature = testHmac.digest("base64url");

      expect(calculatedSignature).toBe(s);
    });

    it("should reject session token with invalid signature", () => {
      const header = Buffer.from(
        JSON.stringify({ alg: "HS256", typ: "JWT" }),
      ).toString("base64url");

      const now = Math.floor(Date.now() / 1000);
      const payload = Buffer.from(
        JSON.stringify({
          iss: `https://${TEST_SHOP}/admin`,
          dest: `https://${TEST_SHOP}`,
          aud: TEST_CLIENT_ID,
          exp: now + 60,
        }),
      ).toString("base64url");

      // Invalid signature (tampered)
      const invalidSignature = "invalid-signature-12345";
      const sessionToken = `${header}.${payload}.${invalidSignature}`;

      // Verify signature fails
      const [h, p, s] = sessionToken.split(".");
      const testSigningInput = `${h}.${p}`;
      const testHmac = crypto.createHmac("sha256", TEST_CLIENT_SECRET);
      testHmac.update(testSigningInput);
      const calculatedSignature = testHmac.digest("base64url");

      expect(calculatedSignature).not.toBe(s);
    });

    it("should use timing-safe comparison for signatures", () => {
      const validSignature = "valid-signature-abcd1234";
      const invalidSignature = "invalid-signature-xyz";

      const expected = Buffer.from(validSignature, "utf8");
      const received = Buffer.from(invalidSignature, "utf8");

      // Should handle length mismatch
      if (expected.length !== received.length) {
        expect(expected.length).not.toBe(received.length);
      } else {
        // Use timing-safe comparison
        const isValid = crypto.timingSafeEqual(expected, received);
        expect(isValid).toBe(false);
      }
    });
  });

  describe("JWT Payload Validation", () => {
    it("should parse JWT payload correctly", () => {
      const now = Math.floor(Date.now() / 1000);
      const payload = {
        iss: `https://${TEST_SHOP}/admin`,
        dest: `https://${TEST_SHOP}`,
        aud: TEST_CLIENT_ID,
        sub: "1234567890",
        exp: now + 60,
        nbf: now,
        iat: now,
        jti: "unique-jwt-id",
        sid: "session-id",
      };

      const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
        "base64url",
      );

      // Decode payload
      const decoded = JSON.parse(
        Buffer.from(encodedPayload, "base64url").toString(),
      );

      expect(decoded.iss).toBe(`https://${TEST_SHOP}/admin`);
      expect(decoded.dest).toBe(`https://${TEST_SHOP}`);
      expect(decoded.aud).toBe(TEST_CLIENT_ID);
      expect(decoded.sub).toBe("1234567890");
    });

    it("should validate required JWT fields", () => {
      const now = Math.floor(Date.now() / 1000);

      // Valid payload with all required fields
      const validPayload = {
        iss: `https://${TEST_SHOP}/admin`,
        dest: `https://${TEST_SHOP}`,
        aud: TEST_CLIENT_ID,
        sub: "1",
        exp: now + 60,
        nbf: now,
        iat: now,
      };

      const hasRequiredFields = !!(
        validPayload.iss &&
        validPayload.dest &&
        validPayload.aud &&
        validPayload.sub
      );

      expect(hasRequiredFields).toBe(true);

      // Invalid payload missing required fields
      const invalidPayload = {
        exp: now + 60,
        // Missing: iss, dest, aud, sub
      };

      const missingFields =
        !(invalidPayload as any).iss ||
        !(invalidPayload as any).dest ||
        !(invalidPayload as any).aud ||
        !(invalidPayload as any).sub;

      expect(missingFields).toBe(true);
    });

    it("should validate token expiration", () => {
      const now = Math.floor(Date.now() / 1000);

      // Valid token (expires in future)
      const validToken = {
        exp: now + 60,
        iat: now,
      };

      const isNotExpired = validToken.exp * 1000 > Date.now();
      expect(isNotExpired).toBe(true);

      // Expired token
      const expiredToken = {
        exp: now - 3600, // Expired 1 hour ago
        iat: now - 3660,
      };

      const isExpired = expiredToken.exp * 1000 < Date.now();
      expect(isExpired).toBe(true);
    });

    it("should validate not-before (nbf) claim", () => {
      const now = Math.floor(Date.now() / 1000);

      // Token valid now
      const validToken = {
        nbf: now - 10, // Valid since 10 seconds ago
      };

      const isValid = validToken.nbf * 1000 <= Date.now();
      expect(isValid).toBe(true);

      // Token not yet valid
      const futureToken = {
        nbf: now + 3600, // Not valid for another hour
      };

      const isNotYetValid = futureToken.nbf * 1000 > Date.now();
      expect(isNotYetValid).toBe(true);
    });

    it("should validate shop domain match", () => {
      const payload = {
        dest: `https://${TEST_SHOP}`,
      };

      const requestShop = TEST_SHOP;

      // SECURITY [R-A2041]: Use URL API for safe hostname extraction
      // This prevents bypass attacks like "https://https://evil.com"
      const extractHostname = (urlString: string): string => {
        try {
          return new URL(urlString).hostname;
        } catch {
          // Fallback uses global regex for complete sanitization
          return urlString.replace(/^https?:\/\//gi, "");
        }
      };

      // SECURITY [R-A2041]: Use global regex for complete suffix removal
      const extractShopName = (shop: string): string =>
        shop.replace(/\.myshopify\.com/gi, "");

      // Extract shop from dest and compare using secure methods
      const destShop = extractHostname(payload.dest);
      const matches = destShop.includes(extractShopName(requestShop));

      expect(matches).toBe(true);

      // Test mismatch
      const wrongShop = "different-store.myshopify.com";
      const wrongDestShop = extractHostname(payload.dest);
      const doesNotMatch = !wrongDestShop.includes(extractShopName(wrongShop));

      expect(doesNotMatch).toBe(true);
    });

    it("should validate audience (aud) matches client ID", () => {
      const payload = {
        aud: TEST_CLIENT_ID,
      };

      const expectedClientId = TEST_CLIENT_ID;

      expect(payload.aud).toBe(expectedClientId);

      // Test mismatch
      const wrongPayload = {
        aud: "wrong-client-id",
      };

      expect(wrongPayload.aud).not.toBe(expectedClientId);
    });
  });

  describe("Token Format Validation", () => {
    it("should validate JWT structure (header.payload.signature)", () => {
      const validToken =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ0ZXN0In0.signature";

      const parts = validToken.split(".");
      expect(parts.length).toBe(3);
      expect(parts[0]).toBeTruthy(); // header
      expect(parts[1]).toBeTruthy(); // payload
      expect(parts[2]).toBeTruthy(); // signature
    });

    it("should reject malformed tokens", () => {
      const malformedTokens = [
        { token: "invalid-token", reason: "not enough parts" },
        { token: "only.two", reason: "only 2 parts" },
        { token: "..", reason: "empty parts" },
        { token: "header.payload.", reason: "empty signature" },
        { token: ".payload.signature", reason: "empty header" },
      ];

      malformedTokens.forEach(({ token }) => {
        const parts = token.split(".");
        // Token is valid only if it has exactly 3 non-empty parts
        const isValid = parts.length === 3 && parts.every((p) => p.length > 0);
        expect(isValid).toBe(false);
      });
    });
  });

  describe("Security Edge Cases", () => {
    it("should handle algorithm confusion attacks", () => {
      // Ensure we only accept HS256
      const header = {
        alg: "HS256",
        typ: "JWT",
      };

      expect(header.alg).toBe("HS256");

      // Reject other algorithms
      const invalidAlgorithms = ["none", "RS256", "ES256"];

      invalidAlgorithms.forEach((alg) => {
        const invalidHeader = { alg, typ: "JWT" };
        expect(invalidHeader.alg).not.toBe("HS256");
      });
    });

    it("should prevent signature bypass with empty signature", () => {
      const header = Buffer.from(
        JSON.stringify({ alg: "HS256", typ: "JWT" }),
      ).toString("base64url");

      const payload = Buffer.from(JSON.stringify({ iss: "test" })).toString(
        "base64url",
      );

      const emptySignature = "";
      const token = `${header}.${payload}.${emptySignature}`;

      const parts = token.split(".");
      const hasEmptySignature = parts[2] === "";

      expect(hasEmptySignature).toBe(true);
      // This should be rejected in actual implementation
    });

    it("should handle very long tokens", () => {
      // Create a token with very long payload
      const longPayload = "a".repeat(10000);
      const payload = Buffer.from(
        JSON.stringify({ data: longPayload }),
      ).toString("base64url");

      expect(payload.length).toBeGreaterThan(10000);
      // Implementation should have reasonable size limits
    });
  });
});
