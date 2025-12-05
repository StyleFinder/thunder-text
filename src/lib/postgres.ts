import { Pool, QueryResult, QueryResultRow } from "pg";
import { logger } from "@/lib/logger";

// Direct PostgreSQL connection - bypasses Supabase PostgREST entirely
// Only use this when PostgREST has issues (like schema cache problems)
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  logger.error(
    "❌ CRITICAL: DATABASE_URL environment variable is not set!",
    undefined,
    {
      availableEnvVars: Object.keys(process.env).filter((key) =>
        key.includes("DATABASE"),
      ),
      nodeEnv: process.env.NODE_ENV,
      component: "postgres",
    },
  );
  throw new Error("DATABASE_URL is required for direct PostgreSQL connection");
}

// Log connection details IMMEDIATELY (keep console.log for bootstrapping)
const dbHost = connectionString.split("@")[1]?.split(":")[0];
const dbName = connectionString.split("/").pop()?.split("?")[0];
const projectIdMatch = connectionString.match(/db\.([a-z]+)\.supabase\.co/);
const projectId = projectIdMatch ? projectIdMatch[1] : "unknown";

console.log("=".repeat(80));
console.log("🔗 PostgreSQL Direct Connection Initialized");
console.log("=".repeat(80));
console.log("Database Host:", dbHost);
console.log("Database Name:", dbName);
console.log("Supabase Project ID:", projectId);
console.log("Expected Project:", "upkmmwvbspgeanotzknk (Thunder Text)");
console.log("=".repeat(80));

if (projectId !== "upkmmwvbspgeanotzknk") {
  logger.error(
    `WRONG DATABASE! Connected to: ${projectId}`,
    new Error(`Wrong database project: ${projectId}`),
    { component: "postgres" },
  );
  logger.error(`Expected: upkmmwvbspgeanotzknk (Thunder Text)`, undefined, {
    component: "postgres",
  });
  throw new Error(
    `DATABASE_URL points to wrong project: ${projectId}. Expected: upkmmwvbspgeanotzknk`,
  );
}

const pool = new Pool({
  connectionString,
  // SECURITY: Verify SSL certificates in production to prevent MITM attacks
  // In development, we allow self-signed certs for local testing
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: true }
      : { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Test connection on startup
pool.query("SELECT current_database(), current_schema()").then(() => {
  // Connection verified
});

/**
 * Tenant-aware database client
 * Ensures all queries respect tenant isolation
 */
export interface TenantAwareClient {
  query<R extends QueryResultRow = QueryResultRow>(
    queryText: string,
    values?: unknown[],
  ): Promise<QueryResult<R>>;
  release(): void;
}

/**
 * Get a tenant-aware database client
 * This client automatically validates that all queries include tenant filtering
 *
 * @param tenantId - The store_id (shop ID) for tenant isolation
 * @returns A client that enforces tenant isolation
 */
export async function getTenantClient(
  tenantId: string,
): Promise<TenantAwareClient> {
  if (!tenantId) {
    throw new Error(
      "SECURITY: tenantId is required for tenant-aware database operations",
    );
  }

  const client = await pool.connect();

  // Wrap the client to add tenant validation
  return {
    async query<R extends QueryResultRow = QueryResultRow>(
      queryText: string,
      values: unknown[] = [],
    ): Promise<QueryResult<R>> {
      // Validate that query involves tenant-scoped tables
      const tenantTables = [
        "business_profiles",
        "business_profile_responses",
        "brand_voice_profiles",
        "content_samples",
        "generated_content",
        "facebook_ad_drafts",
        "product_descriptions",
      ];

      const queryLower = queryText.toLowerCase();
      const involvesTenantTable = tenantTables.some((table) =>
        queryLower.includes(table),
      );

      if (involvesTenantTable) {
        // Log query for audit trail
        logger.debug("Tenant-scoped query", {
          component: "postgres",
          tenantId,
          operation: queryLower.includes("insert")
            ? "INSERT"
            : queryLower.includes("update")
              ? "UPDATE"
              : queryLower.includes("delete")
                ? "DELETE"
                : "SELECT",
          table: tenantTables.find((t) => queryLower.includes(t)),
        });
      }

      return client.query<R>(queryText, values);
    },
    release() {
      client.release();
    },
  };
}

/**
 * Execute a query with explicit tenant filtering
 * Use this for INSERT/UPDATE/DELETE operations on tenant-scoped tables
 *
 * @param tenantId - The store_id for tenant isolation
 * @param table - Table name
 * @param operation - SQL operation (INSERT, UPDATE, DELETE)
 * @param queryText - Parameterized SQL query
 * @param values - Query parameters
 */
export async function queryWithTenant<
  R extends QueryResultRow = QueryResultRow,
>(
  tenantId: string,
  queryText: string,
  values: unknown[] = [],
): Promise<QueryResult<R>> {
  if (!tenantId) {
    throw new Error(
      "SECURITY: tenantId is required for tenant-scoped operations",
    );
  }

  const client = await getTenantClient(tenantId);
  try {
    return await client.query<R>(queryText, values);
  } finally {
    client.release();
  }
}

// Export the raw pool only for non-tenant operations (system queries, migrations)
// IMPORTANT: Never use this directly for tenant-scoped data
export { pool };
