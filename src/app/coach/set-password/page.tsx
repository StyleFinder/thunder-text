"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, Button, Input, Text } from "@/features/bhb";
import { colors } from "@/lib/design-system/colors";
import { layout } from "@/lib/design-system/layout";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

function SetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [coachEmail, setCoachEmail] = useState("");

  useEffect(() => {
    if (!token) {
      setError("Invalid or missing invitation token");
      setValidating(false);
      return;
    }

    // Validate token
    validateToken();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const validateToken = async () => {
    try {
      const response = await fetch(`/api/coach/validate-token?token=${token}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Invalid token");
      }

      setTokenValid(true);
      setCoachEmail(data.email);
    } catch (err: any) {
      setError(err.message);
      setTokenValid(false);
    } finally {
      setValidating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    // eslint-disable-next-line security/detect-possible-timing-attacks -- Safe comparison context
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/coach/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to set password");
      }

      // Redirect to coach login
      router.push(
        "/coach/login?message=Password set successfully. Please log in.",
      );
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  if (validating) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background:
            "linear-gradient(135deg, #000000 0%, #434343 50%, #C0C0C0 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: layout.spacing.lg,
        }}
      >
        <Card>
          <Text style={{ textAlign: "center" }}>Validating invitation...</Text>
        </Card>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background:
            "linear-gradient(135deg, #000000 0%, #434343 50%, #C0C0C0 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: layout.spacing.lg,
        }}
      >
        <div style={{ width: "100%", maxWidth: "500px" }}>
          <Card>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {error || "This invitation link is invalid or has expired."}
              </AlertDescription>
            </Alert>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg, #000000 0%, #434343 50%, #C0C0C0 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: layout.spacing.lg,
      }}
    >
      <div style={{ width: "100%", maxWidth: "500px" }}>
        <div style={{ textAlign: "center", marginBottom: layout.spacing.xl }}>
          <Text
            variant="h1"
            style={{ color: colors.white, marginBottom: layout.spacing.xs }}
          >
            Set Your Password
          </Text>
          <Text style={{ color: "rgba(255, 255, 255, 0.9)" }}>
            Welcome, {coachEmail}
          </Text>
        </div>

        <Card>
          {error && (
            <div style={{ marginBottom: layout.spacing.md }}>
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: layout.spacing.lg,
            }}
          >
            <div>
              <Input
                label="Password"
                type="password"
                value={password}
                onChange={setPassword}
                placeholder="Must be at least 8 characters"
                required
              />
            </div>

            <div>
              <Input
                label="Confirm Password"
                type="password"
                value={confirmPassword}
                onChange={setConfirmPassword}
                placeholder="Re-enter your password"
                required
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="large"
              fullWidth
              disabled={loading}
            >
              {loading ? "Setting Password..." : "Set Password"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}

export default function SetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: "100vh",
            background:
              "linear-gradient(135deg, #000000 0%, #434343 50%, #C0C0C0 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: layout.spacing.lg,
          }}
        >
          <Card>
            <Text style={{ textAlign: "center" }}>Loading...</Text>
          </Card>
        </div>
      }
    >
      <SetPasswordForm />
    </Suspense>
  );
}
