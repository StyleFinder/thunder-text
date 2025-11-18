import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * POST /api/trends/migrations/add-custom-themes
 * Run migration to add custom themes support
 * DANGER: This should only be run once
 */
export async function POST() {
  try {
    // Check if column already exists
    const { data: columns, error: checkError } = await supabaseAdmin
      .rpc("exec", {
        sql: `
          SELECT column_name
          FROM information_schema.columns
          WHERE table_name = 'themes' AND column_name = 'created_by_shop_id'
        `,
      })
      .single();

    if (!checkError && columns) {
      return NextResponse.json({
        success: true,
        message: "Migration already applied - created_by_shop_id column exists",
      });
    }

    // Apply migration via raw SQL
    const migrationSQL = `
      ALTER TABLE themes
      ADD COLUMN created_by_shop_id UUID REFERENCES shops(id) ON DELETE CASCADE;

      CREATE INDEX idx_themes_created_by_shop ON themes(created_by_shop_id)
      WHERE created_by_shop_id IS NOT NULL;

      COMMENT ON COLUMN themes.created_by_shop_id IS 'Shop that created this custom theme. NULL for global themes.';
    `;

    // Note: Supabase client doesn't support raw DDL directly
    // We need to use the database connection through a function or manual execution

    return NextResponse.json({
      success: false,
      error: "Migration must be run manually via Supabase dashboard or psql",
      sql: migrationSQL,
    });
  } catch (error) {
    console.error("Migration error:", error);
    return NextResponse.json(
      { success: false, error: "Migration failed" },
      { status: 500 },
    );
  }
}
