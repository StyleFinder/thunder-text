import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import security from "eslint-plugin-security";
import noSecrets from "eslint-plugin-no-secrets";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),

  // Security plugin configuration
  {
    plugins: {
      security,
      "no-secrets": noSecrets,
    },
    rules: {
      // Security rules - detect common vulnerabilities
      "security/detect-buffer-noassert": "error",
      "security/detect-child-process": "error",
      "security/detect-disable-mustache-escape": "error",
      "security/detect-eval-with-expression": "error",
      "security/detect-new-buffer": "error",
      "security/detect-no-csrf-before-method-override": "error",
      "security/detect-non-literal-fs-filename": "warn", // Warn, not error - common in Next.js
      "security/detect-non-literal-regexp": "warn",
      "security/detect-non-literal-require": "warn",
      "security/detect-object-injection": "warn", // High false positives, warn only
      "security/detect-possible-timing-attacks": "error",
      "security/detect-pseudoRandomBytes": "error",
      "security/detect-unsafe-regex": "error",

      // Prevent hardcoded secrets
      "no-secrets/no-secrets": [
        "error",
        {
          tolerance: 4.5, // Sensitivity (lower = stricter)
          ignoreContent: ["http://", "https://", "localhost"],
          ignoreIdentifiers: ["BASE64", "HASH", "SECRET_KEY_BASE"],
        },
      ],
    },
  },
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
  {
    // Allow 'any' type in debug endpoints, test files, and legacy AIE code
    // TODO: Refactor AIE and services to use proper types
    files: [
      "src/app/api/debug/**/*.ts",
      "src/__tests__/**/*.ts",
      "src/**/*.test.ts",
      "src/**/*.spec.ts",
      "src/lib/aie/**/*.ts",
      "src/lib/services/**/*.ts",
      "src/types/best-practices.ts",
      "src/app/api/aie/**/*.ts",
      "src/app/api/best-practices/**/*.ts",
      "src/app/best-practices/**/*.tsx",
      "src/app/bhb/**/*.tsx",
      "src/app/brand-voice/**/*.tsx",
      "src/components/**/*.tsx",
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  {
    // Temporarily disable quote escaping and empty interface rules
    // These are style issues, not functional bugs - will fix in separate PR
    rules: {
      "react/no-unescaped-entities": "warn",
      "@typescript-eslint/no-empty-object-type": "warn",
      "@typescript-eslint/ban-ts-comment": "warn",
    },
  },
];

export default eslintConfig;
