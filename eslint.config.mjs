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
      "security/detect-pseudoRandomBytes": "error",
      "security/detect-unsafe-regex": "error",

      // Prevent hardcoded secrets (warn for now - many false positives in tests)
      "no-secrets/no-secrets": [
        "warn",
        {
          tolerance: 4.5, // Sensitivity (lower = stricter)
          ignoreContent: ["http://", "https://", "localhost", "eyJ"], // Ignore JWT test tokens
          ignoreIdentifiers: ["BASE64", "HASH", "SECRET_KEY_BASE"],
        },
      ],
      // Timing attacks - warn only (high false positive rate in API routes)
      "security/detect-possible-timing-attacks": "warn",
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
    // Allow 'any' type in debug endpoints, test files, and legacy code
    // TODO: Refactor these files to use proper types
    files: [
      "src/app/api/**/*.ts",
      "src/__tests__/**/*.ts",
      "src/**/*.test.ts",
      "src/**/*.spec.ts",
      "src/lib/aie/**/*.ts",
      "src/lib/services/**/*.ts",
      "src/lib/auth/**/*.ts",
      "src/types/best-practices.ts",
      "src/app/admin/**/*.tsx",
      "src/app/ads-library/**/*.tsx",
      "src/app/auth/**/*.tsx",
      "src/app/business-profile/**/*.tsx",
      "src/app/coach/**/*.tsx",
      "src/app/settings/**/*.tsx",
      "src/app/welcome/**/*.tsx",
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
