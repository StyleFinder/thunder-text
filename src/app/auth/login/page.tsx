"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertCircle,
  Zap,
  FileText,
  Target,
  Users,
  ArrowRight,
  Loader2,
  Mail,
  Lock,
  Sparkles,
} from "lucide-react";
import { logger } from "@/lib/logger";

// Gradient mesh background for left panel
function GradientMesh() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(135deg, #001429 0%, #002952 50%, #003d7a 100%)",
        }}
      />
      {/* Animated orbs */}
      <div
        className="absolute w-96 h-96 rounded-full blur-3xl opacity-20 animate-welcome-float"
        style={{
          background: "radial-gradient(circle, #0099ff 0%, transparent 70%)",
          top: "10%",
          right: "-10%",
        }}
      />
      <div
        className="absolute w-80 h-80 rounded-full blur-3xl opacity-15 animate-welcome-float-slow"
        style={{
          background: "radial-gradient(circle, #ffcc00 0%, transparent 70%)",
          bottom: "20%",
          left: "-5%",
        }}
      />
      <div
        className="absolute w-64 h-64 rounded-full blur-3xl opacity-10 animate-welcome-float-slower"
        style={{
          background: "radial-gradient(circle, #0066cc 0%, transparent 70%)",
          top: "50%",
          right: "20%",
        }}
      />
    </div>
  );
}

// Feature item for left panel
function FeatureItem({
  icon: Icon,
  text,
}: {
  icon: React.ElementType;
  text: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: "rgba(255, 255, 255, 0.1)" }}
      >
        <Icon className="w-4 h-4 text-white" />
      </div>
      <span style={{ color: "rgba(255, 255, 255, 0.9)" }} className="text-sm">
        {text}
      </span>
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await signIn("credentials", {
      email,
      password,
      userType: "shop",
      redirect: false,
    });

    if (result?.error) {
      logger.error(`[Login Page] Login failed: ${result.error}`, undefined, {
        component: "login",
      });

      if (result.error.includes("ACCOUNT_LOCKED")) {
        const lockoutSeconds = parseInt(result.error.split(":")[1]) || 900;
        const lockoutMinutes = Math.ceil(lockoutSeconds / 60);
        setError(
          `Account temporarily locked due to too many failed attempts. Please try again in ${lockoutMinutes} minute${lockoutMinutes > 1 ? "s" : ""}.`,
        );
      } else {
        setError("Invalid email or password");
      }
      setLoading(false);
      return;
    }

    console.log("[Login Page] Login successful, redirecting...");
    const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
    router.push(callbackUrl);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Brand/Marketing */}
      <div className="hidden lg:flex lg:w-[420px] xl:w-[480px] relative flex-col justify-between p-8 overflow-hidden">
        <GradientMesh />

        {/* Content */}
        <div className="relative z-10">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-12">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #ffcc00 0%, #ff9900 100%)",
              }}
            >
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">Thunder Text</span>
          </div>

          {/* Headline */}
          <div className="mb-10">
            <h1
              className="text-3xl font-bold mb-3 leading-tight"
              style={{ color: "white" }}
            >
              Welcome back to
              <br />
              <span
                className="text-transparent bg-clip-text"
                style={{
                  backgroundImage:
                    "linear-gradient(90deg, #ffcc00 0%, #ff9900 100%)",
                }}
              >
                Thunder Text
              </span>
            </h1>
            <p
              style={{ color: "rgba(255, 255, 255, 0.7)" }}
              className="text-base"
            >
              Sign in to continue creating amazing product descriptions and
              high-converting ads.
            </p>
          </div>

          {/* Features */}
          <div className="space-y-4">
            <FeatureItem
              icon={FileText}
              text="AI-powered product descriptions"
            />
            <FeatureItem icon={Target} text="High-converting ad copy" />
            <FeatureItem icon={Users} text="Personal BHB coaching" />
            <FeatureItem icon={Sparkles} text="Brand voice consistency" />
          </div>
        </div>

        {/* Bottom stats */}
        <div
          className="relative z-10 pt-8 border-t"
          style={{ borderColor: "rgba(255, 255, 255, 0.1)" }}
        >
          <div className="flex gap-8">
            <div>
              <div className="text-2xl font-bold text-white">10,000+</div>
              <div
                style={{ color: "rgba(255, 255, 255, 0.6)" }}
                className="text-sm"
              >
                Products created
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">500+</div>
              <div
                style={{ color: "rgba(255, 255, 255, 0.6)" }}
                className="text-sm"
              >
                Happy stores
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center bg-gray-50 p-6 lg:p-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #0066cc 0%, #0099ff 100%)",
              }}
            >
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">
              Thunder Text
            </span>
          </div>

          {/* Form Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Sign in to your account
              </h2>
              <p className="text-gray-500">
                Enter your credentials to continue
              </p>
            </div>

            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-700">
                  Email address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="pl-10 h-11"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-gray-700">
                    Password
                  </Label>
                  <Link
                    href="/auth/forgot-password"
                    className="text-sm font-medium hover:underline"
                    style={{ color: "#0066cc" }}
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="pl-10 h-11"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 text-base font-medium"
                style={{
                  background:
                    "linear-gradient(135deg, #0066cc 0%, #0099ff 100%)",
                  border: "none",
                }}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign in
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </form>

            {/* Sign up link */}
            <p className="mt-6 text-center text-sm text-gray-500">
              Don&apos;t have an account?{" "}
              <Link
                href="/auth/signup"
                className="font-medium hover:underline"
                style={{ color: "#0066cc" }}
              >
                Sign up for free
              </Link>
            </p>
          </div>

          {/* Coach login link */}
          <p className="mt-4 text-center text-sm text-gray-400">
            Are you a coach?{" "}
            <Link
              href="/coach/login"
              className="font-medium hover:underline"
              style={{ color: "#0066cc" }}
            >
              Coach Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
