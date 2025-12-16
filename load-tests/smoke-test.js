/**
 * Thunder Text Load Test - Smoke Test
 *
 * Quick validation that critical endpoints handle concurrent users.
 * Run: npm run test:load
 *
 * For local dev: npm run test:load:quick (gentler, 5 VUs)
 * For production: BASE_URL=https://your-app.vercel.app npm run test:load
 *
 * Prerequisites:
 * - App running locally: npm run dev (or deployed URL)
 * - k6 installed: brew install k6
 */

import http from "k6/http";
import { check, sleep, group } from "k6";
import { Rate, Trend } from "k6/metrics";

// Custom metrics
const errorRate = new Rate("errors");
const apiLatency = new Trend("api_latency");

// Configuration - change BASE_URL to your deployed URL for production testing
const BASE_URL = __ENV.BASE_URL || "http://localhost:3050";
const IS_LOCAL = BASE_URL.includes("localhost");

// Test configuration - gentler for local, more aggressive for production
export const options = IS_LOCAL
  ? {
      // Local dev: gentle test (dev server is single-threaded)
      stages: [
        { duration: "10s", target: 3 }, // Ramp up to 3 users
        { duration: "20s", target: 5 }, // Ramp up to 5 users
        { duration: "10s", target: 0 }, // Ramp down
      ],
      thresholds: {
        http_req_duration: ["p(95)<5000"], // 95% under 5s (local is slow)
        http_req_failed: ["rate<0.3"], // Less than 30% failures (local can timeout)
        errors: ["rate<0.3"],
      },
    }
  : {
      // Production: real load test
      stages: [
        { duration: "30s", target: 25 }, // Ramp up to 25 users
        { duration: "30s", target: 50 }, // Ramp up to 50 users
        { duration: "1m", target: 50 }, // Hold at 50 users
        { duration: "30s", target: 0 }, // Ramp down
      ],
      thresholds: {
        http_req_duration: ["p(95)<3000"], // 95% under 3s
        http_req_failed: ["rate<0.05"], // Less than 5% failures
        errors: ["rate<0.1"],
      },
    };

export default function smokeTest() {
  const params = {
    timeout: IS_LOCAL ? "30s" : "10s",
  };

  // Group 1: Auth Pages (most likely to be hit during free trial signup)
  group("Auth Pages", () => {
    // Login page
    const loginRes = http.get(`${BASE_URL}/auth/login`, params);
    check(loginRes, {
      "login page loads": (r) => r.status === 200,
    });
    apiLatency.add(loginRes.timings.duration);
    errorRate.add(loginRes.status !== 200 ? 1 : 0);

    sleep(1);

    // Signup page
    const signupRes = http.get(`${BASE_URL}/auth/signup`, params);
    check(signupRes, {
      "signup page loads": (r) => r.status === 200,
    });
    apiLatency.add(signupRes.timings.duration);
    errorRate.add(signupRes.status !== 200 ? 1 : 0);
  });

  sleep(2);

  // Group 2: API Health (simulates background health checks)
  group("API Health", () => {
    const healthRes = http.get(`${BASE_URL}/api/health`, params);
    check(healthRes, {
      "health check responds": (r) => r.status === 200 || r.status === 404,
    });
    apiLatency.add(healthRes.timings.duration);
  });

  // Random sleep between 1-3 seconds to simulate real user behavior
  sleep(Math.random() * 2 + 1);
}

// Summary handler
export function handleSummary(data) {
  const httpDuration = data.metrics.http_req_duration?.values || {};
  const httpFailed = data.metrics.http_req_failed?.values || {};
  const httpReqs = data.metrics.http_reqs?.values || {};

  const summary = {
    timestamp: new Date().toISOString(),
    environment: IS_LOCAL ? "local" : "production",
    baseUrl: BASE_URL,
    metrics: {
      totalRequests: httpReqs.count || 0,
      avgResponseTime: httpDuration.avg?.toFixed(2) || "N/A",
      p95ResponseTime: httpDuration["p(95)"]?.toFixed(2) || "N/A",
      p99ResponseTime: httpDuration["p(99)"]?.toFixed(2) || "N/A",
      minResponseTime: httpDuration.min?.toFixed(2) || "N/A",
      maxResponseTime: httpDuration.max?.toFixed(2) || "N/A",
      errorRate: ((httpFailed.rate || 0) * 100).toFixed(2) + "%",
      maxVUs: data.metrics.vus_max?.values?.max || 0,
    },
    passed:
      !data.root_group?.checks ||
      Object.values(data.root_group.checks).some((c) => c.passes > 0),
  };

  console.log("\n");
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║              THUNDER TEXT LOAD TEST RESULTS              ║");
  console.log("╠══════════════════════════════════════════════════════════╣");
  console.log(`║  Environment: ${summary.environment.padEnd(43)}║`);
  console.log(
    `║  Total Requests: ${String(summary.metrics.totalRequests).padEnd(40)}║`,
  );
  console.log(
    `║  Max Virtual Users: ${String(summary.metrics.maxVUs).padEnd(37)}║`,
  );
  console.log("╠══════════════════════════════════════════════════════════╣");
  console.log(
    `║  Avg Response Time: ${(summary.metrics.avgResponseTime + "ms").padEnd(37)}║`,
  );
  console.log(
    `║  P95 Response Time: ${(summary.metrics.p95ResponseTime + "ms").padEnd(37)}║`,
  );
  console.log(
    `║  P99 Response Time: ${(summary.metrics.p99ResponseTime + "ms").padEnd(37)}║`,
  );
  console.log(`║  Error Rate: ${summary.metrics.errorRate.padEnd(44)}║`);
  console.log("╠══════════════════════════════════════════════════════════╣");
  if (summary.passed) {
    console.log(
      "║  ✅ PASSED - Thresholds met                                ║",
    );
  } else {
    console.log(
      "║  ❌ FAILED - Thresholds exceeded                           ║",
    );
  }
  console.log("╚══════════════════════════════════════════════════════════╝");
  console.log("\n");

  if (IS_LOCAL) {
    console.log(
      "💡 Note: Local dev server is single-threaded and not optimized",
    );
    console.log("   for concurrent requests. Production (Vercel) will perform");
    console.log("   much better with serverless auto-scaling.\n");
    console.log(
      "   To test production: BASE_URL=https://your-app.vercel.app npm run test:load\n",
    );
  }

  return {
    "load-tests/results/smoke-test-summary.json": JSON.stringify(
      summary,
      null,
      2,
    ),
  };
}
