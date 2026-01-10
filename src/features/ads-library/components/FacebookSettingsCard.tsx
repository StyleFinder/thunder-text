/**
 * Facebook Settings Card
 *
 * Manages email notification settings and custom benchmarks for Facebook ad alerts
 * Allows users to configure:
 * - Primary email and additional recipients
 * - Custom conversion rate and ROAS benchmarks
 * - Alert threshold percentage
 * - Which metrics trigger alerts
 */

/* eslint-disable react/no-unescaped-entities -- Quotes and apostrophes in JSX text are intentional */
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, CheckCircle2, Trash2, Info } from "lucide-react";
import { logger } from "@/lib/logger";

interface FacebookNotificationSettings {
  id?: string;
  primary_email: string;
  additional_emails: string[];
  custom_conversion_benchmark: number;
  custom_roas_benchmark: number;
  alert_threshold_percentage: number;
  notify_on_conversion: boolean;
  notify_on_roas: boolean;
  is_enabled: boolean;
}

interface FacebookSettingsCardProps {
  shop: string;
}

export default function FacebookSettingsCard({
  shop,
}: FacebookSettingsCardProps) {
  const [settings, setSettings] = useState<FacebookNotificationSettings>({
    primary_email: "",
    additional_emails: [],
    custom_conversion_benchmark: 3.0,
    custom_roas_benchmark: 3.0,
    alert_threshold_percentage: 10,
    notify_on_conversion: true,
    notify_on_roas: true,
    is_enabled: true,
  });
  const [newEmail, setNewEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (shop) {
      fetchSettings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shop]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/facebook/settings?shop=${shop}`);
      const data = await response.json();

      if (data.success && data.data) {
        setSettings(data.data);
      }
    } catch (err) {
      logger.error("Error fetching Facebook settings:", err as Error, {
        component: "FacebookSettingsCard",
      });
      setError("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      // Validate primary email
      if (!settings.primary_email || !isValidEmail(settings.primary_email)) {
        setError("Please enter a valid primary email address");
        return;
      }

      // Validate benchmarks
      if (settings.custom_conversion_benchmark <= 0) {
        setError("Conversion rate benchmark must be greater than 0");
        return;
      }

      if (settings.custom_roas_benchmark <= 0) {
        setError("ROAS benchmark must be greater than 0");
        return;
      }

      const response = await fetch("/api/facebook/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shop,
          ...settings,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to save settings");
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      logger.error("Error saving settings:", err as Error, {
        component: "FacebookSettingsCard",
      });
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const isValidEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleAddEmail = () => {
    if (!newEmail) return;

    if (!isValidEmail(newEmail)) {
      setError("Please enter a valid email address");
      return;
    }

    if (settings.additional_emails.includes(newEmail)) {
      setError("This email is already added");
      return;
    }

    setSettings({
      ...settings,
      additional_emails: [...settings.additional_emails, newEmail],
    });
    setNewEmail("");
    setError(null);
  };

  const handleRemoveEmail = (emailToRemove: string) => {
    setSettings({
      ...settings,
      additional_emails: settings.additional_emails.filter(
        (email) => email !== emailToRemove,
      ),
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center gap-2 py-6">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Loading Facebook alert settings...
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Facebook Ad Alert Settings</CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Receive daily email alerts at 6 AM ET when campaigns fall below your
          benchmarks
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{error}</span>
              <button
                onClick={() => setError(null)}
                className="ml-2 text-sm underline"
              >
                Dismiss
              </button>
            </AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-green-600 bg-green-50">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-700">
              Settings saved successfully! You'll receive alerts starting
              tomorrow at 6 AM ET.
            </AlertDescription>
          </Alert>
        )}

        {/* Email Configuration */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-foreground">
            Email Recipients
          </h4>

          <div className="space-y-2">
            <Label htmlFor="primary-email">
              Primary Email <span className="text-red-500">*</span>
            </Label>
            <Input
              id="primary-email"
              type="email"
              value={settings.primary_email}
              onChange={(e) =>
                setSettings({ ...settings, primary_email: e.target.value })
              }
              placeholder="your-email@example.com"
              autoComplete="email"
            />
            <p className="text-xs text-muted-foreground">
              Daily alerts will be sent to this email address
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">
              Additional Recipients (Optional)
            </p>
            {settings.additional_emails.map((email) => (
              <div
                key={email}
                className="flex items-center justify-between p-2 bg-secondary/50 rounded-md"
              >
                <span className="text-sm text-foreground">{email}</span>
                <Button
                  onClick={() => handleRemoveEmail(email)}
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}

            <div className="flex items-end gap-2">
              <div className="flex-1 space-y-2">
                <Label htmlFor="new-email" className="sr-only">
                  Additional Email
                </Label>
                <Input
                  id="new-email"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="additional-email@example.com"
                  autoComplete="off"
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddEmail();
                    }
                  }}
                />
              </div>
              <Button onClick={handleAddEmail} variant="outline">
                + Add Email
              </Button>
            </div>
          </div>
        </div>

        {/* Benchmark Configuration */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-foreground">
            Performance Benchmarks
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="conversion-benchmark">
                Conversion Rate Benchmark (%)
              </Label>
              <div className="relative">
                <Input
                  id="conversion-benchmark"
                  type="number"
                  value={settings.custom_conversion_benchmark.toString()}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      custom_conversion_benchmark:
                        parseFloat(e.target.value) || 0,
                    })
                  }
                  min={0}
                  step={0.1}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  %
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Alert when conversion rate falls below this value
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="roas-benchmark">ROAS Benchmark (x)</Label>
              <div className="relative">
                <Input
                  id="roas-benchmark"
                  type="number"
                  value={settings.custom_roas_benchmark.toString()}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      custom_roas_benchmark: parseFloat(e.target.value) || 0,
                    })
                  }
                  min={0}
                  step={0.1}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  x
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Alert when ROAS falls below this value
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="alert-threshold">Alert Threshold (%)</Label>
            <div className="relative">
              <Input
                id="alert-threshold"
                type="number"
                value={settings.alert_threshold_percentage.toString()}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    alert_threshold_percentage: parseInt(e.target.value) || 0,
                  })
                }
                min={0}
                max={100}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                %
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Trigger alerts when metrics fall this percentage below benchmarks
            </p>
          </div>
        </div>

        {/* Alert Triggers */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-foreground">
            Alert Triggers
          </h4>

          <div className="space-y-3">
            <div className="flex items-start space-x-2">
              <Checkbox
                id="notify-conversion"
                checked={settings.notify_on_conversion}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    notify_on_conversion: checked as boolean,
                  })
                }
              />
              <div className="space-y-1">
                <Label
                  htmlFor="notify-conversion"
                  className="text-sm font-normal cursor-pointer"
                >
                  Alert on Conversion Rate
                </Label>
                <p className="text-xs text-muted-foreground">
                  Receive alerts when conversion rate falls below benchmark
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-2">
              <Checkbox
                id="notify-roas"
                checked={settings.notify_on_roas}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    notify_on_roas: checked as boolean,
                  })
                }
              />
              <div className="space-y-1">
                <Label
                  htmlFor="notify-roas"
                  className="text-sm font-normal cursor-pointer"
                >
                  Alert on ROAS
                </Label>
                <p className="text-xs text-muted-foreground">
                  Receive alerts when ROAS falls below benchmark
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-2">
              <Checkbox
                id="enable-alerts"
                checked={settings.is_enabled}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, is_enabled: checked as boolean })
                }
              />
              <div className="space-y-1">
                <Label
                  htmlFor="enable-alerts"
                  className="text-sm font-normal cursor-pointer"
                >
                  Enable Email Alerts
                </Label>
                <p className="text-xs text-muted-foreground">
                  Turn on/off all Facebook ad alerts
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={saving || !settings.primary_email}
            className="min-w-[120px]"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Settings"
            )}
          </Button>
        </div>

        {/* Info Banner */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <p className="font-semibold text-sm mb-1">How it works:</p>
            <ul className="text-xs space-y-1 list-disc list-inside">
              <li>Alerts run daily at 6 AM Eastern Time</li>
              <li>
                You'll receive one email per day for underperforming campaigns
              </li>
              <li>
                Alerts include campaign names, metrics, and direct links to
                Facebook Ads
              </li>
            </ul>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
