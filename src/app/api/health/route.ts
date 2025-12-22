import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * Health check endpoint for monitoring and deployment validation
 *
 * GET /api/health - Basic health check (fast, for load balancers)
 * GET /api/health?deep=true - Deep health check with service connectivity
 *
 * Returns 200 if healthy, 503 if any critical service is down
 */

interface ServiceHealth {
  status: "healthy" | "degraded" | "unhealthy";
  latency_ms?: number;
  error?: string;
}

interface HealthResponse {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  service: string;
  version: string;
  uptime_seconds?: number;
  checks?: {
    supabase: ServiceHealth;
    openai: ServiceHealth;
    environment: ServiceHealth;
  };
}

// Track server start time for uptime calculation
const serverStartTime = Date.now();

/**
 * Check Supabase connectivity
 */
async function checkSupabase(): Promise<ServiceHealth> {
  const start = Date.now();
  try {
    // Simple query to verify connection
    const { error } = await supabaseAdmin.from("shops").select("id").limit(1);

    if (error) {
      return {
        status: "unhealthy",
        latency_ms: Date.now() - start,
        error: error.message,
      };
    }

    return {
      status: "healthy",
      latency_ms: Date.now() - start,
    };
  } catch (err) {
    return {
      status: "unhealthy",
      latency_ms: Date.now() - start,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

/**
 * Check OpenAI API connectivity (lightweight models endpoint)
 */
async function checkOpenAI(): Promise<ServiceHealth> {
  const start = Date.now();
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return {
      status: "unhealthy",
      error: "OPENAI_API_KEY not configured",
    };
  }

  try {
    // Use models endpoint - lightweight, no tokens consumed
    const response = await fetch("https://api.openai.com/v1/models", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      signal: AbortSignal.timeout(5000), // 5s timeout
    });

    if (!response.ok) {
      return {
        status: "unhealthy",
        latency_ms: Date.now() - start,
        error: `API returned ${response.status}`,
      };
    }

    return {
      status: "healthy",
      latency_ms: Date.now() - start,
    };
  } catch (err) {
    return {
      status: "unhealthy",
      latency_ms: Date.now() - start,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

/**
 * Check critical environment variables
 */
function checkEnvironment(): ServiceHealth {
  const requiredVars = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_SERVICE_KEY",
    "OPENAI_API_KEY",
    "SHOPIFY_API_KEY",
    "NEXTAUTH_SECRET",
  ];

  // eslint-disable-next-line security/detect-object-injection
  const missing = requiredVars.filter((v) => !process.env[v]);

  if (missing.length > 0) {
    return {
      status: "unhealthy",
      error: `Missing: ${missing.join(", ")}`,
    };
  }

  return {
    status: "healthy",
  };
}

/**
 * Determine overall health status from individual checks
 */
function getOverallStatus(checks: {
  supabase: ServiceHealth;
  openai: ServiceHealth;
  environment: ServiceHealth;
}): "healthy" | "degraded" | "unhealthy" {
  // Environment must be healthy
  if (checks.environment.status === "unhealthy") {
    return "unhealthy";
  }

  // Supabase is critical - app can't function without it
  if (checks.supabase.status === "unhealthy") {
    return "unhealthy";
  }

  // OpenAI degraded = app can still function for non-AI features
  if (checks.openai.status === "unhealthy") {
    return "degraded";
  }

  return "healthy";
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const isDeepCheck = searchParams.get("deep") === "true";

  // Basic health check (fast, for load balancers)
  if (!isDeepCheck) {
    return NextResponse.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      service: "Thunder Text API",
      version: process.env.npm_package_version || "1.0.0",
    });
  }

  // Deep health check with service connectivity
  const [supabase, openai] = await Promise.all([
    checkSupabase(),
    checkOpenAI(),
  ]);

  const environment = checkEnvironment();

  const checks = { supabase, openai, environment };
  const overallStatus = getOverallStatus(checks);

  const response: HealthResponse = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    service: "Thunder Text API",
    version: process.env.npm_package_version || "1.0.0",
    uptime_seconds: Math.floor((Date.now() - serverStartTime) / 1000),
    checks,
  };

  // Return 503 if unhealthy (helps load balancers route traffic away)
  const httpStatus = overallStatus === "unhealthy" ? 503 : 200;

  return NextResponse.json(response, { status: httpStatus });
}
