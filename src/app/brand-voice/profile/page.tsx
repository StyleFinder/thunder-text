"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, AlertCircle, ArrowLeft } from "lucide-react";
import type { BusinessProfile } from "@/types/business-profile";
import { logger } from "@/lib/logger";

interface MasterProfile {
  profileSummary: string;
  marketResearch: string;
  idealCustomerAvatar: string;
  painPointStrategy: string;
  missionVisionValues: string;
  positioningStatement: string;
  aiEngineInstructions: string;
}

export default function FullProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [masterProfile, setMasterProfile] = useState<MasterProfile | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState("summary");
  const [shopDomain, setShopDomain] = useState<string | null>(null);

  // Get shop domain
  useEffect(() => {
    const initShop = async () => {
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        const shop = params.get("shop");
        if (shop) {
          setShopDomain(shop);
          return;
        }
      }
      try {
        const res = await fetch("/api/shop/me");
        if (res.ok) {
          const data = await res.json();
          if (data.domain) {
            setShopDomain(data.domain);
          }
        }
      } catch (e) {
        logger.error("Failed to fetch shop:", e as Error, {
          component: "profile",
        });
      }
    };
    initShop();
  }, []);

  // Load profile
  useEffect(() => {
    if (!shopDomain) return;

    const loadProfile = async () => {
      try {
        const response = await fetch("/api/business-profile", {
          headers: {
            Authorization: `Bearer ${shopDomain}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data.profile) {
            setProfile(data.data.profile);

            // Parse master profile JSON
            if (data.data.profile.master_profile_text) {
              try {
                const parsed = JSON.parse(
                  data.data.profile.master_profile_text,
                );
                setMasterProfile(parsed);
              } catch {
                // If not JSON, use individual fields
                setMasterProfile({
                  profileSummary: data.data.profile.profile_summary || "",
                  marketResearch: data.data.profile.market_research || "",
                  idealCustomerAvatar:
                    data.data.profile.ideal_customer_avatar || "",
                  painPointStrategy:
                    data.data.profile.pain_point_strategy || "",
                  missionVisionValues:
                    data.data.profile.mission_vision_values || "",
                  positioningStatement:
                    data.data.profile.positioning_statement || "",
                  aiEngineInstructions:
                    data.data.profile.ai_engine_instructions || "",
                });
              }
            }
          }
        } else {
          setError("Failed to load profile");
        }
      } catch (err) {
        logger.error("Error loading profile:", err as Error, {
          component: "profile",
        });
        setError("Failed to load profile");
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [shopDomain]);

  const tabs = [
    { id: "summary", label: "Executive Summary" },
    { id: "market", label: "Market Research" },
    { id: "customer", label: "Ideal Customer" },
    { id: "pain-points", label: "Pain Points" },
    { id: "mission", label: "Mission & Values" },
    { id: "positioning", label: "Positioning" },
    { id: "ai-instructions", label: "AI Instructions" },
  ];

  const getTabContent = () => {
    if (!masterProfile) return "";

    switch (selectedTab) {
      case "summary":
        return masterProfile.profileSummary;
      case "market":
        return masterProfile.marketResearch;
      case "customer":
        return masterProfile.idealCustomerAvatar;
      case "pain-points":
        return masterProfile.painPointStrategy;
      case "mission":
        return masterProfile.missionVisionValues;
      case "positioning":
        return masterProfile.positioningStatement;
      case "ai-instructions":
        return masterProfile.aiEngineInstructions;
      default:
        return masterProfile.profileSummary;
    }
  };

  const MarkdownContent = ({ content }: { content: string }) => (
    <div className="prose prose-sm max-w-none">
      <ReactMarkdown
        components={{
          strong: ({ children }) => (
            <strong className="font-semibold">{children}</strong>
          ),
          p: ({ children }) => <p className="mb-4">{children}</p>,
          h1: ({ children }) => (
            <h1 className="text-2xl font-bold mb-4 mt-6">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-semibold mb-3 mt-5">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-semibold mb-2.5 mt-4">{children}</h3>
          ),
          ol: ({ children }) => (
            <ol className="pl-6 mb-4 list-decimal">{children}</ol>
          ),
          ul: ({ children }) => (
            <ul className="pl-6 mb-4 list-disc">{children}</ul>
          ),
          li: ({ children }) => <li className="mb-2">{children}</li>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );

  if (loading) {
    return (
      <div className="w-full">
        <Card>
          <CardContent className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !profile || !masterProfile) {
    return (
      <div className="w-full">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Profile Not Found</AlertTitle>
          <AlertDescription>
            {error ||
              "No business profile found. Please complete the interview first."}
          </AlertDescription>
        </Alert>
        <Button onClick={() => router.push("/brand-voice")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Interview
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Your Business Profile
          </h1>
          <p className="text-muted-foreground">
            Version {profile.profile_version} • Generated{" "}
            {new Date(profile.profile_generated_at || "").toLocaleDateString()}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push("/brand-voice")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button onClick={() => router.push("/brand-voice")}>
            Brand Voice
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push("/brand-voice/edit")}
          >
            Edit Answers
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="w-full justify-start overflow-x-auto flex-wrap h-auto">
              {tabs.map((tab) => (
                <TabsTrigger key={tab.id} value={tab.id}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
            <div className="mt-6 min-h-[400px]">
              <MarkdownContent content={getTabContent()} />
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
