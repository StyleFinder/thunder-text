import { Pool } from "pg";

// Direct PostgreSQL connection - bypasses Supabase PostgREST entirely
// Only use this when PostgREST has issues (like schema cache problems)
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("❌ CRITICAL: DATABASE_URL environment variable is not set!", {
    availableEnvVars: Object.keys(process.env).filter((key) =>
      key.includes("DATABASE"),
    ),
    nodeEnv: process.env.NODE_ENV,
  });
  throw new Error("DATABASE_URL is required for direct PostgreSQL connection");
}

// Log connection details IMMEDIATELY
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
console.log("Expected Project:", "***REMOVED*** (Thunder Text)");
console.log("=".repeat(80));

if (projectId !== "***REMOVED***") {
  console.error("❌ WRONG DATABASE! Connected to:", projectId);
  console.error("   Expected: ***REMOVED*** (Thunder Text)");
  throw new Error(
    `DATABASE_URL points to wrong project: ${projectId}. Expected: ***REMOVED***`,
  );
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Test connection on startup
pool.query("SELECT current_database(), current_schema()").then((result) => {
  console.log("✅ Connection verified:", result.rows[0]);
});

export { pool };
