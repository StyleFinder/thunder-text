# Thunder Text - Manual Testing Guide

**Purpose**: Systematic manual testing on fresh Shopify development store
**Timeline**: 2-3 days
**Priority**: HIGH - Must complete before Shopify submission

---

## 🎯 Testing Objectives

1. Validate OAuth installation flow on fresh store
2. Verify core features work as expected
3. Test edge cases and error handling
4. Validate performance under real usage
5. Ensure browser/device compatibility
6. Document any bugs for immediate fixing

---

## 🛠️ Setup Requirements

### 1. Fresh Shopify Development Store

- [x] Create new development store in Shopify Partner Dashboard
- [ X] Choose a realistic store name (e.g., "Thunder Test Store")
- [X ] Add some sample products (10-15) with real images
- [ X] Include variety:
  - Products with multiple images
  - Products with no images
  - Products with long titles
  - Products with special characters
  - Products in different categories

### 2. Local Development Environment

```bash
cd /Users/bigdaddy/prod_desc/thunder-text
npm run dev
```

### 3. ngrok Tunnel (for OAuth testing)

```bash
ngrok http 3000
# Copy the https URL (e.g., https://abc123.ngrok-free.app)
```

### 4. Update Shopify App Configuration

- [ x] In Shopify Partner Dashboard, update app URLs:
  - App URL: `https://[your-ngrok-url].ngrok-free.app`
  - Redirect URLs: `https://[your-ngrok-url].ngrok-free.app/api/auth/callback`

---

## 📋 Test Cases

### Phase 1: OAuth & Installation (Critical)

#### Test 1.1: Fresh Installation

**Objective**: Verify app installs correctly on new store

**Steps**:

1. Open Shopify Partner Dashboard
2. Go to your app → Test on development store
3. Select your fresh test store
4. Click "Install app"
5. Review permission scopes (should request: read_products, write_products)
6. Click "Install"

**Expected Results**:

- ✅ Redirect to OAuth consent screen
- ✅ Scopes clearly listed and accurate
- ✅ Successful redirect to app after approval
- ✅ App home page loads correctly
- ✅ Shop record created in Supabase `shops` table
- ✅ No errors in browser console

**Actual Results**:

- [ X] Pass / [ ] Fail
- Notes: **\*\*\*\***\*\*\*\***\*\*\*\***\_\_\_**\*\*\*\***\*\*\*\***\*\*\*\***

---

#### Test 1.2: Token Refresh

**Objective**: Verify app handles token expiration gracefully

**Steps**:

1. After installation, wait 1 hour (or manually expire token in database)
2. Navigate to different pages in the app
3. Try to generate product descriptions

**Expected Results**:

- ✅ App automatically refreshes token
- ✅ No errors shown to user
- ✅ Operations continue normally

**Actual Results**:

- [ X] Pass / [ ] Fail
- Notes: **\*\*\*\***\*\*\*\***\*\*\*\***\_\_\_**\*\*\*\***\*\*\*\***\*\*\*\***

---

#### Test 1.3: Reinstallation

**Objective**: Verify app can be uninstalled and reinstalled

**Steps**:

1. In Shopify admin, go to Settings → Apps and sales channels
2. Find Thunder Text → Delete
3. Confirm deletion
4. Wait 1 minute
5. Reinstall app from Partner Dashboard

**Expected Results**:

- ✅ Uninstallation completes without errors
- ✅ Shop data deleted from Supabase (verify in database)
- ✅ GDPR webhook triggered (check server logs)
- ✅ Reinstallation works as fresh install
- ✅ No orphaned data in database

**Actual Results**:

- [ X] Pass / [ ] Fail
- Notes: **\*\*\*\***\*\*\*\***\*\*\*\***\_\_\_**\*\*\*\***\*\*\*\***\*\*\*\***

---

### Phase 2: Core Features (High Priority)

#### Test 2.1: Single Product Generation

**Objective**: Generate description for one product

**Steps**:

1. Go to Products page in Thunder Text
2. Select a product with clear, high-quality images
3. Click "Generate Description"
4. Wait for AI generation (should be <30 seconds)

**Expected Results**:

- ✅ Product images load correctly
- ✅ Generation progress indicator shown
- ✅ Description generated within 30 seconds
- ✅ Description is relevant to product images
- ✅ Description saved to Shopify product
- ✅ Success notification shown
- ✅ Generated content saved in Supabase

**Actual Results**:

- [ X] Pass / [ ] Fail
- Generation time: **\_\_\_** seconds
- Quality rating (1-5): **\_**
- Notes: **\*\*\*\***\*\*\*\***\*\*\*\***\_\_\_**\*\*\*\***\*\*\*\***\*\*\*\***

---

#### Test 2.2: Bulk Product Processing

**Objective**: Generate descriptions for multiple products at once

**Steps**:

1. Go to Products page
2. Select 5 products using checkboxes
3. Click "Bulk Generate"
4. Monitor progress

**Expected Results**:

- ✅ Progress bar shows completion percentage
- ✅ Each product processes sequentially
- ✅ Success/failure status for each product
- ✅ Total time reasonable (< 5 minutes for 5 products)
- ✅ All successful generations saved to Shopify
- ✅ Can cancel mid-process
- ✅ Error handling for any failures

**Actual Results**:

- [ ] Pass / [ ] Fail
- Total time: **\_\_\_** minutes
- Success rate: \_\_\_ / 5
- Notes: **\*\*\*\***\*\*\*\***\*\*\*\***\_\_\_**\*\*\*\***\*\*\*\***\*\*\*\***

---

#### Test 2.3: Brand Voice Configuration

**Objective**: Set brand voice and verify it affects generations

**Steps**:

1. Go to Settings page
2. Configure brand voice:
   - Brand name: "Eco Friendly Co"
   - Tone: "Friendly, sustainable, informative"
   - Key values: "Sustainability, quality, affordability"
3. Save settings
4. Generate description for a product
5. Review generated content

**Expected Results**:

- ✅ Settings save successfully
- ✅ Brand voice persists in Supabase
- ✅ Generated description reflects brand voice
- ✅ Brand name mentioned appropriately
- ✅ Tone matches specified style

**Actual Results**:

- [ ] Pass / [ ] Fail
- Brand voice applied: [ ] Yes / [ ] No
- Notes: **\*\*\*\***\*\*\*\***\*\*\*\***\_\_\_**\*\*\*\***\*\*\*\***\*\*\*\***

---

#### Test 2.4: Product Filtering & Sorting

**Objective**: Verify product list filters work correctly

**Steps**:

1. Go to Products page
2. Test each filter:
   - Recently Created (default)
   - Recently Updated
   - A-Z
   - Z-A
3. Verify sorting order for each

**Expected Results**:

- ✅ Recently Created shows newest first
- ✅ Recently Updated shows latest updates first
- ✅ A-Z sorts alphabetically ascending
- ✅ Z-A sorts alphabetically descending
- ✅ Filter selection persists on refresh
- ✅ Product count accurate

**Actual Results**:

- [ ] Pass / [ ] Fail
- Issues with any filter: **\*\*\*\***\*\*\*\***\*\*\*\***\_\_\_**\*\*\*\***\*\*\*\***\*\*\*\***

---

#### Test 2.5: Content Center

**Objective**: Upload and manage custom content samples

**Steps**:

1. Go to Content Center
2. Upload a custom content sample:
   - Title: "Summer Collection Launch"
   - Content: [Write sample content]
   - Word count: 500+ words
3. Save sample
4. Try to use it in generation

**Expected Results**:

- ✅ Upload form works correctly
- ✅ Validation enforces 500+ words
- ✅ Sample saves to Supabase
- ✅ Sample appears in content list
- ✅ Can edit sample
- ✅ Can delete sample
- ✅ Sample isolated to shop (RLS)

**Actual Results**:

- [ ] Pass / [ ] Fail
- Notes: **\*\*\*\***\*\*\*\***\*\*\*\***\_\_\_**\*\*\*\***\*\*\*\***\*\*\*\***

---

### Phase 3: Edge Cases & Error Handling (High Priority)

#### Test 3.1: Product Without Images

**Objective**: Verify graceful handling of products without images

**Steps**:

1. Create a product with no images in Shopify
2. Try to generate description for it

**Expected Results**:

- ✅ Clear error message shown
- ✅ User informed images are required
- ✅ No server errors
- ✅ App remains functional

**Actual Results**:

- [ ] Pass / [ ] Fail
- Error message: **\*\*\*\***\*\*\*\***\*\*\*\***\_\_\_**\*\*\*\***\*\*\*\***\*\*\*\***

---

#### Test 3.2: Very Long Product Title

**Objective**: Handle products with titles >255 characters

**Steps**:

1. Create product with title containing 300+ characters
2. Try to generate description

**Expected Results**:

- ✅ Title truncated or handled gracefully
- ✅ No database errors
- ✅ Generation completes successfully
- ✅ UI displays title correctly

**Actual Results**:

- [ ] Pass / [ ] Fail
- Notes: **\*\*\*\***\*\*\*\***\*\*\*\***\_\_\_**\*\*\*\***\*\*\*\***\*\*\*\***

---

#### Test 3.3: Special Characters in Product Data

**Objective**: Handle unicode, emojis, and special characters

**Steps**:

1. Create product with title: "Awesome Product 🔥 - 100% Cotton™"
2. Add description with unicode: "Café • Naïve • 中文"
3. Generate new description

**Expected Results**:

- ✅ Special characters display correctly
- ✅ No encoding errors
- ✅ Generation handles unicode properly
- ✅ Saved description maintains encoding

**Actual Results**:

- [ ] Pass / [ ] Fail
- Notes: **\*\*\*\***\*\*\*\***\*\*\*\***\_\_\_**\*\*\*\***\*\*\*\***\*\*\*\***

---

#### Test 3.4: Network Failure During Generation

**Objective**: Verify error handling when AI API fails

**Steps**:

1. Start product generation
2. Immediately disconnect internet OR kill OpenAI API request
3. Observe error handling

**Expected Results**:

- ✅ Clear error message shown
- ✅ User can retry
- ✅ No data corruption
- ✅ App remains responsive

**Actual Results**:

- [ ] Pass / [ ] Fail
- Notes: **\*\*\*\***\*\*\*\***\*\*\*\***\_\_\_**\*\*\*\***\*\*\*\***\*\*\*\***

---

#### Test 3.5: Session Token Expiration

**Objective**: Handle expired Shopify session gracefully

**Steps**:

1. Install app and use normally
2. Wait several hours (or manually expire session)
3. Try to use app features

**Expected Results**:

- ✅ Automatic session refresh attempt
- ✅ If refresh fails, redirect to reauth
- ✅ No data loss
- ✅ Clear messaging to user

**Actual Results**:

- [ ] Pass / [ ] Fail
- Notes: **\*\*\*\***\*\*\*\***\*\*\*\***\_\_\_**\*\*\*\***\*\*\*\***\*\*\*\***

---

#### Test 3.6: Concurrent Operations

**Objective**: Handle multiple users/operations simultaneously

**Steps**:

1. Open app in 2 different browser tabs
2. Start bulk generation in Tab 1
3. Immediately start another operation in Tab 2
4. Monitor both

**Expected Results**:

- ✅ Both operations complete successfully
- ✅ No race conditions
- ✅ Data consistency maintained
- ✅ No duplicate generations

**Actual Results**:

- [ ] Pass / [ ] Fail
- Notes: **\*\*\*\***\*\*\*\***\*\*\*\***\_\_\_**\*\*\*\***\*\*\*\***\*\*\*\***

---

### Phase 4: Performance Testing (Medium Priority)

#### Test 4.1: Page Load Times

**Objective**: Verify pages load within 3 seconds

**Steps**:

1. Clear browser cache
2. Navigate to each major page
3. Measure load time (use browser DevTools)

**Pages to Test**:

- [ ] Home page: **\_** seconds
- [ ] Products page: **\_** seconds
- [ ] Content Center: **\_** seconds
- [ ] Settings: **\_** seconds

**Expected Results**:

- ✅ All pages load in <3 seconds
- ✅ Images load progressively
- ✅ No blocking resources

**Actual Results**:

- [ ] Pass / [ ] Fail
- Slowest page: **\*\*\*\***\*\*\*\***\*\*\*\***\_\_\_**\*\*\*\***\*\*\*\***\*\*\*\***

---

#### Test 4.2: Large Product Catalog

**Objective**: Handle stores with 100+ products

**Steps**:

1. Use Shopify's sample data generator to add 100+ products
2. Navigate to Products page
3. Test filtering, sorting, pagination

**Expected Results**:

- ✅ Products page loads within 5 seconds
- ✅ Pagination works correctly
- ✅ Filters remain responsive
- ✅ No timeouts or crashes

**Actual Results**:

- [ ] Pass / [ ] Fail
- Products tested with: **\_** products
- Notes: **\*\*\*\***\*\*\*\***\*\*\*\***\_\_\_**\*\*\*\***\*\*\*\***\*\*\*\***

---

#### Test 4.3: Image Processing Speed

**Objective**: Verify efficient image handling

**Steps**:

1. Select product with 10+ high-resolution images
2. Generate description
3. Monitor processing time

**Expected Results**:

- ✅ Images load within 5 seconds
- ✅ No excessive bandwidth usage
- ✅ Images optimized/compressed
- ✅ Generation time <30 seconds

**Actual Results**:

- [ ] Pass / [ ] Fail
- Processing time: **\_** seconds
- Notes: **\*\*\*\***\*\*\*\***\*\*\*\***\_\_\_**\*\*\*\***\*\*\*\***\*\*\*\***

---

### Phase 5: Browser & Device Testing (Medium Priority)

#### Test 5.1: Browser Compatibility

**Browsers to Test**:

- [ ] Chrome (latest) - Pass/Fail: **\_**
- [ ] Safari (latest) - Pass/Fail: **\_**
- [ ] Firefox (latest) - Pass/Fail: **\_**
- [ ] Edge (latest) - Pass/Fail: **\_**

**Test Cases** (for each browser):

1. Install app
2. Generate single product description
3. Test bulk generation
4. Configure settings
5. Upload content sample

**Expected Results**:

- ✅ Consistent behavior across browsers
- ✅ No layout issues
- ✅ All features functional

**Issues Found**:

---

---

#### Test 5.2: Mobile Compatibility

**Devices to Test**:

- [ ] Mobile Safari (iOS) - Pass/Fail: **\_**
- [ ] Mobile Chrome (Android) - Pass/Fail: **\_**

**Test Cases**:

1. Navigate through app on mobile
2. Try to generate descriptions
3. Test responsive layout
4. Verify touch interactions

**Expected Results**:

- ✅ Responsive layout adapts correctly
- ✅ Touch targets appropriately sized
- ✅ No horizontal scrolling
- ✅ Features work on mobile

**Issues Found**:

---

---

### Phase 6: Embedded App Testing (High Priority)

#### Test 6.1: Shopify Admin Embedding

**Objective**: Verify app works correctly embedded in Shopify admin

**Steps**:

1. Install app on test store
2. Open app from Shopify admin (should be in sidebar)
3. Navigate through all pages
4. Test all features while embedded

**Expected Results**:

- ✅ App loads correctly in iframe
- ✅ Navigation works within admin
- ✅ Polaris styling consistent
- ✅ No iframe security errors
- ✅ App Bridge communication working
- ✅ Session cookies work in embedded context

**Actual Results**:

- [ ] Pass / [ ] Fail
- Notes: **\*\*\*\***\*\*\*\***\*\*\*\***\_\_\_**\*\*\*\***\*\*\*\***\*\*\*\***

---

## 🐛 Bug Tracking Template

For any bugs found, use this format:

```markdown
### Bug #[Number]: [Short Description]

**Severity**: Critical / High / Medium / Low
**Priority**: High / Medium / Low

**Steps to Reproduce**:

1.
2.
3.

**Expected Behavior**:

**Actual Behavior**:

**Screenshots/Logs**:

**Environment**:

- Browser:
- OS:
- App Version:

**Fix Required**:

- [ ] Code change needed
- [ ] Configuration change
- [ ] Documentation update
```

---

## ✅ Sign-Off Checklist

Before proceeding to Shopify submission, confirm:

### Critical (Must Pass)

- [ ] OAuth installation works on fresh store
- [ ] Product description generation works correctly
- [ ] Bulk generation completes successfully
- [ ] Brand voice applies to generations
- [ ] No critical errors in any browser
- [ ] GDPR webhooks trigger on uninstall
- [ ] No security vulnerabilities identified
- [ ] Performance acceptable (<3s page loads, <30s generation)

### High Priority (Should Pass)

- [ ] Edge cases handled gracefully
- [ ] Error messages clear and helpful
- [ ] Mobile experience acceptable
- [ ] Content Center works correctly
- [ ] Settings persist correctly
- [ ] Multi-shop compatible

### Medium Priority (Nice to Have)

- [ ] All browsers tested
- [ ] Large catalogs (100+ products) tested
- [ ] Concurrent operations tested
- [ ] Video tutorial recorded

---

## 📊 Testing Summary Template

After completing all tests, fill out this summary:

```
## Thunder Text Manual Testing Summary

**Test Date**: [Date]
**Tester**: [Name]
**Environment**: [Shopify Dev Store URL]

### Results Overview
- Total Test Cases: ____ / ____
- Pass Rate: _____%
- Critical Bugs Found: ____
- High Priority Bugs: ____
- Medium/Low Bugs: ____

### Critical Issues (Must Fix)
1.
2.

### High Priority Issues (Should Fix)
1.
2.

### Medium/Low Issues (Can Defer)
1.
2.

### Recommendations
- Ready for submission: [ ] Yes / [ ] No
- Estimated fix time: ____ days
- Follow-up testing needed: [ ] Yes / [ ] No

### Sign-Off
- [ ] All critical tests passed
- [ ] No blocking issues identified
- [ ] Performance acceptable
- [ ] Ready for Shopify submission
```

---

## 🎯 Next Steps After Testing

1. **Fix Critical Bugs** - Address any critical issues immediately
2. **Retest** - Verify bug fixes don't introduce new issues
3. **Document Findings** - Update documentation with any changes
4. **Prepare Assets** - Create screenshots during testing
5. **Submit to Shopify** - Once all tests pass

---

**Good luck with testing! 🚀**
