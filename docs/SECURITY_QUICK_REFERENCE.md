# Security Scanning - Quick Reference

## Daily Commands

```bash
# Before committing code
npm run security:check

# Just lint security issues
npm run security:lint

# Just dependency scan
npm run security:audit
```

## What Happens Automatically

### On Every Commit

✅ ESLint security rules run
✅ TypeScript type checking
✅ Code formatting with Prettier

### On Every Pull Request

✅ Full security scan
✅ Dependency audit
✅ Test suite
✅ PR comment with security summary

## Quick Fixes

### Remove Unused Code

```bash
npm run lint -- --fix
```

### Update Vulnerable Dependencies

```bash
npm audit fix
```

### See All Security Issues

```bash
npm run security:lint 2>&1 | less
```

## Current Status

✅ **Dependencies:** 0 vulnerabilities
⚠️ **Code Issues:** 3 medium warnings, 36 low warnings

**Most Important:**

- Fix object injection in `detect-colors/route.ts`
- Fix object injection in `generate/create/route.ts`

## Files You Created

```
📁 Project Root
├── 📄 eslint.config.mjs          # Security rules configured
├── 📄 package.json               # Security scripts added
├── 📄 .lintstagedrc.json         # Pre-commit linting config
├── 📁 .husky/
│   └── 📄 pre-commit             # Auto-runs before commits
├── 📁 .github/workflows/
│   └── 📄 security-scan.yml      # CI/CD security checks
└── 📁 docs/
    ├── 📄 security-scanning.md   # Full documentation
    ├── 📄 SECURITY_SCAN_REPORT.md # Initial scan results
    └── 📄 SECURITY_QUICK_REFERENCE.md # This file!
```

## Need Help?

See: `docs/security-scanning.md` for detailed guides
