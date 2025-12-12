import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { z } from "zod";
import { logger } from "@/lib/logger";

// Lazy import supabaseAdmin to avoid module load failures
async function getSupabaseAdmin() {
  const { supabaseAdmin } = await import("@/lib/supabase/admin");
  return supabaseAdmin;
}

// Validation schema for signup
const signupSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Password must contain at least one uppercase letter, one lowercase letter, and one number"
    ),
  businessName: z.string().min(2, "Business name must be at least 2 characters").optional(),
});

/**
 * POST /api/auth/signup
 *
 * Creates a new shop account with email/password.
 * After signup, user logs in and connects their Shopify store via OAuth.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validate input
    const validationResult = signupSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error.flatten().fieldErrors
        },
        { status: 400 }
      );
    }

    const { email, password, businessName } = validationResult.data;
    const supabaseAdmin = await getSupabaseAdmin();

    // Check if email already exists
    const { data: existingShop } = await supabaseAdmin
      .from("shops")
      .select("id, email")
      .eq("email", email.toLowerCase())
      .single();

    if (existingShop) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Generate a temporary shop domain until Shopify is connected
    // This will be replaced with the real Shopify domain after OAuth
    // Use the app URL hostname for the pending domain (works in any environment)
    const timestamp = Date.now();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.thundertext.com';
    const appHostname = new URL(appUrl).hostname;
    const tempShopDomain = `pending-${timestamp}.${appHostname}`;

    // Create shop record
    // shop_type is 'shopify' (default) - user will connect Shopify after signup
    const { data: newShop, error: insertError } = await supabaseAdmin
      .from("shops")
      .insert({
        shop_domain: tempShopDomain,
        email: email.toLowerCase(),
        password_hash: passwordHash,
        shop_type: "shopify", // Regular shop user, will connect Shopify
        is_active: true,
        store_name: businessName || null,
        display_name: businessName || null,
      })
      .select("id, email, shop_domain, store_name")
      .single();

    if (insertError) {
      logger.error("[Signup] Failed to create shop", insertError, {
        component: "signup",
        email: email.toLowerCase(),
      });
      return NextResponse.json(
        { error: "Failed to create account. Please try again." },
        { status: 500 }
      );
    }

    logger.info("[Signup] New shop account created", {
      component: "signup",
      shopId: newShop.id,
      email: newShop.email,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Account created successfully",
        shop: {
          id: newShop.id,
          email: newShop.email,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error("[Signup] Unexpected error", error as Error, {
      component: "signup",
    });
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
