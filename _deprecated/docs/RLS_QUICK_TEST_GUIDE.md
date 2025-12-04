# RLS Quick Test Guide

**Status**: Development server is running ✅
**URL**: http://localhost:3050

---

## Quick Start (5-Minute Test)

### Step 1: Open Two Browser Windows

**Window 1 (Chrome/Brave):**

- URL: http://localhost:3050/auth/login
- Login: baker2122@gmail.com
- Store: bakerstore.localhost:3050

**Window 2 (Chrome Incognito or Firefox):**

- URL: http://localhost:3050/auth/login
- Login: baker2122+test2@gmail.com
- Store: bakerteststore.localhost:3050

---

### Step 2: Basic Data Isolation Test (2 minutes)

**In Window 1 (bakerstore):**

1. Login and navigate to any data page (Content Center, Brand Voice, etc.)
2. Note the number of items you see
3. Note some sample IDs or names

**In Window 2 (bakerteststore):**

1. Login and navigate to the same page
2. Note the number of items you see
3. Compare with Window 1

**Expected Result:**

- ✅ Different data in each window
- ✅ No overlap between stores
- ❌ If you see the same data in both windows = **RLS FAILURE**

---

### Step 3: Console Test (2 minutes)

**In Window 1 (bakerstore):**

1. Open Developer Console (F12)
2. Get your user ID:

```javascript
const {
  data: { user },
} = await supabase.auth.getUser();
console.log("My User ID:", user.id);
```

3. Get Window 2's user ID from that browser and try to access their data:

```javascript
// Replace <WINDOW2_USER_ID> with actual ID from Window 2
const { data, error } = await supabase
  .from("content_samples")
  .select("*")
  .eq("user_id", "<WINDOW2_USER_ID>");

console.log("Cross-store data:", data);
console.log("Error:", error);
```

**Expected Result:**

- ✅ `data` is empty array `[]`
- ✅ Or `error` saying no permission
- ❌ If you see data = **RLS FAILURE**

---

### Step 4: Create and Verify (1 minute)

**In Window 1 (bakerstore):**

1. Create a new content sample with text: "RLS TEST FROM STORE 1"
2. Save it

**In Window 2 (bakerteststore):**

1. Refresh the content samples page
2. Look for "RLS TEST FROM STORE 1"

**Expected Result:**

- ✅ Sample visible ONLY in Window 1
- ✅ Sample NOT visible in Window 2
- ❌ If visible in Window 2 = **RLS FAILURE**

---

## Result Interpretation

### ✅ ALL TESTS PASS

**Status**: RLS is working correctly
**Action**: Update SECURITY_ACTION_PLAN.md, mark Task 1 complete, proceed to Task 2

### ⚠️ SOME TESTS FAIL

**Status**: RLS partially working
**Action**: Document failures, review policies, fix issues

### ❌ TESTS FAIL COMPLETELY

**Status**: RLS not working
**Action**: Immediate investigation required, check:

1. Are RLS policies actually enabled?
2. Is auth.uid() returning correct value?
3. Are JWT claims set correctly?

---

## Helpful Commands

### Check Who You're Logged In As

```javascript
const {
  data: { user },
} = await supabase.auth.getUser();
console.log("Email:", user.email);
console.log("User ID:", user.id);
```

### Check What Data You Can See

```javascript
const { data, count, error } = await supabase
  .from("content_samples")
  .select("*", { count: "exact" });

console.log("Sample count:", count);
console.log("Samples:", data);
console.log("Error:", error);
```

### Verify Store ID Matches User ID

```javascript
const {
  data: { user },
} = await supabase.auth.getUser();
const { data: samples } = await supabase
  .from("content_samples")
  .select("id, user_id");

const allMatch = samples.every((s) => s.user_id === user.id);
console.log("All samples belong to me:", allMatch); // Should be true
```

---

## Test Results Template

Copy this and fill it out:

```markdown
## RLS Manual Test Results

**Date**: October 24, 2025
**Tester**: [Your Name]
**Duration**: \_\_\_ minutes

### Test 1: Data Isolation

- Window 1 (bakerstore): \_\_\_ items visible
- Window 2 (bakerteststore): \_\_\_ items visible
- Overlap: [ YES / NO ]
- **Status**: [ PASS / FAIL ]

### Test 2: Console Cross-Store Query

- Attempted to access Window 2 data from Window 1
- Data returned: [ YES / NO ]
- **Status**: [ PASS / FAIL ]

### Test 3: Create and Verify

- Created sample in Window 1
- Visible in Window 2: [ YES / NO ]
- **Status**: [ PASS / FAIL ]

### Overall Assessment

- [ ] ✅ RLS Working - Ready for production
- [ ] ⚠️ RLS Partial - Needs fixes
- [ ] ❌ RLS Broken - Critical issues

### Issues Found
```

[List any issues here]

```

### Next Steps
```

[What needs to be done next]

```

```

---

**Ready to test?**

1. Open two browser windows
2. Follow the 5-minute test above
3. Document results
4. Report back!

---

**Full Testing**: See [RLS_BROWSER_TESTING_CHECKLIST.md](RLS_BROWSER_TESTING_CHECKLIST.md) for comprehensive 18-test checklist (30+ minutes)
