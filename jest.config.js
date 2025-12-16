// eslint-disable-next-line @typescript-eslint/no-require-imports
const nextJest = require("next/jest");

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: "./",
});

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  testEnvironment: "jsdom",
  testPathIgnorePatterns: [
    "<rootDir>/.next/",
    "<rootDir>/node_modules/",
    "<rootDir>/packages/", // Exclude monorepo packages (have their own test config)
    "<rootDir>/src/__tests__/security/", // These need integration test config (node environment)
    "<rootDir>/src/__tests__/integration/", // These need integration test config
    "<rootDir>/src/__tests__/utils/", // Test utilities/helpers, not actual tests
    "<rootDir>/src/__tests__/mocks/", // Mock files, not actual tests
    "<rootDir>/e2e/", // E2E tests are run by Playwright, not Jest
  ],
  transform: {
    "^.+\\.(js|jsx|ts|tsx)$": ["babel-jest", { presets: ["next/babel"] }],
  },
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  collectCoverageFrom: [
    "src/**/*.{js,jsx,ts,tsx}",
    "!src/**/*.d.ts",
    "!src/**/index.{js,ts}",
    // Exclude backend code (covered by integration tests, not unit tests)
    "!src/app/api/**", // API routes
    "!src/lib/auth/**", // Auth utilities
    "!src/lib/aie/**", // AI engine
    "!src/lib/billing/**", // Billing
    "!src/lib/middleware/**", // Middleware
    "!src/lib/security/**", // Security
    "!src/lib/services/**", // Backend services
    "!src/lib/shopify/**", // Shopify integration
    "!src/lib/supabase/**", // Supabase client
    "!src/lib/trends/**", // Trends API
    "!src/__tests__/**", // Test files themselves
  ],
  // Coverage thresholds - start low, increase as unit tests are added
  // Current: ~1.5% statements/lines, ~1% branches/functions
  // Target: Increase by 5% per sprint until 80%
  coverageThreshold: {
    global: {
      branches: 0.5,
      functions: 0.5,
      lines: 1,
      statements: 1,
    },
  },
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig);
