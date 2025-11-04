# RLS Browser Testing Checklist

**Date**: October 24, 2025
**Tester**: ******\_******
**Environment**: Local Development (http://localhost:3050)

---

## Pre-Testing Setup

### Test Accounts

You'll need **two separate test user accounts** to verify data isolation:

**Store 1:**

- Email: baker2122@gmail.com
- Store: bakerstore.localhost:3050
- Expected: Can access own data only

**Store 2:**

- Email: baker2122+test2@gmail.com
- Store: bakerteststore.localhost:3050
- Expected: Can access own data only

### Before Starting

- [ ] Start development server: `npm run dev`
- [ ] Server running at http://localhost:3050
- [ ] Both test accounts exist in database
- [ ] Clear browser cache/cookies
- [ ] Open two separate browser windows (or use incognito + regular)

---

## Test 1: User Can View Own Data

### Test 1.1: Login and Dashboard Access

**Browser Window 1: Store 1 (bakerstore)**

1. [ ] Navigate to http://localhost:3050/auth/login
2. [ ] Login with baker2122@gmail.com
3. [ ] Should redirect to http://bakerstore.localhost:3050
4. [ ] Dashboard loads successfully
5. [ ] User sees their store name displayed

**Expected Result:** ✅ Successful login and dashboard access

**Actual Result:**

```
Status: [ PASS / FAIL ]
Notes:
```

---

### Test 1.2: Content Samples - View Own Data

**In Store 1 Browser Window:**

1. [ ] Navigate to Content Center or Content Samples page
2. [ ] List of content samples should appear
3. [ ] All samples should belong to bakerstore

**Expected Result:** ✅ Only bakerstore's content samples visible

**Actual Result:**

```
Status: [ PASS / FAIL ]
Sample Count: ___
Sample IDs: _______________
Notes:
```

---

### Test 1.3: Brand Voice Profile - View Own Profile

**In Store 1 Browser Window:**

1. [ ] Navigate to Brand Voice Profile page
2. [ ] Profile should load with store's brand voice data
3. [ ] Should show profile text and metadata

**Expected Result:** ✅ Only bakerstore's brand voice profile visible

**Actual Result:**

```
Status: [ PASS / FAIL ]
Profile Version: ___
Has Data: [ YES / NO ]
Notes:
```

---

### Test 1.4: Generated Content - View Own Content

**In Store 1 Browser Window:**

1. [ ] Navigate to Generated Content or Content History page
2. [ ] List of generated content should appear
3. [ ] All content should belong to bakerstore

**Expected Result:** ✅ Only bakerstore's generated content visible

**Actual Result:**

```
Status: [ PASS / FAIL ]
Content Count: ___
Content IDs: _______________
Notes:
```

---

## Test 2: User Cannot View Other Store Data

### Test 2.1: Login Second Store

**Browser Window 2: Store 2 (bakerteststore)**

1. [ ] Navigate to http://localhost:3050/auth/login
2. [ ] Login with baker2122+test2@gmail.com
3. [ ] Should redirect to http://bakerteststore.localhost:3050
4. [ ] Dashboard loads successfully
5. [ ] User sees their store name displayed

**Expected Result:** ✅ Successful login to second store

**Actual Result:**

```
Status: [ PASS / FAIL ]
Notes:
```

---

### Test 2.2: Content Samples - Data Isolation

**In Store 2 Browser Window:**

1. [ ] Navigate to Content Center or Content Samples page
2. [ ] List of content samples should appear
3. [ ] Samples should ONLY belong to bakerteststore
4. [ ] Should NOT see any bakerstore samples

**In Store 1 Browser Window (still logged in):**

1. [ ] Verify Store 1 still sees only their own samples
2. [ ] Verify no bakerteststore samples visible

**Expected Result:** ✅ Complete data isolation - each store sees only their own data

**Actual Result:**

```
Store 2 Status: [ PASS / FAIL ]
Store 2 Sample Count: ___
Store 2 Has Store 1 Data: [ YES / NO ] (should be NO)

Store 1 Status: [ PASS / FAIL ]
Store 1 Sample Count: ___
Store 1 Has Store 2 Data: [ YES / NO ] (should be NO)

Notes:
```

---

### Test 2.3: Brand Voice Profile - Data Isolation

**In Store 2 Browser Window:**

1. [ ] Navigate to Brand Voice Profile page
2. [ ] Should see bakerteststore's profile ONLY
3. [ ] Should NOT see bakerstore's profile

**In Store 1 Browser Window:**

1. [ ] Verify Store 1 still sees only their own profile
2. [ ] Verify no bakerteststore profile visible

**Expected Result:** ✅ Each store sees only their own brand voice profile

**Actual Result:**

```
Store 2 Status: [ PASS / FAIL ]
Store 2 Has Own Profile: [ YES / NO ]
Store 2 Has Store 1 Profile: [ YES / NO ] (should be NO)

Store 1 Status: [ PASS / FAIL ]
Store 1 Has Own Profile: [ YES / NO ]
Store 1 Has Store 2 Profile: [ YES / NO ] (should be NO)

Notes:
```

---

### Test 2.4: Generated Content - Data Isolation

**In Store 2 Browser Window:**

1. [ ] Navigate to Generated Content page
2. [ ] Should see bakerteststore's content ONLY
3. [ ] Should NOT see bakerstore's content

**In Store 1 Browser Window:**

1. [ ] Verify Store 1 still sees only their own content
2. [ ] Verify no bakerteststore content visible

**Expected Result:** ✅ Each store sees only their own generated content

**Actual Result:**

```
Store 2 Status: [ PASS / FAIL ]
Store 2 Content Count: ___
Store 2 Has Store 1 Content: [ YES / NO ] (should be NO)

Store 1 Status: [ PASS / FAIL ]
Store 1 Content Count: ___
Store 1 Has Store 2 Content: [ YES / NO ] (should be NO)

Notes:
```

---

## Test 3: CRUD Operations Respect RLS

### Test 3.1: Create Content Sample (Store 1)

**In Store 1 Browser Window:**

1. [ ] Navigate to Content Samples page
2. [ ] Create a new content sample
3. [ ] Fill in sample details:
   - Sample Type: Blog
   - Sample Text: "RLS Test - Store 1 Sample"
   - Word Count: 100
4. [ ] Save sample
5. [ ] Sample should appear in Store 1's list

**In Store 2 Browser Window:**

1. [ ] Refresh Content Samples page
2. [ ] New Store 1 sample should NOT appear in Store 2's list

**Expected Result:** ✅ New sample visible only to Store 1

**Actual Result:**

```
Store 1 Created Sample: [ SUCCESS / FAIL ]
Sample ID: _______________

Store 2 Can See New Sample: [ YES / NO ] (should be NO)

Status: [ PASS / FAIL ]
Notes:
```

---

### Test 3.2: Update Content Sample (Store 1)

**In Store 1 Browser Window:**

1. [ ] Select an existing sample
2. [ ] Update sample text to "RLS Test - Updated Sample"
3. [ ] Save changes
4. [ ] Changes should be visible in Store 1

**In Store 2 Browser Window:**

1. [ ] Verify Store 2 data unchanged
2. [ ] Store 2 should not see Store 1's updates

**Expected Result:** ✅ Updates visible only to Store 1

**Actual Result:**

```
Store 1 Update: [ SUCCESS / FAIL ]

Store 2 Affected: [ YES / NO ] (should be NO)

Status: [ PASS / FAIL ]
Notes:
```

---

### Test 3.3: Delete Content Sample (Store 1)

**In Store 1 Browser Window:**

1. [ ] Select a content sample to delete
2. [ ] Delete the sample
3. [ ] Sample should be removed from Store 1's list

**In Store 2 Browser Window:**

1. [ ] Verify Store 2 data unchanged
2. [ ] Store 2 samples should remain intact

**Expected Result:** ✅ Deletion affects only Store 1

**Actual Result:**

```
Store 1 Deletion: [ SUCCESS / FAIL ]

Store 2 Affected: [ YES / NO ] (should be NO)

Status: [ PASS / FAIL ]
Notes:
```

---

## Test 4: Direct Database Queries (Developer Tools)

### Test 4.1: Browser Console Query Attempt

**In Store 1 Browser Window:**

1. [ ] Open browser developer console (F12)
2. [ ] Try to query Store 2's data using Supabase client:

```javascript
// Attempt to access another store's data
const { data, error } = await supabase
  .from("content_samples")
  .select("*")
  .eq("store_id", "<STORE_2_USER_ID>");

console.log("Data:", data);
console.log("Error:", error);
```

**Expected Result:** ❌ Should return empty array or error (RLS blocks access)

**Actual Result:**

```
Data Returned: [ EMPTY / ERROR / DATA ]
If DATA: This is a SECURITY ISSUE!

Status: [ PASS / FAIL ]
Notes:
```

---

### Test 4.2: Attempt Cross-Store Update

**In Store 1 Browser Window:**

1. [ ] Open browser developer console
2. [ ] Try to update Store 2's data:

```javascript
// Attempt to update another store's data
const { data, error } = await supabase
  .from("content_samples")
  .update({ sample_text: "HACKED!" })
  .eq("store_id", "<STORE_2_USER_ID>");

console.log("Data:", data);
console.log("Error:", error);
```

**Expected Result:** ❌ Should fail with RLS policy violation

**Actual Result:**

```
Update Succeeded: [ YES / NO ] (should be NO)
Error Message: _______________

Status: [ PASS / FAIL ]
Notes:
```

---

## Test 5: Performance

### Test 5.1: Page Load Times

**Measure load times for both stores:**

**Store 1:**

- [ ] Dashboard load time: **\_** seconds
- [ ] Content Samples page: **\_** seconds
- [ ] Brand Voice page: **\_** seconds

**Store 2:**

- [ ] Dashboard load time: **\_** seconds
- [ ] Content Samples page: **\_** seconds
- [ ] Brand Voice page: **\_** seconds

**Expected Result:** ✅ All pages load in < 3 seconds

**Actual Result:**

```
Status: [ PASS / FAIL ]
Notes:
```

---

### Test 5.2: Large Dataset Performance

**If stores have >50 content samples:**

1. [ ] Navigate to Content Samples page
2. [ ] Measure time to load list
3. [ ] Verify pagination works correctly

**Expected Result:** ✅ List loads in < 2 seconds even with large datasets

**Actual Result:**

```
Store 1 Sample Count: ___
Load Time: ___ seconds

Store 2 Sample Count: ___
Load Time: ___ seconds

Status: [ PASS / FAIL ]
Notes:
```

---

## Test 6: Edge Cases

### Test 6.1: Logout and Login Different User

1. [ ] Logout from Store 1
2. [ ] Login as Store 2 user in same browser window
3. [ ] Verify data switches completely
4. [ ] Should see ONLY Store 2 data, no Store 1 data

**Expected Result:** ✅ Complete data switch on user change

**Actual Result:**

```
Status: [ PASS / FAIL ]
Any Store 1 Data Visible: [ YES / NO ] (should be NO)
Notes:
```

---

### Test 6.2: Session Timeout

1. [ ] Leave Store 1 browser window idle for 30+ minutes
2. [ ] Try to perform an action (create/update content)
3. [ ] Should prompt for re-authentication

**Expected Result:** ✅ Session expires and requires re-login

**Actual Result:**

```
Session Expired: [ YES / NO ]
Required Re-Auth: [ YES / NO ]

Status: [ PASS / FAIL ]
Notes:
```

---

## Test Summary

### Overall Results

**Total Tests Run**: **_ / 18
**Tests Passed**: _**
**Tests Failed**: **\_
**Pass Rate**: \_\_**%

### Critical Issues Found

```
Issue 1:
Severity: [ CRITICAL / HIGH / MEDIUM / LOW ]
Description:


Issue 2:
Severity: [ CRITICAL / HIGH / MEDIUM / LOW ]
Description:


```

### Non-Critical Issues Found

```
Issue 1:
Description:


Issue 2:
Description:


```

---

## Sign-Off

### RLS Security Assessment

- [ ] **APPROVED** - RLS is working correctly, ready for production
- [ ] **APPROVED WITH CONDITIONS** - Minor issues found, can deploy with noted caveats
- [ ] **NOT APPROVED** - Critical security issues found, must be fixed before production

**Tester Signature**: ******\_******
**Date**: ******\_******
**Time Spent Testing**: \_\_\_ minutes

### Next Steps

```
[ ] Address critical issues
[ ] Re-test failed scenarios
[ ] Update SECURITY_ACTION_PLAN.md
[ ] Deploy to production
```

---

## Helpful Debugging Commands

### Check Current User ID

```javascript
// In browser console
const {
  data: { user },
} = await supabase.auth.getUser();
console.log("Current User ID:", user.id);
```

### Check RLS Policies

```sql
-- In Supabase SQL Editor
SELECT tablename, policyname, cmd, roles::text[]
FROM pg_policies
WHERE tablename = 'content_samples'
ORDER BY policyname;
```

### Verify Data Ownership

```javascript
// In browser console
const { data, error } = await supabase
  .from("content_samples")
  .select("id, store_id, sample_text")
  .limit(5);

console.log("My samples:", data);
console.log("My user ID:", user.id);
// All store_id values should match user.id
```

---

**Last Updated**: October 24, 2025
**Version**: 1.0
