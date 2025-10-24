/**
 * Automated RLS Testing with Puppeteer
 *
 * This script tests Row Level Security by logging in as two different users
 * and verifying they can only access their own data.
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const puppeteer = require("puppeteer");

// Test configuration
const BASE_URL = "http://localhost:3050";
const TEST_USERS = {
  store1: {
    email: "baker2122@gmail.com",
    password: "your-password", // Update this
    domain: "bakerstore.localhost:3050",
  },
  store2: {
    email: "baker2122+test2@gmail.com",
    password: "your-password", // Update this
    domain: "bakerteststore.localhost:3050",
  },
};

// Test results
const results = {
  total: 0,
  passed: 0,
  failed: 0,
  tests: [],
};

function logTest(name, passed, details = "") {
  results.total++;
  if (passed) {
    results.passed++;
    console.log(`✅ PASS: ${name}`);
  } else {
    results.failed++;
    console.log(`❌ FAIL: ${name}`);
  }
  if (details) {
    console.log(`   ${details}`);
  }
  results.tests.push({ name, passed, details });
}

async function loginUser(page, email, password) {
  console.log(`\n🔐 Logging in as ${email}...`);

  await page.goto(`${BASE_URL}/auth/login`, { waitUntil: "networkidle0" });

  // Wait for login form
  await page.waitForSelector('input[type="email"]', { timeout: 5000 });

  // Fill in credentials
  await page.type('input[type="email"]', email);
  await page.type('input[type="password"]', password);

  // Submit form
  await page.click('button[type="submit"]');

  // Wait for redirect
  await page.waitForNavigation({ waitUntil: "networkidle0", timeout: 10000 });

  console.log(`✓ Logged in successfully`);
  console.log(`  Current URL: ${page.url()}`);
}

async function getUserIdFromConsole(page) {
  const userId = await page.evaluate(async () => {
    try {
      const {
        data: { user },
      } = await window.supabase.auth.getUser();
      return user.id;
    } catch {
      return null;
    }
  });

  console.log(`  User ID: ${userId}`);
  return userId;
}

async function getContentSamples(page) {
  const samples = await page.evaluate(async () => {
    try {
      const { data, error, count } = await window.supabase
        .from("content_samples")
        .select("*", { count: "exact" });

      if (error) throw error;
      return { samples: data || [], count: count || 0 };
    } catch (err) {
      return { samples: [], count: 0, error: err.message };
    }
  });

  return samples;
}

async function attemptCrossStoreQuery(page, targetUserId) {
  console.log(`  🔍 Attempting to query data for user ${targetUserId}...`);

  const result = await page.evaluate(async (userId) => {
    try {
      const { data, error } = await window.supabase
        .from("content_samples")
        .select("*")
        .eq("user_id", userId);

      return {
        success: !error,
        dataCount: data ? data.length : 0,
        error: error ? error.message : null,
      };
    } catch (err) {
      return {
        success: false,
        dataCount: 0,
        error: err.message,
      };
    }
  }, targetUserId);

  return result;
}

async function createContentSample(page, sampleText) {
  console.log(`  📝 Creating content sample: "${sampleText}"...`);

  const result = await page.evaluate(async (text) => {
    try {
      const {
        data: { user },
      } = await window.supabase.auth.getUser();

      const { data, error } = await window.supabase
        .from("content_samples")
        .insert({
          user_id: user.id,
          sample_text: text,
          sample_type: "blog",
          word_count: text.split(" ").length,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return { success: true, id: data.id };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }, sampleText);

  return result;
}

async function runTests() {
  console.log("🧪 Starting RLS Automated Tests with Puppeteer\n");
  console.log("=".repeat(60));

  const browser = await puppeteer.launch({
    headless: false, // Show browser for debugging
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    // Create two contexts (like two separate browser windows)
    const context1 = await browser.createBrowserContext();
    const context2 = await browser.createBrowserContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    // Set viewport
    await page1.setViewport({ width: 1280, height: 800 });
    await page2.setViewport({ width: 1280, height: 800 });

    // ========================================
    // TEST 1: Login both users
    // ========================================
    console.log("\n📋 TEST 1: User Authentication");
    console.log("-".repeat(60));

    try {
      await loginUser(
        page1,
        TEST_USERS.store1.email,
        TEST_USERS.store1.password,
      );
      logTest("Store 1 login", true, `Logged in as ${TEST_USERS.store1.email}`);
    } catch (err) {
      logTest("Store 1 login", false, `Error: ${err.message}`);
      throw new Error("Store 1 login failed - cannot continue tests");
    }

    try {
      await loginUser(
        page2,
        TEST_USERS.store2.email,
        TEST_USERS.store2.password,
      );
      logTest("Store 2 login", true, `Logged in as ${TEST_USERS.store2.email}`);
    } catch (err) {
      logTest("Store 2 login", false, `Error: ${err.message}`);
      throw new Error("Store 2 login failed - cannot continue tests");
    }

    // Get user IDs
    const user1Id = await getUserIdFromConsole(page1);
    const user2Id = await getUserIdFromConsole(page2);

    logTest(
      "User IDs retrieved",
      user1Id && user2Id,
      `User1: ${user1Id}, User2: ${user2Id}`,
    );

    // ========================================
    // TEST 2: View own data
    // ========================================
    console.log("\n📋 TEST 2: Users Can View Own Data");
    console.log("-".repeat(60));

    console.log("\n👤 Store 1:");
    const store1Samples = await getContentSamples(page1);
    console.log(`  Content samples: ${store1Samples.count}`);
    logTest(
      "Store 1 can view own data",
      !store1Samples.error,
      `Found ${store1Samples.count} samples`,
    );

    console.log("\n👤 Store 2:");
    const store2Samples = await getContentSamples(page2);
    console.log(`  Content samples: ${store2Samples.count}`);
    logTest(
      "Store 2 can view own data",
      !store2Samples.error,
      `Found ${store2Samples.count} samples`,
    );

    // ========================================
    // TEST 3: Data isolation
    // ========================================
    console.log("\n📋 TEST 3: Data Isolation (Cross-Store Query)");
    console.log("-".repeat(60));

    // Verify all Store 1 samples belong to User 1
    const store1AllMatch = store1Samples.samples.every(
      (s) => s.user_id === user1Id,
    );
    logTest(
      "Store 1 samples belong to User 1",
      store1AllMatch,
      store1AllMatch
        ? "All samples match user ID"
        : "SECURITY ISSUE: Found samples from other users!",
    );

    // Verify all Store 2 samples belong to User 2
    const store2AllMatch = store2Samples.samples.every(
      (s) => s.user_id === user2Id,
    );
    logTest(
      "Store 2 samples belong to User 2",
      store2AllMatch,
      store2AllMatch
        ? "All samples match user ID"
        : "SECURITY ISSUE: Found samples from other users!",
    );

    // ========================================
    // TEST 4: Cross-store access attempt
    // ========================================
    console.log("\n📋 TEST 4: Cross-Store Access Prevention");
    console.log("-".repeat(60));

    console.log("\n👤 Store 1 attempting to access Store 2 data:");
    const crossQuery1 = await attemptCrossStoreQuery(page1, user2Id);
    const blocked1 = crossQuery1.dataCount === 0;
    logTest(
      "Store 1 CANNOT access Store 2 data",
      blocked1,
      blocked1
        ? "Access blocked by RLS ✓"
        : `SECURITY ISSUE: Accessed ${crossQuery1.dataCount} samples!`,
    );

    console.log("\n👤 Store 2 attempting to access Store 1 data:");
    const crossQuery2 = await attemptCrossStoreQuery(page2, user1Id);
    const blocked2 = crossQuery2.dataCount === 0;
    logTest(
      "Store 2 CANNOT access Store 1 data",
      blocked2,
      blocked2
        ? "Access blocked by RLS ✓"
        : `SECURITY ISSUE: Accessed ${crossQuery2.dataCount} samples!`,
    );

    // ========================================
    // TEST 5: Create and verify isolation
    // ========================================
    console.log("\n📋 TEST 5: CRUD Operations Isolation");
    console.log("-".repeat(60));

    const testSampleText = `RLS TEST - Store 1 - ${Date.now()}`;
    console.log("\n👤 Store 1 creating new sample:");
    const createResult = await createContentSample(page1, testSampleText);
    logTest(
      "Store 1 can create content",
      createResult.success,
      createResult.success
        ? `Created sample ID: ${createResult.id}`
        : `Error: ${createResult.error}`,
    );

    if (createResult.success) {
      // Wait a moment for replication
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Check if Store 2 can see the new sample
      console.log("\n👤 Store 2 checking for Store 1's new sample:");
      const store2SamplesAfter = await getContentSamples(page2);
      const foundInStore2 = store2SamplesAfter.samples.some(
        (s) => s.id === createResult.id,
      );

      logTest(
        "Store 2 CANNOT see Store 1 new sample",
        !foundInStore2,
        foundInStore2
          ? "SECURITY ISSUE: New sample visible to other store!"
          : "Sample correctly isolated ✓",
      );
    }

    // ========================================
    // TEST 6: Performance
    // ========================================
    console.log("\n📋 TEST 6: Performance with RLS");
    console.log("-".repeat(60));

    const perfStart = Date.now();
    await getContentSamples(page1);
    const perfEnd = Date.now();
    const queryTime = perfEnd - perfStart;

    console.log(`  Query time: ${queryTime}ms`);
    logTest(
      "Query performance acceptable",
      queryTime < 1000,
      `Query completed in ${queryTime}ms (target: <1000ms)`,
    );
  } catch (error) {
    console.error("\n❌ Test suite error:", error.message);
    console.error(error.stack);
  } finally {
    await browser.close();
  }

  // ========================================
  // TEST SUMMARY
  // ========================================
  console.log("\n" + "=".repeat(60));
  console.log("📊 TEST SUMMARY");
  console.log("=".repeat(60));
  console.log(`Total Tests: ${results.total}`);
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(
    `Pass Rate: ${Math.round((results.passed / results.total) * 100)}%`,
  );

  if (results.failed === 0) {
    console.log("\n🎉 ALL TESTS PASSED! RLS is working correctly.");
  } else {
    console.log(
      "\n⚠️  SOME TESTS FAILED. Review the output above for details.",
    );
  }

  console.log("\n" + "=".repeat(60));

  // Exit with appropriate code
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
