import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST() {
  try {
    // First, check if table already exists
    const { data: existingCheck, error: checkError } = await supabaseAdmin
      .from('custom_sizing')
      .select('*')
      .limit(1)

    if (!checkError) {
      return NextResponse.json({
        success: true,
        message: 'Table already exists',
        row_count: existingCheck?.length || 0
      })
    }

    // If error is NOT "table doesn't exist", return the error
    if (checkError.code !== '42P01') {
      return NextResponse.json({
        success: false,
        error: 'Unexpected error checking table',
        details: checkError
      }, { status: 500 })
    }

    // Table doesn't exist, so create it using raw SQL
    const createTableSQL = `
      -- Create custom_sizing table
      CREATE TABLE IF NOT EXISTS custom_sizing (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        store_id UUID NOT NULL,
        name TEXT NOT NULL,
        sizes TEXT[] NOT NULL,
        is_default BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Add foreign key constraint
      ALTER TABLE custom_sizing
      DROP CONSTRAINT IF EXISTS custom_sizing_store_id_fkey;

      ALTER TABLE custom_sizing
      ADD CONSTRAINT custom_sizing_store_id_fkey
      FOREIGN KEY (store_id) REFERENCES shops(id) ON DELETE CASCADE;

      -- Initialize default sizing options for existing shop
      INSERT INTO custom_sizing (store_id, name, sizes, is_default, created_at, updated_at)
      SELECT
        id as store_id,
        'One Size' as name,
        ARRAY['One Size'] as sizes,
        true as is_default,
        NOW() as created_at,
        NOW() as updated_at
      FROM shops
      WHERE NOT EXISTS (
        SELECT 1 FROM custom_sizing WHERE custom_sizing.store_id = shops.id
      )
      UNION ALL
      SELECT id, 'XS - XL', ARRAY['XS', 'S', 'M', 'L', 'XL'], true, NOW(), NOW()
      FROM shops
      WHERE NOT EXISTS (SELECT 1 FROM custom_sizing WHERE custom_sizing.store_id = shops.id)
      UNION ALL
      SELECT id, 'XS - XXL', ARRAY['XS', 'S', 'M', 'L', 'XL', 'XXL'], true, NOW(), NOW()
      FROM shops
      WHERE NOT EXISTS (SELECT 1 FROM custom_sizing WHERE custom_sizing.store_id = shops.id)
      UNION ALL
      SELECT id, 'XS - XXXL', ARRAY['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'], true, NOW(), NOW()
      FROM shops
      WHERE NOT EXISTS (SELECT 1 FROM custom_sizing WHERE custom_sizing.store_id = shops.id)
      UNION ALL
      SELECT id, 'Numeric (6-16)', ARRAY['6', '8', '10', '12', '14', '16'], true, NOW(), NOW()
      FROM shops
      WHERE NOT EXISTS (SELECT 1 FROM custom_sizing WHERE custom_sizing.store_id = shops.id)
      UNION ALL
      SELECT id, 'Numeric (28-44)', ARRAY['28', '30', '32', '34', '36', '38', '40', '42', '44'], true, NOW(), NOW()
      FROM shops
      WHERE NOT EXISTS (SELECT 1 FROM custom_sizing WHERE custom_sizing.store_id = shops.id)
      UNION ALL
      SELECT id, 'Children (2T-14)', ARRAY['2T', '3T', '4T', '5T', '6', '7', '8', '10', '12', '14'], true, NOW(), NOW()
      FROM shops
      WHERE NOT EXISTS (SELECT 1 FROM custom_sizing WHERE custom_sizing.store_id = shops.id);
    `

    // Execute the SQL using rpc (if available) or alternative method
    // Note: Supabase client doesn't directly support raw DDL SQL
    // We need to use the Postgres connection instead

    return NextResponse.json({
      success: false,
      error: 'Cannot execute DDL through Supabase client',
      message: 'Table needs to be created through Supabase Dashboard or CLI',
      sql: createTableSQL
    }, { status: 501 })

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}
