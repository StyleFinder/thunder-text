#!/usr/bin/env node
/* eslint-disable security/detect-non-literal-regexp, security/detect-non-literal-fs-filename, security/detect-object-injection */

/**
 * Pre-build check to ensure auth bypass is not enabled in production.
 * This script runs before the Next.js build to prevent accidental deployment
 * with authentication bypassed.
 *
 * Note: Security lint rules are disabled because this script:
 * - Uses static, known file paths (.env files in cwd)
 * - Uses static, known regex patterns for env var names
 * - Accesses env vars by known keys, not user input
 */

import { existsSync, readFileSync } from "fs";
import { join, basename } from "path";

const DANGEROUS_ENV_VARS = [
  "SHOPIFY_AUTH_BYPASS",
  "NEXT_PUBLIC_SHOPIFY_AUTH_BYPASS",
  "BYPASS_AUTH",
  "SKIP_AUTH",
];

// Pre-compute regex patterns to avoid dynamic construction in loop
const BYPASS_PATTERNS = DANGEROUS_ENV_VARS.map((envVar) => ({
  envVar,
  pattern: new RegExp(`^${envVar}\\s*=\\s*(true|1|yes)`, "im"),
}));

function checkEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return { exists: false, issues: [] };
  }

  const content = readFileSync(filePath, "utf8");
  const issues = [];

  for (const { envVar, pattern } of BYPASS_PATTERNS) {
    if (pattern.test(content)) {
      issues.push(`${envVar} is enabled in ${basename(filePath)}`);
    }
  }

  return { exists: true, issues };
}

function main() {
  console.log("Checking for auth bypass configuration...\n");

  const envFiles = [
    ".env",
    ".env.local",
    ".env.production",
    ".env.production.local",
  ];

  const allIssues = [];

  for (const envFile of envFiles) {
    const filePath = join(process.cwd(), envFile);
    const result = checkEnvFile(filePath);

    if (result.exists) {
      console.log(`Checked: ${envFile}`);
      if (result.issues.length > 0) {
        allIssues.push(...result.issues);
      }
    }
  }

  // Also check runtime environment variables
  for (const envVar of DANGEROUS_ENV_VARS) {
    const value = process.env[envVar];
    if (value === "true" || value === "1" || value === "yes") {
      allIssues.push(`${envVar} is set to "${value}" in runtime environment`);
    }
  }

  console.log("");

  if (allIssues.length > 0) {
    console.error("ERROR: Auth bypass detected!\n");
    for (const issue of allIssues) {
      console.error(`  - ${issue}`);
    }
    console.error("\nAuth bypass must be disabled for production builds.");
    console.error('Set these variables to "false" or remove them entirely.\n');
    process.exit(1);
  }

  console.log("Auth bypass check passed. No bypass configuration found.\n");
  process.exit(0);
}

main();
