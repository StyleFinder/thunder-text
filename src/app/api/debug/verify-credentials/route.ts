import { NextResponse } from "next/server";
import { guardDebugRoute } from "../_middleware-guard";

export async function GET() {
  const guardResponse = guardDebugRoute("/api/debug/verify-credentials");
  if (guardResponse) return guardResponse;
  // This endpoint helps verify the format and configuration of Shopify credentials

  const apiKey = process.env.NEXT_PUBLIC_SHOPIFY_API_KEY;
  const apiSecret = process.env.SHOPIFY_API_SECRET;

  const analysis = {
    apiKey: {
      exists: !!apiKey,
      length: apiKey?.length || 0,
      format:
        apiKey?.length === 32
          ? "✅ Valid API Key format (32 chars)"
          : "❌ Invalid API Key length",
      value: apiKey || "NOT SET",
      expectedFormat: "32 hexadecimal characters",
    },
    apiSecret: {
      exists: !!apiSecret,
      length: apiSecret?.length || 0,
      format: getSecretFormatAnalysis(apiSecret),
      preview: apiSecret ? apiSecret.substring(0, 8) + "..." : "NOT SET",
      expectedFormat:
        "Usually 64 characters (newer apps) or 32 characters (legacy apps)",
    },
    possibleIssues: [] as string[],
    recommendations: [] as string[],
    formatValidation: null as unknown,
  };

  // Check for common issues
  if (apiSecret?.length === 32) {
    analysis.possibleIssues.push(
      "🔍 API Secret is 32 characters - this might be:",
    );
    analysis.possibleIssues.push("  1. A legacy format secret (older apps)");
    analysis.possibleIssues.push(
      "  2. Only half of the actual secret was copied",
    );
    analysis.possibleIssues.push(
      "  3. The API Key was accidentally copied instead of the Secret",
    );

    // Check if the secret looks like it might be the API key
    if (apiKey && apiSecret && apiKey === apiSecret) {
      analysis.possibleIssues.push(
        "❌ CRITICAL: API Key and Secret are the same! You copied the API Key twice.",
      );
      analysis.recommendations.push(
        "1. Go to Partners Dashboard > Apps > Your App > Settings",
      );
      analysis.recommendations.push('2. Find the "Client credentials" section');
      analysis.recommendations.push(
        "3. Copy the CLIENT SECRET (not the Client ID/API Key)",
      );
      analysis.recommendations.push("4. Update SHOPIFY_API_SECRET in Vercel");
    } else {
      // Generic check for 32-char secrets that might be incomplete
      analysis.possibleIssues.push(
        "⚠️ 32-character secret detected - may be legacy format or incomplete",
      );
      analysis.recommendations.push(
        "1. Go to Partners Dashboard > Apps > Thunder Text > Settings",
      );
      analysis.recommendations.push(
        '2. Click "Reveal" next to the Client Secret',
      );
      analysis.recommendations.push(
        "3. Copy the ENTIRE secret (should be 64 characters for newer apps)",
      );
      analysis.recommendations.push(
        "4. Update SHOPIFY_API_SECRET in Vercel with the complete secret",
      );
    }
  } else if (apiSecret?.length === 64) {
    analysis.possibleIssues.push(
      "✅ API Secret length looks correct for modern Shopify apps",
    );
  } else if (apiSecret && apiSecret.length !== 32 && apiSecret.length !== 64) {
    analysis.possibleIssues.push(
      `❌ Unexpected secret length: ${apiSecret.length} characters`,
    );
    analysis.possibleIssues.push(
      "  Expected: 64 characters (new apps) or 32 characters (legacy apps)",
    );
  }

  // Test if credentials look valid by format
  const credentialCheck = {
    apiKeyFormat: /^[a-f0-9]{32}$/.test(apiKey || ""),
    apiSecretFormat32: /^[a-f0-9]{32}$/.test(apiSecret || ""),
    apiSecretFormat64: /^[a-f0-9]{64}$/.test(apiSecret || ""),
    apiSecretFormatBase64: /^[A-Za-z0-9+/]{43}=$/.test(apiSecret || ""),
  };

  analysis.formatValidation = {
    apiKey: credentialCheck.apiKeyFormat
      ? "✅ Valid hex format"
      : "❌ Invalid format",
    apiSecret: credentialCheck.apiSecretFormat64
      ? "✅ Valid 64-char hex format"
      : credentialCheck.apiSecretFormat32
        ? "⚠️ Valid 32-char hex (might be legacy or incomplete)"
        : credentialCheck.apiSecretFormatBase64
          ? "❌ Looks like base64 (wrong format)"
          : "❌ Invalid format",
  };

  // Add final recommendation
  if (
    analysis.recommendations.length === 0 &&
    analysis.possibleIssues.length > 0
  ) {
    analysis.recommendations.push(
      "Please verify your Client Secret in the Partners Dashboard",
    );
  }

  return NextResponse.json(analysis, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

function getSecretFormatAnalysis(secret: string | undefined): string {
  if (!secret) return "❌ Not configured";

  const length = secret.length;

  if (length === 64) {
    return "✅ Modern format (64 chars)";
  } else if (length === 32) {
    return "⚠️ Legacy format or incomplete (32 chars)";
  } else if (length === 44 && secret.endsWith("=")) {
    return "❌ Appears to be base64 encoded (wrong format)";
  } else {
    return `❌ Unexpected length (${length} chars)`;
  }
}
