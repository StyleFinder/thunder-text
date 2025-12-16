/**
 * Jest environment setup for integration tests
 * This file runs BEFORE any test modules are imported
 * Required for modules that read env vars at import time (like postgres.ts)
 */

// Use override: true so .env.local takes precedence over .env.test
// eslint-disable-next-line @typescript-eslint/no-require-imports
require("dotenv").config({ path: ".env.local", override: true });
