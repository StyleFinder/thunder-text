import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const shopDomain = searchParams.get("shop");

    if (!shopDomain) {
      return NextResponse.json(
        { success: false, error: "Missing shop parameter" },
        { status: 400 },
      );
    }

    const supabase = getSupabaseAdmin();

    const { data: shop, error } = await supabase
      .from("shops")
      .select("id")
      .eq("shop_domain", shopDomain)
      .single();

    if (error || !shop) {
      return NextResponse.json(
        { success: false, error: "Shop not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      shopId: shop.id,
    });
  } catch (error) {
    console.error("Shop lookup error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to lookup shop" },
      { status: 500 },
    );
  }
}
