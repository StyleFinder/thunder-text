import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { z } from "zod";
import { logger } from "@/lib/logger";

// Lazy import supabaseAdmin to avoid module load failures
async function getSupabaseAdmin() {
  const { supabaseAdmin } = await import("@/lib/supabase/admin");
  return supabaseAdmin;
}

// Validation schema
const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token is required"),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Password must contain at least one uppercase letter, one lowercase letter, and one number",
    ),
});

/**
 * POST /api/auth/reset-password
 *
 * Resets the user's password using a valid reset token.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validate input
    const validationResult = resetPasswordSchema.safeParse(body);
    if (!validationResult.success) {
      const errors = validationResult.error.flatten().fieldErrors;
      const errorMessage = Object.values(errors).flat()[0] || "Invalid input";
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    const { token, email, password } = validationResult.data;
    const supabaseAdmin = await getSupabaseAdmin();

    // Hash the provided token to compare with stored hash
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    // Find shop with matching email and token
    const { data: shop, error: fetchError } = await supabaseAdmin
      .from("shops")
      .select("id, email, reset_token_hash, reset_token_expires")
      .eq("email", email.toLowerCase())
      .single();

    if (fetchError || !shop) {
      logger.warn("[ResetPassword] Shop not found for email", {
        component: "reset-password",
        email: email.toLowerCase(),
      });
      return NextResponse.json(
        { error: "Invalid or expired reset link" },
        { status: 400 },
      );
    }

    // Verify token matches
    if (shop.reset_token_hash !== tokenHash) {
      logger.warn("[ResetPassword] Token mismatch", {
        component: "reset-password",
        shopId: shop.id,
      });
      return NextResponse.json(
        { error: "Invalid or expired reset link" },
        { status: 400 },
      );
    }

    // Check if token has expired
    if (
      shop.reset_token_expires &&
      new Date(shop.reset_token_expires) < new Date()
    ) {
      logger.warn("[ResetPassword] Token expired", {
        component: "reset-password",
        shopId: shop.id,
        expiredAt: shop.reset_token_expires,
      });
      return NextResponse.json(
        { error: "This reset link has expired. Please request a new one." },
        { status: 400 },
      );
    }

    // Hash new password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Update password and clear reset token
    const { error: updateError } = await supabaseAdmin
      .from("shops")
      .update({
        password_hash: passwordHash,
        reset_token_hash: null,
        reset_token_expires: null,
      })
      .eq("id", shop.id);

    if (updateError) {
      logger.error("[ResetPassword] Failed to update password", updateError, {
        component: "reset-password",
        shopId: shop.id,
      });
      return NextResponse.json(
        { error: "Failed to reset password. Please try again." },
        { status: 500 },
      );
    }

    logger.info("[ResetPassword] Password reset successful", {
      component: "reset-password",
      shopId: shop.id,
    });

    return NextResponse.json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    logger.error("[ResetPassword] Unexpected error", error as Error, {
      component: "reset-password",
    });
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 },
    );
  }
}
