/**
 * Jest setup for integration tests
 *
 * This setup uses REAL environment variables and REAL Supabase clients
 * (no mocking) to test actual database interactions and RLS policies.
 */

// Load environment variables from .env.test for integration tests
// IMPORTANT: Use override: true to replace any existing env vars from .env.local
// eslint-disable-next-line @typescript-eslint/no-require-imports
require("dotenv").config({ path: ".env.test", override: true });

// Verify required environment variables are set
const requiredEnvVars = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_KEY",
];

// eslint-disable-next-line security/detect-object-injection
const missingEnvVars = requiredEnvVars.filter(
  (varName) => !process.env[varName],
);

if (missingEnvVars.length > 0) {
  throw new Error(
    `Missing required environment variables for integration tests: ${missingEnvVars.join(", ")}\n` +
      "Please ensure .env.test contains these values.",
  );
}

// Log test environment info (without exposing secrets)
console.log("Integration Test Environment:");
console.log("- Supabase URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log(
  "- Anon Key:",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.slice(0, 20) + "...",
);
console.log(
  "- Service Key:",
  process.env.SUPABASE_SERVICE_KEY?.slice(0, 20) + "...",
);
