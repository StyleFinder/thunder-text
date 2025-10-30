import { Pool } from "pg";

// Direct PostgreSQL connection - bypasses Supabase PostgREST entirely
// Only use this when PostgREST has issues (like schema cache problems)
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn(
    "⚠️  DATABASE_URL not set - direct PostgreSQL queries will fail",
  );
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

export { pool };
