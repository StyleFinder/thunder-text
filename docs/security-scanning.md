# Security Scanning Documentation

## Overview

Thunder Text uses multiple layers of security scanning to detect vulnerabilities before they reach production:

- **ESLint Security Plugins**: Detect code-level security issues (XSS, injection, etc.)
- **npm audit**: Check for known vulnerabilities in dependencies
- **Snyk**: Advanced dependency scanning with remediation guidance
- **Pre-commit Hooks**: Prevent insecure code from being committed
- **CI/CD Pipeline**: Automated security checks on every pull request

## Running Security Scans Locally

### Quick Security Check

Run all security checks at once:

```bash
npm run security:check
```

This runs:

1. Security lint check
2. npm audit
3. Snyk vulnerability scan

### Individual Checks

Run specific security tools:

```bash
# Security linting only
npm run security:lint

# Dependency audit only
npm run security:audit

# Snyk scan only
npm run security:scan
```

### Before Every Commit

Pre-commit hooks automatically run:

- ESLint with security rules (fixes issues automatically when possible)
- TypeScript type checking
- Prettier formatting

These checks happen automatically when you run `git commit`.

## Understanding Security Reports

### Severity Levels

| Level        | Description                                 | Action Required                   |
| ------------ | ------------------------------------------- | --------------------------------- |
| **CRITICAL** | Actively exploited vulnerabilities          | Fix immediately, block deployment |
| **HIGH**     | Serious vulnerabilities with known exploits | Fix within 24-48 hours            |
| **MODERATE** | Potential security issues                   | Fix within 1-2 weeks              |
| **LOW**      | Minor issues or theoretical vulnerabilities | Fix when convenient               |

### Common Security Issues Detected

#### 1. Hardcoded Secrets

❌ **Bad:**

```typescript
const apiKey = "sk_live_abc123xyz";
```

✅ **Good:**

```typescript
const apiKey = process.env.SHOPIFY_API_KEY;
```

#### 2. SQL Injection

❌ **Bad:**

```typescript
const query = `SELECT * FROM users WHERE email = '${userInput}'`;
```

✅ **Good:**

```typescript
const { data } = await supabase
  .from("users")
  .select("*")
  .eq("email", userInput); // Parameterized query
```

#### 3. XSS (Cross-Site Scripting)

❌ **Bad:**

```typescript
<div dangerouslySetInnerHTML={{ __html: userInput }} />
```

✅ **Good:**

```typescript
<div>{userInput}</div>  // React auto-escapes
```

#### 4. Command Injection

❌ **Bad:**

```typescript
exec(`git clone ${userProvidedUrl}`);
```

✅ **Good:**

```typescript
execFile("git", ["clone", userProvidedUrl]);
```

#### 5. Unsafe Regular Expressions

❌ **Bad:**

```typescript
const regex = new RegExp(userInput); // ReDoS vulnerability
```

✅ **Good:**

```typescript
// Use pre-defined, tested regex patterns
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
```

## Fixing Vulnerabilities

### Process for Addressing Security Issues

1. **Run security scan** to identify issues

   ```bash
   npm run security:check
   ```

2. **Categorize by severity** (Critical → High → Moderate → Low)

3. **Fix critical and high issues immediately**
   - Update vulnerable dependencies: `npm audit fix`
   - Patch code-level vulnerabilities manually
   - Test thoroughly after fixes

4. **Create plan for moderate/low issues**
   - Document in GitHub issues
   - Schedule fixes in upcoming sprints
   - Monitor for exploit activity

5. **Verify fixes**

   ```bash
   npm run security:check
   ```

6. **Commit with security note**
   ```bash
   git commit -m "fix(security): patch XSS vulnerability in user input handling"
   ```

### Updating Vulnerable Dependencies

```bash
# Check what will be updated
npm audit

# Auto-fix vulnerabilities (when possible)
npm audit fix

# Force update breaking changes (use carefully)
npm audit fix --force

# Update specific package
npm update package-name@latest
```

### When Fixes Aren't Available

If a vulnerability has no fix available:

1. **Check if you're actually using the vulnerable code**

   ```bash
   npm ls vulnerable-package
   ```

2. **Create Snyk ignore policy** (temporary, with expiration)

   ```bash
   snyk ignore --id=SNYK-JS-PACKAGE-12345 --expiry=2025-12-31 --reason="No fix available, not exploitable in our use case"
   ```

3. **Document risk acceptance** in `docs/security-decisions.md`

4. **Monitor for updates** weekly

## CI/CD Security Pipeline

### GitHub Actions Workflow

Every pull request triggers:

1. ✅ TypeScript type checking
2. ✅ Security linting
3. ✅ npm audit
4. ✅ Snyk vulnerability scan
5. ✅ Test suite
6. ✅ Hardcoded secret detection

### Workflow Results

The security scan posts a comment on your PR with:

- Vulnerability counts by severity
- Pass/fail status
- Link to detailed reports

**Deployment will be blocked if:**

- Critical vulnerabilities found
- High vulnerabilities found
- TypeScript errors exist
- Security lint errors exist

## Security Tools Reference

### ESLint Security Plugin

**Detects:**

- Unsafe regex patterns
- Eval usage
- Command injection
- Object injection
- Timing attacks

**Configuration:** `eslint.config.mjs`

**Documentation:** https://github.com/eslint-community/eslint-plugin-security

### npm audit

**Built-in tool** that checks npm packages against the GitHub Advisory Database.

**Pros:**

- Free
- Fast
- Integrated with npm

**Cons:**

- Only checks npm packages
- Limited remediation guidance

**Documentation:** https://docs.npmjs.com/cli/v8/commands/npm-audit

### Snyk

**Advanced scanning** with better vulnerability database and fix suggestions.

**Pros:**

- Comprehensive vulnerability database
- Provides fix PRs automatically
- License compliance checking
- Real-time monitoring

**Cons:**

- Requires authentication token
- Rate limits on free tier

**Setup:**

1. Create account at https://snyk.io
2. Generate auth token
3. Add to GitHub Secrets as `SNYK_TOKEN`

**Documentation:** https://docs.snyk.io

## Suppressing False Positives

### ESLint Suppressions

Only suppress when you understand the rule and have a valid reason:

```typescript
// eslint-disable-next-line security/detect-object-injection
const value = obj[userControlledKey]; // Safe: key is validated above
```

**Always include a comment explaining WHY it's safe.**

### Snyk Suppressions

Create a `.snyk` policy file:

```yaml
# Snyk policy file
version: v1.25.0

ignore:
  SNYK-JS-MINIMIST-123456:
    - "*":
        reason: Not exploitable in our context (only used in build scripts)
        expires: 2025-12-31T00:00:00.000Z
        created: 2025-01-15T00:00:00.000Z
```

## Best Practices

### DO ✅

- Run `npm run security:check` before every release
- Fix critical/high vulnerabilities immediately
- Keep dependencies updated regularly
- Review security scan results in PRs
- Document security decisions
- Use environment variables for secrets
- Validate and sanitize all user input

### DON'T ❌

- Disable security rules without justification
- Commit hardcoded secrets or API keys
- Ignore high/critical vulnerabilities
- Suppress warnings without understanding them
- Deploy with known critical vulnerabilities
- Use `npm audit fix --force` blindly

## Monitoring & Alerts

### Continuous Monitoring

Enable Snyk monitoring to get alerts for new vulnerabilities:

```bash
npm run security:monitor
```

This creates a snapshot of your dependencies in Snyk's dashboard. You'll receive email alerts when new vulnerabilities are discovered.

### Weekly Security Review

Schedule a recurring calendar event to:

1. Run `npm run security:check`
2. Review any new vulnerabilities
3. Update dependencies
4. Check Snyk dashboard for alerts

### GitHub Security Alerts

Enable Dependabot alerts in your repository:

1. Go to Settings → Security & analysis
2. Enable "Dependabot alerts"
3. Enable "Dependabot security updates"

## Incident Response

If a security vulnerability is discovered in production:

1. **Assess severity** (CVSS score, exploitability)
2. **Contain** (disable affected feature if critical)
3. **Fix** (patch immediately)
4. **Deploy** (emergency deployment if critical)
5. **Verify** (confirm vulnerability is patched)
6. **Post-mortem** (document how it was missed)

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Snyk Vulnerability Database](https://snyk.io/vuln/)
- [GitHub Advisory Database](https://github.com/advisories)

## Getting Help

If you're unsure about a security issue:

1. Check this documentation first
2. Search the vulnerability database
3. Ask in #security Slack channel
4. Consult with senior developers
5. When in doubt, err on the side of caution

---

**Remember:** Security is everyone's responsibility. If you see something suspicious, report it immediately.
