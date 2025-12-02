import { NextRequest, NextResponse } from "next/server";
import { logger } from '@/lib/logger'
import {
  resetSystemPrompt,
  resetCategoryTemplate,
  type ProductCategory,
} from "@/lib/prompts";

// POST /api/prompts/reset - Reset system prompt or category template to default
export async function POST(request: NextRequest) {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL === "https://placeholder.supabase.co"
  ) {
    return NextResponse.json(
      { error: "Application not properly configured" },
      { status: 503 },
    );
  }

  try {
    const body = await request.json();
    const { store_id, type, template_id } = body;

    if (!store_id) {
      return NextResponse.json(
        { error: "Store ID is required" },
        { status: 400 },
      );
    }

    if (type === "system_prompt") {
      const result = await resetSystemPrompt(store_id);

      if (!result) {
        return NextResponse.json(
          { error: "Failed to reset system prompt" },
          { status: 500 },
        );
      }

      return NextResponse.json({ success: true, data: result });
    } else if (type === "category_template") {
      if (!template_id) {
        return NextResponse.json(
          { error: "Template ID is required" },
          { status: 400 },
        );
      }

      // Get the template to find its category
      const { createClient } = await import("@supabase/supabase-js");
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
      );

      const { data: template, error: templateError } = await supabaseAdmin
        .from("category_templates")
        .select("category")
        .eq("id", template_id)
        .single();

      if (templateError || !template) {
        return NextResponse.json(
          { error: "Template not found" },
          { status: 404 },
        );
      }

      const result = await resetCategoryTemplate(
        store_id,
        template.category as ProductCategory,
      );

      if (!result) {
        return NextResponse.json(
          { error: "Failed to reset category template" },
          { status: 500 },
        );
      }

      return NextResponse.json({ success: true, data: result });
    } else {
      return NextResponse.json(
        { error: "Invalid type for reset operation" },
        { status: 400 },
      );
    }
  } catch (error) {
    logger.error("Error in POST /api/prompts/reset:", error as Error, { component: 'reset' });
    return NextResponse.json(
      { error: "Failed to reset prompt" },
      { status: 500 },
    );
  }
}
