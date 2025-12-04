/**
 * List all tables in Supabase database
 */

import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL ||
  `postgresql://postgres.***REMOVED***:${process.env.SUPABASE_DB_PASSWORD}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`;

async function listTables() {
  const pool = new Pool({ connectionString });

  try {
    console.log('🔍 Listing all tables in Supabase database\n');

    const result = await pool.query(`
      SELECT table_name, table_schema
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    console.log(`Found ${result.rows.length} tables:\n`);
    result.rows.forEach((row, idx) => {
      console.log(`${(idx + 1).toString().padStart(2)}. ${row.table_name}`);
    });

  } catch (error: any) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

listTables();
