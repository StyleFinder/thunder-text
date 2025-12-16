import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { logger } from "@/lib/logger";
import { sendEmail } from "@/lib/services/resend-service";

// Lazy import supabaseAdmin to avoid module load failures
async function getSupabaseAdmin() {
  const { supabaseAdmin } = await import("@/lib/supabase/admin");
  return supabaseAdmin;
}

// Validation schema
const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

/**
 * POST /api/auth/forgot-password
 *
 * Sends a password reset email to the user.
 * Creates a reset token in the database that expires in 1 hour.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validate input
    const validationResult = forgotPasswordSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 },
      );
    }

    const { email } = validationResult.data;
    const supabaseAdmin = await getSupabaseAdmin();

    // Check if email exists
    const { data: shop } = await supabaseAdmin
      .from("shops")
      .select("id, email, store_name")
      .eq("email", email.toLowerCase())
      .single();

    // Always return success to prevent email enumeration attacks
    // Even if the email doesn't exist, we show the same message
    if (!shop) {
      logger.info(
        "[ForgotPassword] Email not found, returning success anyway",
        {
          component: "forgot-password",
          email: email.toLowerCase(),
        },
      );
      return NextResponse.json({
        success: true,
        message:
          "If an account exists, you will receive a password reset email",
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenHash = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store reset token in database
    const { error: updateError } = await supabaseAdmin
      .from("shops")
      .update({
        reset_token_hash: resetTokenHash,
        reset_token_expires: expiresAt.toISOString(),
      })
      .eq("id", shop.id);

    if (updateError) {
      logger.error(
        "[ForgotPassword] Failed to store reset token",
        updateError,
        {
          component: "forgot-password",
          shopId: shop.id,
        },
      );
      return NextResponse.json(
        { error: "Failed to process request. Please try again." },
        { status: 500 },
      );
    }

    // Generate reset URL
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL || "https://app.thundertext.com";
    const resetUrl = `${appUrl}/auth/reset-password?token=${resetToken}&email=${encodeURIComponent(email.toLowerCase())}`;

    // Send email
    const emailResult = await sendEmail({
      to: [email.toLowerCase()],
      subject: "Reset Your Thunder Text Password",
      html: generatePasswordResetEmailHTML({
        storeName: shop.store_name || "there",
        resetUrl,
      }),
    });

    if (!emailResult.success) {
      logger.error(
        "[ForgotPassword] Failed to send reset email",
        new Error(emailResult.error),
        {
          component: "forgot-password",
          shopId: shop.id,
        },
      );
      // Still return success to prevent enumeration
    } else {
      logger.info("[ForgotPassword] Reset email sent", {
        component: "forgot-password",
        shopId: shop.id,
        messageId: emailResult.messageId,
      });
    }

    return NextResponse.json({
      success: true,
      message: "If an account exists, you will receive a password reset email",
    });
  } catch (error) {
    logger.error("[ForgotPassword] Unexpected error", error as Error, {
      component: "forgot-password",
    });
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 },
    );
  }
}

/**
 * Generate HTML email template for password reset
 */
function generatePasswordResetEmailHTML(params: {
  storeName: string;
  resetUrl: string;
}): string {
  const { storeName, resetUrl } = params;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #F6F6F7;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #001429 0%, #002952 50%, #003d7a 100%); padding: 32px; text-align: center;">
      <div style="display: inline-flex; align-items: center; gap: 12px;">
        <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #ffcc00 0%, #ff9900 100%); border-radius: 12px; display: flex; align-items: center; justify-content: center;">
          <span style="font-size: 24px;">&#9889;</span>
        </div>
        <h1 style="margin: 0; color: #FFFFFF; font-size: 28px; font-weight: 700;">
          Thunder Text
        </h1>
      </div>
    </div>

    <!-- Content -->
    <div style="padding: 40px 32px;">
      <h2 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 600; color: #202223; text-align: center;">
        Reset Your Password
      </h2>

      <p style="margin: 0 0 24px 0; font-size: 16px; color: #202223; text-align: center; line-height: 1.6;">
        Hi ${escapeHtml(storeName)},
      </p>

      <p style="margin: 0 0 24px 0; font-size: 16px; color: #202223; text-align: center; line-height: 1.6;">
        We received a request to reset your password. Click the button below to create a new password.
      </p>

      <div style="text-align: center; margin: 32px 0;">
        <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #0066cc 0%, #0099ff 100%); color: #FFFFFF; text-decoration: none; padding: 16px 48px; border-radius: 8px; font-weight: 600; font-size: 18px; box-shadow: 0 4px 14px rgba(0, 102, 204, 0.3);">
          Reset Password
        </a>
      </div>

      <p style="margin: 0 0 16px 0; font-size: 14px; color: #6D7175; text-align: center;">
        This link will expire in <strong>1 hour</strong>.
      </p>

      <p style="margin: 0; font-size: 14px; color: #6D7175; text-align: center;">
        If you didn't request a password reset, you can safely ignore this email.
        Your password will remain unchanged.
      </p>
    </div>

    <!-- Footer -->
    <div style="background-color: #F6F6F7; padding: 24px; text-align: center; border-top: 1px solid #E1E3E5;">
      <p style="margin: 0 0 8px 0; font-size: 12px; color: #6D7175;">
        Questions? Contact us at <a href="mailto:support@thundertext.app" style="color: #0066cc; text-decoration: none;">support@thundertext.app</a>
      </p>
      <p style="margin: 0; font-size: 12px; color: #6D7175;">
        If the button doesn't work, copy and paste this link into your browser:<br>
        <a href="${resetUrl}" style="color: #0066cc; text-decoration: none; word-break: break-all;">${resetUrl}</a>
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
