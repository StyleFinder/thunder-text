# Production-Ready Development Guidelines

## Core Principle
**"Ship Quality, Not Just Working Code"**

Never prioritize "working right now" over "working correctly forever." Every solution should be evaluated for long-term maintainability, not just immediate functionality.

---

## The "Two-Step Rule" for AI-Assisted Development

When Claude proposes any solution, it MUST follow this pattern:

### Step 1: Make It Work (Immediate Fix)
- Fix the crash/error/bug
- Document what was done and WHY
- Mark as "TEMPORARY FIX" or "PRODUCTION-READY"

### Step 2: Make It Right (Production Solution)
- If Step 1 was temporary, immediately propose the proper solution
- Explain what the long-term fix should be
- Ask: "Should I implement the production-ready version now?"

**Example:**
```
❌ BAD RESPONSE:
"I fixed the crash by adding null checks. Done!"

✅ GOOD RESPONSE:
"I fixed the crash by adding null checks (TEMPORARY FIX).

However, the ROOT CAUSE is that the API endpoints don't exist.

For production, we should:
1. Create the missing /api/categories endpoint
2. Create the missing /api/sizing endpoint
3. Keep the null checks as defensive programming

Should I create these API endpoints now, or do you want to handle that separately?"
```

---

## Critical Questions Claude MUST Answer Before Coding

Before implementing ANY solution, Claude must explicitly state:

### 1. Root Cause Analysis
**Question:** "What is the ACTUAL problem here?"
- ✅ The API endpoints don't exist
- ❌ The arrays are undefined (this is a symptom, not the problem)

### 2. Solution Type Classification
**Question:** "Is this solution temporary or production-ready?"
- **TEMPORARY**: Quick fix, band-aid, workaround, fallback
- **PRODUCTION**: Proper implementation, addresses root cause
- **HYBRID**: Temporary fix + production fix needed

### 3. Technical Debt Assessment
**Question:** "Does this solution create technical debt?"
- If YES: Document the debt and propose payoff plan
- If NO: Explain why this is the right long-term solution

### 4. Future Problem Prediction
**Question:** "What new problems does this solution create?"
- Silent failures?
- Hidden errors?
- Maintenance burden?
- Scalability issues?
- Security concerns?

### 5. Observable Behavior
**Question:** "How will users and developers know if this breaks?"
- Error messages visible to users?
- Logging for developers?
- Monitoring/alerting possible?
- Debugging information available?

---

## Production-Ready Checklist

Every solution MUST pass this checklist before being considered "done":

### ✅ Functionality
- [ ] Solves the stated problem
- [ ] Handles edge cases
- [ ] Works with valid AND invalid inputs
- [ ] Fails gracefully when it must fail

### ✅ Observability
- [ ] Users see clear feedback (success, loading, error states)
- [ ] Developers can debug issues (console logs, error messages)
- [ ] Errors include context (what failed, why, how to fix)
- [ ] Success states are explicit, not assumed

### ✅ Maintainability
- [ ] Code is readable and self-documenting
- [ ] Complex logic has explanatory comments
- [ ] No "magic numbers" or unexplained constants
- [ ] Follows existing codebase patterns

### ✅ Resilience
- [ ] Handles network failures
- [ ] Handles API errors (4xx, 5xx)
- [ ] Handles malformed data
- [ ] Has appropriate timeouts/retries

### ✅ Security
- [ ] Input validation present
- [ ] No sensitive data in logs
- [ ] Authentication/authorization checked
- [ ] SQL injection / XSS prevented

### ✅ Documentation
- [ ] Comments explain WHY, not just WHAT
- [ ] Error states documented
- [ ] Assumptions stated explicitly
- [ ] Known limitations listed

---

## Anti-Patterns Claude MUST Avoid

### ❌ Silent Failures
```typescript
// BAD: Error hidden, nobody knows
try {
  const data = await fetchData()
  if (data) setData(data)
} catch (err) {
  // Use default data - silently fails
}

// GOOD: Error visible, everyone knows
try {
  const data = await fetchData()
  if (data) {
    setData(data)
    setError(null)
  }
} catch (err) {
  setError(`Failed to load data: ${err.message}`)
  // Still show UI with defaults, but user sees warning
}
```

### ❌ Assumption-Based Code
```typescript
// BAD: Assumes API always returns array
const items = data.map(...)

// GOOD: Validates assumptions
if (!Array.isArray(data)) {
  throw new Error(`Expected array, got ${typeof data}`)
}
const items = data.map(...)
```

### ❌ "It Works On My Machine"
```typescript
// BAD: Only tested happy path
function divide(a, b) {
  return a / b
}

// GOOD: Handles edge cases
function divide(a, b) {
  if (b === 0) {
    throw new Error('Division by zero')
  }
  if (!Number.isFinite(a) || !Number.isFinite(b)) {
    throw new Error('Invalid input: expected finite numbers')
  }
  return a / b
}
```

### ❌ Magic Fallbacks
```typescript
// BAD: Why these defaults? Nobody knows
const config = userConfig || { timeout: 5000, retries: 3 }

// GOOD: Documented defaults with reasoning
// Default to 5s timeout (API SLA is 3s + 2s buffer)
// Default to 3 retries (balance between reliability and user wait time)
const DEFAULT_CONFIG = { timeout: 5000, retries: 3 }
const config = userConfig || DEFAULT_CONFIG
```

### ❌ Catch-All Error Handlers
```typescript
// BAD: All errors treated the same
try {
  // 100 lines of code
} catch (err) {
  showError('Something went wrong')
}

// GOOD: Specific error handling
try {
  const response = await fetch('/api/data')
  if (response.status === 401) {
    redirectToLogin()
    return
  }
  if (response.status === 404) {
    showError('Data not found')
    return
  }
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`)
  }
  // ... rest of logic
} catch (err) {
  if (err instanceof NetworkError) {
    showError('Network connection lost. Please check your internet.')
  } else {
    showError(`Unexpected error: ${err.message}`)
    console.error('Full error:', err)
  }
}
```

---

## The "Production Readiness" Conversation Template

When Claude finishes any implementation, it should initiate this conversation:

```
Claude: "I've implemented [FEATURE]. Let me assess production readiness:

✅ WORKS: The page no longer crashes
✅ GRACEFUL DEGRADATION: Falls back to defaults if API fails
✅ USER FEEDBACK: Shows warning banner on API errors
✅ DEVELOPER FEEDBACK: Console logs detailed error messages

⚠️ KNOWN LIMITATIONS:
- The /api/categories endpoint doesn't exist yet
- The /api/sizing endpoint doesn't exist yet
- Using hardcoded fallback data until APIs are created

🎯 NEXT STEPS FOR FULL PRODUCTION:
1. Create /api/categories endpoint
2. Create /api/sizing endpoint
3. Add unit tests for error handling
4. Add monitoring/alerting for API failures

Should I:
A) Create the missing API endpoints now?
B) Create tickets/issues for the remaining work?
C) Move to the next feature (APIs built later)?

Your choice determines whether this is shipped as-is or completed fully."
```

---

## Decision Framework: When To Stop

Claude should explicitly state the stopping point:

### 🟢 Ship Now (Production Ready)
- ✅ Solves root cause, not just symptoms
- ✅ All edge cases handled
- ✅ Users see appropriate feedback
- ✅ Developers can debug issues
- ✅ No technical debt created
- ✅ Passes all production checklist items

### 🟡 Ship With Warning (Acceptable Tradeoffs)
- ✅ Core functionality works
- ✅ Known limitations documented
- ✅ Users warned about limitations
- ✅ Technical debt tracked
- ⚠️ Some edge cases deferred
- ⚠️ Monitoring needed
- **Required:** Clear explanation of tradeoffs and timeline to complete

### 🔴 Don't Ship Yet (Not Production Ready)
- ❌ Silent failures possible
- ❌ Users can't tell what's working
- ❌ Developers can't debug issues
- ❌ Creates more problems than it solves
- ❌ Security concerns
- **Required:** More work before deployment

---

## Example: Our Categories/Sizing Scenario

### Initial Approach (What Claude Did):
```
Problem: Page crashes, arrays undefined
Solution: Add null checks
Result: Page works, nobody knows about API failures ❌
```

### Production-Ready Approach (What We Should Do):
```
Problem: Page crashes because API endpoints don't exist
Solution:
  1. Add null checks (defensive programming) ✅
  2. Track API errors explicitly ✅
  3. Show warning banner to users ✅
  4. Log detailed errors for developers ✅
  5. Create the missing API endpoints ⚠️ (pending)

Current State: 🟡 Ship With Warning
- Users can create products (core functionality works)
- Users see warning about limited features
- Developers can debug from console + banner
- Technical debt: Need to create 2 API endpoints

Next Steps:
1. Create /api/categories endpoint (stores custom categories in DB)
2. Create /api/sizing endpoint (stores custom sizing in DB)
3. Remove "Some Features Unavailable" warning
4. Status changes to: 🟢 Production Ready
```

---

## How To Use These Guidelines

### In CLAUDE.md:
Add this line to your project's CLAUDE.md:
```markdown
## Production Quality Standards
Before proposing any solution, Claude MUST:
1. Read /PRODUCTION_READY_GUIDELINES.md
2. Answer all 5 Critical Questions
3. Complete the Production-Ready Checklist
4. State which "Ship Level" this solution achieves (🟢🟡🔴)
5. Explicitly state: "This is PRODUCTION READY" or "This is TEMPORARY FIX - here's what's needed for production"

NEVER ship code without explicitly stating its production readiness level.
```

### In Your Workflow:
When asking Claude for help:
```
"Fix the categories loading issue.

Requirements:
- Follow /PRODUCTION_READY_GUIDELINES.md
- Tell me if this is production-ready or temporary
- If temporary, tell me what the proper fix should be
- Don't ship technical debt without my approval"
```

---

## Red Flags That Claude Is Taking Shortcuts

Watch for these phrases that indicate non-production code:

### 🚩 Danger Phrases:
- "Quick fix"
- "Temporary workaround"
- "For now, we'll..."
- "This should work"
- "Simplified version"
- "Fallback to defaults"
- **WITHOUT** explaining what the proper solution is

### ✅ Good Phrases:
- "Root cause is..."
- "Production solution requires..."
- "This handles edge cases A, B, C"
- "Users will see X when Y fails"
- "Technical tradeoff: faster development vs. proper error handling"
- "This is production-ready because..."

---

## Summary: The Meta-Rule

**"Make me explain the consequences"**

Add this to your CLAUDE.md:
```markdown
## The Consequences Rule
Before implementing any solution, Claude must answer:
1. What happens if this breaks in production?
2. How will we know if it breaks?
3. What's the impact on users?
4. What's the impact on developers?
5. What technical debt does this create?
6. When/how will we pay off that debt?

If Claude can't answer these questions, the solution isn't ready.
```

---

## Final Thought

The goal isn't to slow down development. It's to **develop at the speed of quality**, not the speed of "just make it work."

Fast shipping of quality code > Slow shipping of buggy code > Fast shipping of buggy code
