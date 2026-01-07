/* eslint-disable security/detect-object-injection -- Dynamic object access with validated keys is safe here */
/* eslint-disable react/no-unescaped-entities -- Quotes and apostrophes in JSX text are intentional */
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  FileText,
  Trash2,
  Eye,
  EyeOff,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";
import type { ContentSample } from "@/types/content-center";

interface SampleListProps {
  refreshTrigger?: number;
}

export function SampleList({ refreshTrigger }: SampleListProps) {
  const [samples, setSamples] = useState<ContentSample[]>([]);
  const [activeCount, setActiveCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingSampleId, setUpdatingSampleId] = useState<string | null>(null);
  const [deletingSampleId, setDeletingSampleId] = useState<string | null>(null);

  const fetchSamples = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/content-center/samples", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("supabase_token")}`,
        },
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to fetch samples");
      }

      setSamples(data.data.samples);
      setActiveCount(data.data.active_count);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load samples");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSamples();
  }, [refreshTrigger]);

  const toggleSampleActive = async (
    sampleId: string,
    currentState: boolean,
  ) => {
    setUpdatingSampleId(sampleId);
    setError(null);

    try {
      const response = await fetch(`/api/content-center/samples/${sampleId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("supabase_token")}`,
        },
        body: JSON.stringify({
          is_active: !currentState,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to update sample");
      }

      // Update local state
      setSamples(
        samples.map((s) =>
          s.id === sampleId ? { ...s, is_active: !currentState } : s,
        ),
      );
      setActiveCount((prev) => (currentState ? prev - 1 : prev + 1));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update sample");
    } finally {
      setUpdatingSampleId(null);
    }
  };

  const deleteSample = async (sampleId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this sample? This action cannot be undone.",
      )
    ) {
      return;
    }

    setDeletingSampleId(sampleId);
    setError(null);

    try {
      const response = await fetch(`/api/content-center/samples/${sampleId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("supabase_token")}`,
        },
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to delete sample");
      }

      // Update local state
      const deletedSample = samples.find((s) => s.id === sampleId);
      setSamples(samples.filter((s) => s.id !== sampleId));
      if (deletedSample?.is_active) {
        setActiveCount((prev) => prev - 1);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete sample");
    } finally {
      setDeletingSampleId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getSampleTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      blog: "Blog Post",
      email: "Email",
      description: "Product Description",
      other: "Other",
    };
    return labels[type] || type;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading samples...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Your Content Samples</CardTitle>
            <CardDescription>
              {activeCount} active sample{activeCount !== 1 ? "s" : ""} •{" "}
              {samples.length} total (10 max)
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchSamples}
            disabled={isLoading}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Alert */}
        {activeCount < 3 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You need at least 3 active samples to generate a voice profile.
              {activeCount === 0
                ? " Upload your first sample to get started."
                : ` You have ${activeCount} active sample${activeCount !== 1 ? "s" : ""}.`}
            </AlertDescription>
          </Alert>
        )}

        {activeCount >= 3 && (
          <Alert className="border-green-600 bg-green-50">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-600">
              You have enough samples to generate a voice profile!
            </AlertDescription>
          </Alert>
        )}

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Sample List */}
        {samples.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No samples yet</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Upload your first content sample to start building your voice
              profile
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {samples.map((sample) => (
              <div
                key={sample.id}
                className={`border rounded-lg p-4 transition-all ${
                  sample.is_active
                    ? "border-primary/20 bg-primary/5"
                    : "border-border bg-muted/30"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge
                        variant={sample.is_active ? "default" : "secondary"}
                      >
                        {getSampleTypeLabel(sample.sample_type)}
                      </Badge>
                      <Badge variant="outline">{sample.word_count} words</Badge>
                      {sample.is_active && (
                        <Badge
                          variant="outline"
                          className="border-green-600 text-green-600"
                        >
                          Active
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {sample.sample_text.substring(0, 200)}...
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Uploaded {formatDate(sample.created_at)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        toggleSampleActive(sample.id, sample.is_active)
                      }
                      disabled={updatingSampleId === sample.id}
                    >
                      {updatingSampleId === sample.id ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : sample.is_active ? (
                        <Eye className="h-4 w-4" />
                      ) : (
                        <EyeOff className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteSample(sample.id)}
                      disabled={deletingSampleId === sample.id}
                    >
                      {deletingSampleId === sample.id ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 text-destructive" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Sample Limit Warning */}
        {samples.length >= 10 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You've reached the maximum of 10 samples. Delete a sample to
              upload a new one.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
