"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { logger } from "@/lib/logger";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Loader2,
  AlertCircle,
  Shield,
  ShieldCheck,
  ShieldOff,
  Key,
  Copy,
  Check,
  RefreshCw,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";

interface TwoFactorSetupData {
  qrCode: string;
  backupCodes: string[];
  secret: string;
}

export default function AdminSettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [setupData, setSetupData] = useState<TwoFactorSetupData | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showSetupDialog, setShowSetupDialog] = useState(false);
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [showBackupCodesDialog, setShowBackupCodesDialog] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Check auth status
  useEffect(() => {
    if (status === "loading") return;
    if (!session || session.user.role !== "admin") {
      router.push("/admin/login");
    }
  }, [session, status, router]);

  // Fetch 2FA status
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch("/api/admin/two-factor");
        if (response.ok) {
          const data = await response.json();
          setTwoFactorEnabled(data.enabled);
        }
      } catch (err) {
        logger.error("Failed to fetch 2FA status", err, { component: "admin-settings" });
      } finally {
        setLoading(false);
      }
    };

    if (session?.user?.role === "admin") {
      fetchStatus();
    }
  }, [session]);

  const handleInitSetup = async () => {
    setActionLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/two-factor", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to initialize 2FA setup");
      }

      setSetupData(data);
      setShowSetupDialog(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteSetup = async () => {
    if (verificationCode.length !== 6) return;

    setActionLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/two-factor", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ totpCode: verificationCode }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to verify code");
      }

      setTwoFactorEnabled(true);
      setShowSetupDialog(false);
      setVerificationCode("");
      setSuccess("Two-factor authentication has been enabled successfully!");
      setTimeout(() => setSuccess(""), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDisable2FA = async () => {
    if (disableCode.length !== 6) return;

    setActionLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/two-factor", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ totpCode: disableCode }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to disable 2FA");
      }

      setTwoFactorEnabled(false);
      setShowDisableDialog(false);
      setDisableCode("");
      setSuccess("Two-factor authentication has been disabled.");
      setTimeout(() => setSuccess(""), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRegenerateBackupCodes = async () => {
    if (verificationCode.length !== 6) return;

    setActionLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/two-factor/backup-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ totpCode: verificationCode }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to regenerate backup codes");
      }

      setBackupCodes(data.backupCodes);
      setShowBackupCodesDialog(true);
      setVerificationCode("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setActionLoading(false);
    }
  };

  const copyToClipboard = (text: string, type: "secret" | "codes") => {
    navigator.clipboard.writeText(text);
    if (type === "secret") {
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    } else {
      setCopiedCodes(true);
      setTimeout(() => setCopiedCodes(false), 2000);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="mb-6">
          <Link
            href="/admin/coaches"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Dashboard
          </Link>
        </div>

        <h1 className="text-2xl font-bold mb-6">Admin Settings</h1>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-4 border-green-500 bg-green-50">
            <ShieldCheck className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              {success}
            </AlertDescription>
          </Alert>
        )}

        {/* Two-Factor Authentication Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Two-Factor Authentication
            </CardTitle>
            <CardDescription>
              Add an extra layer of security to your admin account by requiring
              a verification code in addition to your password.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                {twoFactorEnabled ? (
                  <ShieldCheck className="h-8 w-8 text-green-600" />
                ) : (
                  <ShieldOff className="h-8 w-8 text-gray-400" />
                )}
                <div>
                  <p className="font-medium">
                    {twoFactorEnabled ? "2FA is Enabled" : "2FA is Disabled"}
                  </p>
                  <p className="text-sm text-gray-500">
                    {twoFactorEnabled
                      ? "Your account is protected with two-factor authentication"
                      : "Enable 2FA to secure your admin account"}
                  </p>
                </div>
              </div>
            </div>

            {twoFactorEnabled ? (
              <div className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowBackupCodesDialog(true)}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Regenerate Backup Codes
                </Button>
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={() => setShowDisableDialog(true)}
                >
                  <ShieldOff className="h-4 w-4 mr-2" />
                  Disable Two-Factor Authentication
                </Button>
              </div>
            ) : (
              <Button
                className="w-full bg-smart-blue-500 hover:bg-smart-blue-600"
                onClick={handleInitSetup}
                disabled={actionLoading}
              >
                {actionLoading && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                <Shield className="h-4 w-4 mr-2" />
                Enable Two-Factor Authentication
              </Button>
            )}
          </CardContent>
        </Card>

        {/* 2FA Setup Dialog */}
        <Dialog open={showSetupDialog} onOpenChange={setShowSetupDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Set Up Two-Factor Authentication
              </DialogTitle>
              <DialogDescription>
                Scan the QR code with your authenticator app, then enter the
                verification code.
              </DialogDescription>
            </DialogHeader>

            {setupData && (
              <div className="space-y-4">
                {/* QR Code */}
                <div className="flex justify-center">
                  <div className="p-4 bg-white rounded-lg border">
                    <Image
                      src={setupData.qrCode}
                      alt="2FA QR Code"
                      width={192}
                      height={192}
                      className="w-48 h-48"
                      unoptimized
                    />
                  </div>
                </div>

                {/* Manual Entry */}
                <div className="text-center">
                  <p className="text-sm text-gray-500 mb-2">
                    Can&apos;t scan? Enter this code manually:
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    <code className="px-3 py-1 bg-gray-100 rounded text-sm font-mono">
                      {setupData.secret}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        copyToClipboard(setupData.secret, "secret")
                      }
                    >
                      {copiedSecret ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Backup Codes */}
                <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="flex items-start gap-2 mb-2">
                    <Key className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-yellow-800">
                        Save Your Backup Codes
                      </p>
                      <p className="text-sm text-yellow-700">
                        Store these codes securely. You can use them to access
                        your account if you lose your authenticator.
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    {setupData.backupCodes.map((code, i) => (
                      <code
                        key={i}
                        className="px-2 py-1 bg-white rounded text-sm font-mono text-center border"
                      >
                        {code}
                      </code>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-3"
                    onClick={() =>
                      copyToClipboard(setupData.backupCodes.join("\n"), "codes")
                    }
                  >
                    {copiedCodes ? (
                      <>
                        <Check className="h-4 w-4 mr-2 text-green-600" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy Backup Codes
                      </>
                    )}
                  </Button>
                </div>

                {/* Verification */}
                <div className="space-y-2">
                  <Label htmlFor="verificationCode">
                    Enter Verification Code
                  </Label>
                  <Input
                    id="verificationCode"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={verificationCode}
                    onChange={(e) =>
                      setVerificationCode(e.target.value.replace(/\D/g, ""))
                    }
                    placeholder="000000"
                    className="text-center text-xl tracking-widest"
                  />
                </div>

                <Button
                  className="w-full"
                  onClick={handleCompleteSetup}
                  disabled={actionLoading || verificationCode.length !== 6}
                >
                  {actionLoading && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Verify and Enable 2FA
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Disable 2FA Dialog */}
        <Dialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <ShieldOff className="h-5 w-5" />
                Disable Two-Factor Authentication
              </DialogTitle>
              <DialogDescription>
                Enter your current authentication code to disable 2FA. This will
                make your account less secure.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="disableCode">Authentication Code</Label>
                <Input
                  id="disableCode"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={disableCode}
                  onChange={(e) =>
                    setDisableCode(e.target.value.replace(/\D/g, ""))
                  }
                  placeholder="000000"
                  className="text-center text-xl tracking-widest"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowDisableDialog(false);
                    setDisableCode("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={handleDisable2FA}
                  disabled={actionLoading || disableCode.length !== 6}
                >
                  {actionLoading && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Disable 2FA
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Regenerate Backup Codes Dialog */}
        <Dialog
          open={showBackupCodesDialog}
          onOpenChange={setShowBackupCodesDialog}
        >
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                {backupCodes.length > 0
                  ? "New Backup Codes"
                  : "Regenerate Backup Codes"}
              </DialogTitle>
              <DialogDescription>
                {backupCodes.length > 0
                  ? "Save these new backup codes securely. Previous codes are now invalid."
                  : "Enter your authentication code to generate new backup codes."}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {backupCodes.length > 0 ? (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    {backupCodes.map((code, i) => (
                      <code
                        key={i}
                        className="px-2 py-1 bg-gray-100 rounded text-sm font-mono text-center border"
                      >
                        {code}
                      </code>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() =>
                      copyToClipboard(backupCodes.join("\n"), "codes")
                    }
                  >
                    {copiedCodes ? (
                      <>
                        <Check className="h-4 w-4 mr-2 text-green-600" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy All Codes
                      </>
                    )}
                  </Button>
                  <Button
                    className="w-full"
                    onClick={() => {
                      setShowBackupCodesDialog(false);
                      setBackupCodes([]);
                    }}
                  >
                    Done
                  </Button>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="regenerateCode">Authentication Code</Label>
                    <Input
                      id="regenerateCode"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      value={verificationCode}
                      onChange={(e) =>
                        setVerificationCode(e.target.value.replace(/\D/g, ""))
                      }
                      placeholder="000000"
                      className="text-center text-xl tracking-widest"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setShowBackupCodesDialog(false);
                        setVerificationCode("");
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={handleRegenerateBackupCodes}
                      disabled={actionLoading || verificationCode.length !== 6}
                    >
                      {actionLoading && (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      )}
                      Regenerate
                    </Button>
                  </div>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
