// eslint-disable-next-line @typescript-eslint/no-require-imports
const nextJest = require("next/jest");

const createJestConfig = nextJest({
  dir: "./",
});

// Integration test configuration with Node environment
const customJestConfig = {
  displayName: "integration",
  testEnvironment: "node", // Use Node environment for integration tests
  setupFilesAfterEnv: ["<rootDir>/jest.integration.setup.js"], // Use integration-specific setup
  testMatch: [
    "<rootDir>/src/__tests__/security/**/*.test.ts",
    "<rootDir>/src/__tests__/integration/**/*.test.ts",
  ],
  testPathIgnorePatterns: ["<rootDir>/.next/", "<rootDir>/node_modules/"],
  transform: {
    "^.+\\.(js|jsx|ts|tsx)$": ["babel-jest", { presets: ["next/babel"] }],
  },
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  // Longer timeout for integration tests
  testTimeout: 30000,
};

module.exports = createJestConfig(customJestConfig);
