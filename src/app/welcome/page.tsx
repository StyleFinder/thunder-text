/* eslint-disable @next/next/no-img-element -- Using img for external platform logos */
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CheckCircle2,
  FileText,
  Target,
  ArrowRight,
  Store,
  ChevronLeft,
  ExternalLink,
  Check,
  Phone,
  MapPin,
  Building2,
  Calendar,
  BarChart3,
  Gift,
  User,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { logger } from "@/lib/logger";

type OnboardingStep = "welcome" | "shopify" | "social" | "complete";

interface ConnectionStatus {
  shopify: boolean;
  shopifyDomain?: string;
  facebook: boolean;
  google: boolean;
  pinterest: boolean;
  tiktok: boolean;
}

interface StoreProfile {
  storeName: string;
  ownerName: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  storeType: "online" | "brick-and-mortar" | "both" | "";
  yearsInBusiness: string;
}

// Check if we're in development mode (localhost or ngrok)
const _isDevelopment = () => {
  if (typeof window === "undefined") return false;
  const hostname = window.location.hostname;
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.includes("ngrok")
  );
};

// Animated background gradient mesh
function GradientMesh() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Base gradient - using inline styles for reliable dark colors */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(135deg, #001429 0%, #002952 40%, #003d7a 100%)",
        }}
      />

      {/* Animated orbs */}
      <div
        className="absolute w-[800px] h-[800px] rounded-full blur-3xl animate-welcome-float-slow"
        style={{
          background:
            "radial-gradient(circle, rgba(0,102,204,0.4) 0%, transparent 70%)",
          top: "-20%",
          right: "-10%",
          opacity: 0.6,
        }}
      />
      <div
        className="absolute w-[600px] h-[600px] rounded-full blur-3xl animate-welcome-float-slower"
        style={{
          background:
            "radial-gradient(circle, rgba(0,153,255,0.3) 0%, transparent 70%)",
          bottom: "-10%",
          left: "-5%",
          opacity: 0.5,
        }}
      />
      <div
        className="absolute w-[400px] h-[400px] rounded-full blur-2xl animate-welcome-float"
        style={{
          background:
            "radial-gradient(circle, rgba(0,102,204,0.5) 0%, transparent 70%)",
          top: "40%",
          left: "30%",
          opacity: 0.4,
        }}
      />

      {/* Subtle noise texture overlay */}
      <div
        className="absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
}

// Vertical step indicator
function StepIndicator({
  currentStep,
  steps,
}: {
  currentStep: OnboardingStep;
  steps: { id: OnboardingStep; label: string }[];
}) {
  const currentIndex = steps.findIndex((s) => s.id === currentStep);

  return (
    <div className="flex flex-col gap-1">
      {steps.map((step, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = step.id === currentStep;

        return (
          <div key={step.id} className="flex items-center gap-3">
            {/* Step circle */}
            <div
              className={`
                relative w-10 h-10 rounded-full flex items-center justify-center
                transition-all duration-500 ease-out
                ${
                  isCompleted
                    ? "text-gray-900"
                    : isCurrent
                      ? "text-gray-900 ring-4 ring-white/30"
                      : "text-white/50"
                }
              `}
              style={{
                backgroundColor: isCompleted
                  ? "#ffcc00"
                  : isCurrent
                    ? "#ffffff"
                    : "rgba(255,255,255,0.15)",
              }}
            >
              {isCompleted ? (
                <Check className="w-5 h-5" strokeWidth={3} />
              ) : (
                <span className="text-sm font-bold">{index + 1}</span>
              )}

              {/* Pulse animation for current step */}
              {isCurrent && (
                <div className="absolute inset-0 rounded-full bg-white/20 animate-ping" />
              )}
            </div>

            {/* Step label */}
            <span
              className="text-sm font-medium transition-colors duration-300"
              style={{
                color: isCurrent
                  ? "#ffffff"
                  : isCompleted
                    ? "rgba(255,255,255,0.85)"
                    : "rgba(255,255,255,0.45)",
              }}
            >
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// Feature card with hover effects
function FeatureCard({
  icon: Icon,
  title,
  description,
  delay = 0,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  delay?: number;
}) {
  return (
    <div
      className="group relative p-5 rounded-xl bg-white border border-gray-200 shadow-sm
                 hover:shadow-md hover:border-gray-300 transition-all duration-300 cursor-default
                 animate-welcome-fade-in-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="relative">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center mb-3
                      group-hover:scale-105 transition-transform duration-300"
          style={{
            background: "linear-gradient(135deg, #0066cc 0%, #0099ff 100%)",
          }}
        >
          <Icon className="w-5 h-5 text-white" />
        </div>
        <h3 className="text-base font-semibold text-gray-900 mb-1">{title}</h3>
        <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

// Platform connection card
function PlatformCard({
  logo,
  name,
  description,
  connected,
  comingSoon,
  onConnect,
  onSelect,
}: {
  logo: string;
  name: string;
  description: string;
  connected?: boolean;
  comingSoon?: boolean;
  onConnect?: () => void;
  onSelect?: () => void;
}) {
  return (
    <div
      className={`
        group relative p-5 rounded-2xl border transition-all duration-300
        ${
          comingSoon
            ? "bg-gray-50 border-gray-200 opacity-60 cursor-not-allowed"
            : connected
              ? "bg-emerald-50 border-emerald-200"
              : "bg-white border-gray-200 hover:border-smart-300 hover:shadow-lg hover:shadow-smart-500/10 cursor-pointer"
        }
      `}
      onClick={() => !comingSoon && !connected && (onSelect || onConnect)?.()}
    >
      {/* Hover lift effect */}
      {!comingSoon && !connected && (
        <div
          className="absolute inset-0 rounded-2xl bg-gradient-to-b from-smart-500/5 to-transparent
                        opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        />
      )}

      <div className="relative flex items-center gap-4">
        <div
          className="w-14 h-14 rounded-xl bg-white border border-gray-100
                        flex items-center justify-center overflow-hidden
                        group-hover:scale-105 transition-transform duration-300"
        >
          <img src={logo} alt={name} className="w-10 h-10 object-contain" />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900">{name}</h3>
          <p className="text-sm text-gray-500 truncate">{description}</p>
        </div>

        {connected ? (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-100">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="text-sm font-medium text-emerald-700">
              Connected
            </span>
          </div>
        ) : comingSoon ? (
          <span className="text-xs font-medium text-gray-400 bg-gray-100 px-3 py-1.5 rounded-full">
            Coming Soon
          </span>
        ) : (
          <ArrowRight
            className="w-5 h-5 text-gray-300 group-hover:text-smart-500
                                 group-hover:translate-x-1 transition-all duration-300"
          />
        )}
      </div>
    </div>
  );
}

// Celebration particles
function CelebrationParticles() {
  const particles = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 2,
    duration: 2 + Math.random() * 2,
    size: 4 + Math.random() * 8,
    color: ["#ffcc00", "#0099ff", "#0066cc", "#ff6b6b", "#4ade80"][
      Math.floor(Math.random() * 5)
    ],
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full animate-welcome-confetti"
          style={{
            left: `${p.x}%`,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </div>
  );
}

export default function WelcomePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status: sessionStatus } = useSession();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>("welcome");
  const [selectedPlatform, setSelectedPlatform] = useState<
    "shopify" | "lightspeed" | "commentsold" | null
  >(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [connections, setConnections] = useState<ConnectionStatus>({
    shopify: false,
    facebook: false,
    google: false,
    pinterest: false,
    tiktok: false,
  });
  const [storeProfile, setStoreProfile] = useState<StoreProfile>({
    storeName: "",
    ownerName: "",
    email: "",
    phone: "",
    city: "",
    state: "",
    storeType: "",
    yearsInBusiness: "",
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  // Dev mode: shop domain input for traditional OAuth flow
  const [_devShopDomain, _setDevShopDomain] = useState(
    "zunosai-staging-test-store",
  );

  const steps: { id: OnboardingStep; label: string }[] = [
    { id: "welcome", label: "Welcome" },
    { id: "shopify", label: "Connect Store" },
    { id: "social", label: "Ad Platforms" },
    { id: "complete", label: "Ready!" },
  ];

  const checkExistingConnections = useCallback(async () => {
    try {
      const shop = searchParams.get("shop");
      if (!shop) return;

      const response = await fetch(`/api/settings/connections?shop=${shop}`);
      if (response.ok) {
        const data = await response.json();
        const newConnections: ConnectionStatus = {
          shopify: false,
          facebook: false,
          google: false,
          pinterest: false,
          tiktok: false,
        };

        data.connections?.forEach(
          (conn: {
            provider: string;
            connected: boolean;
            metadata?: { shop_domain?: string };
          }) => {
            if (conn.provider === "shopify" && conn.connected) {
              newConnections.shopify = true;
              newConnections.shopifyDomain = conn.metadata?.shop_domain;
            }
            if (conn.provider === "facebook" && conn.connected)
              newConnections.facebook = true;
            if (conn.provider === "google" && conn.connected)
              newConnections.google = true;
            if (conn.provider === "pinterest" && conn.connected)
              newConnections.pinterest = true;
            if (conn.provider === "tiktok" && conn.connected)
              newConnections.tiktok = true;
          },
        );

        setConnections(newConnections);
        if (newConnections.shopify) setCurrentStep("social");
      }
    } catch (error) {
      logger.error("Error checking connections:", error as Error, {
        component: "welcome",
      });
    }
  }, [searchParams]);

  useEffect(() => {
    const stepParam = searchParams.get("step");
    if (
      stepParam &&
      ["welcome", "shopify", "social", "complete"].includes(stepParam)
    ) {
      setCurrentStep(stepParam as OnboardingStep);
    }
    const facebookConnected = searchParams.get("facebook_connected");
    if (facebookConnected === "true") checkExistingConnections();
  }, [searchParams, checkExistingConnections]);

  useEffect(() => {
    checkExistingConnections();
  }, [checkExistingConnections]);

  // Fetch user email and existing profile data
  useEffect(() => {
    const fetchUserProfile = async () => {
      const shop = searchParams.get("shop");

      // Try to fetch by shop param first, then by user ID from session
      let apiUrl = "";
      if (shop) {
        apiUrl = `/api/shop/profile?shop=${shop}`;
      } else if (session?.user?.id) {
        apiUrl = `/api/shop/profile?userId=${session.user.id}`;
      } else if (session?.user?.email) {
        // Fallback: set email from session even if we can't fetch profile
        setStoreProfile((prev) => ({
          ...prev,
          email: session.user.email || "",
        }));
        return;
      } else {
        return;
      }

      try {
        const response = await fetch(apiUrl);
        if (response.ok) {
          const data = await response.json();
          if (data.shop) {
            setStoreProfile((prev) => ({
              ...prev,
              storeName: data.shop.store_name || data.shop.display_name || "",
              ownerName: data.shop.owner_name || "",
              email: data.shop.email || "",
              phone: data.shop.owner_phone || "",
              city: data.shop.city || "",
              state: data.shop.state || "",
              storeType: data.shop.store_type || "",
              yearsInBusiness: data.shop.years_in_business?.toString() || "",
            }));
          }
        } else if (session?.user?.email) {
          // If API fails but we have session email, use that
          setStoreProfile((prev) => ({
            ...prev,
            email: session.user.email || "",
          }));
        }
      } catch (error) {
        logger.error("Error fetching user profile:", error as Error, {
          component: "welcome",
        });
        // Fallback to session email on error
        if (session?.user?.email) {
          setStoreProfile((prev) => ({
            ...prev,
            email: session.user.email || "",
          }));
        }
      }
    };

    fetchUserProfile();
  }, [searchParams, session]);

  const saveStoreProfile = async (): Promise<boolean> => {
    const shop = searchParams.get("shop");
    const userId = session?.user?.id;

    // CRITICAL: Log the save attempt for debugging
    logger.info("[Welcome] saveStoreProfile called", {
      component: "welcome",
      hasShop: !!shop,
      hasUserId: !!userId,
      userId: userId || "NONE",
      sessionStatus,
      storeName: storeProfile.storeName,
      ownerName: storeProfile.ownerName,
    });

    // Need either shop or userId to save
    if (!shop && !userId) {
      logger.error(
        "[Welcome] CRITICAL: No shop or userId available to save profile",
        undefined,
        {
          component: "welcome",
          sessionStatus,
          sessionUser: session?.user ? "exists" : "missing",
        },
      );
      // DON'T silently continue - show error to user
      alert("Unable to save your profile. Please try logging in again.");
      return false;
    }

    setIsSavingProfile(true);
    try {
      const response = await fetch("/api/shop/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shop: shop || undefined,
          userId: !shop ? userId : undefined,
          store_name: storeProfile.storeName,
          owner_name: storeProfile.ownerName,
          owner_phone: storeProfile.phone,
          city: storeProfile.city,
          state: storeProfile.state,
          store_type: storeProfile.storeType || null,
          years_in_business: storeProfile.yearsInBusiness
            ? parseInt(storeProfile.yearsInBusiness)
            : null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        logger.error("[Welcome] Failed to save store profile", undefined, {
          component: "welcome",
          status: response.status,
          error: errorData.error,
          shop,
          userId,
        });
        alert("Failed to save your profile. Please try again.");
        return false;
      }

      logger.info("[Welcome] Store profile saved successfully", {
        component: "welcome",
        shop,
        userId,
      });
      return true;
    } catch (error) {
      logger.error("[Welcome] Error saving store profile:", error as Error, {
        component: "welcome",
      });
      alert("An error occurred while saving your profile. Please try again.");
      return false;
    } finally {
      setIsSavingProfile(false);
    }
  };

  const transitionTo = (step: OnboardingStep) => {
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentStep(step);
      setIsTransitioning(false);
    }, 300);
  };

  const handleConnectFacebook = () => {
    const shop = searchParams.get("shop");
    if (!shop) {
      logger.error("Missing shop parameter for Facebook OAuth", undefined, {
        component: "welcome",
      });
      alert(
        "Unable to connect Facebook. Please reconnect your Shopify store first.",
      );
      return;
    }
    sessionStorage.setItem("onboarding_return", "complete");
    window.location.href = `/api/facebook/oauth/authorize?shop=${shop}&return_to=welcome`;
  };

  const handleConnectGoogle = () => {
    const shop = searchParams.get("shop");
    if (shop) {
      window.location.href = `/api/google/oauth/authorize?shop=${shop}&return_to=/welcome`;
    }
  };

  const handleGoToDashboard = async () => {
    const shop = searchParams.get("shop");

    // Always mark onboarding as complete - API uses NextAuth session if no shop param
    try {
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };
      // Add shop token if available (for Shopify app context)
      if (shop) {
        headers.Authorization = `Bearer ${shop}`;
      }
      await fetch("/api/onboarding/complete", {
        method: "POST",
        headers,
        credentials: "include", // Include session cookies
      });
    } catch (error) {
      console.error("[Welcome] Error marking onboarding complete:", error);
    }

    // Redirect to dashboard with shop param if available
    router.push(shop ? `/dashboard?shop=${shop}` : "/dashboard");
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding & Progress */}
      <div className="hidden lg:flex lg:w-[280px] xl:w-[320px] relative flex-col p-8">
        <GradientMesh />

        {/* Logo & Brand */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: "#000000" }}
            >
              <BarChart3 className="w-6 h-6" style={{ color: "#ffffff" }} />
            </div>
            <span className="text-xl font-bold" style={{ color: "#ffffff" }}>
              BoutiqueHub Black
            </span>
          </div>
          <p
            className="text-sm ml-[52px]"
            style={{ color: "rgba(255,255,255,0.7)" }}
          >
            Powered by Thunder Text
          </p>
        </div>

        {/* Step Indicator */}
        <div className="relative z-10 mt-12">
          <StepIndicator currentStep={currentStep} steps={steps} />
        </div>
      </div>

      {/* Right Panel - Content */}
      <div className="flex-1 bg-gray-50 flex flex-col">
        {/* Mobile Header */}
        <div
          className="lg:hidden px-6 py-4 flex items-center gap-3"
          style={{ backgroundColor: "#002952" }}
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: "#000000" }}
          >
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold text-white">
            BoutiqueHub Black
          </span>
        </div>

        {/* Content Area */}
        <div
          className={`flex-1 flex items-center justify-center p-6 lg:p-12 transition-opacity duration-300 ${isTransitioning ? "opacity-0" : "opacity-100"}`}
        >
          <div className="w-full max-w-xl">
            {/* Step 1: Welcome */}
            {currentStep === "welcome" && (
              <div className="animate-welcome-fade-in-up">
                {/* BHB Badge - Primary */}
                <div
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-4"
                  style={{ backgroundColor: "#000000", color: "#ffffff" }}
                >
                  <BarChart3 className="w-4 h-4" />
                  BoutiqueHub Black Member
                </div>

                <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-3">
                  Welcome to BoutiqueHub Black
                </h1>
                <p className="text-gray-600 mb-2">
                  Connect your store and ad accounts to power your BHB coaching
                  dashboard.
                </p>

                {/* Thunder Text Trial Badge - Secondary */}
                <div
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-6"
                  style={{ backgroundColor: "#dbeafe", color: "#1e40af" }}
                >
                  <Gift className="w-3.5 h-3.5" />
                  Plus: Free Thunder Text trial included — no credit card
                  required
                </div>

                {/* Feature Cards - 3 items: BHB Dashboard, Thunder Text, ACE */}
                <div className="grid md:grid-cols-3 gap-3 mb-8">
                  <FeatureCard
                    icon={BarChart3}
                    title="BHB Dashboard"
                    description="Store insights for your coach"
                    delay={100}
                  />
                  <FeatureCard
                    icon={FileText}
                    title="Thunder Text"
                    description="AI product descriptions"
                    delay={200}
                  />
                  <FeatureCard
                    icon={Target}
                    title="ACE Engine"
                    description="AI-powered ad copy"
                    delay={300}
                  />
                </div>

                {/* Store Profile Form */}
                <div className="space-y-4 mb-8">
                  {/* Store Name */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="store-name"
                      className="text-gray-700 font-medium flex items-center gap-2"
                    >
                      <Store className="w-4 h-4 text-gray-400" />
                      Store Name *
                    </Label>
                    <Input
                      id="store-name"
                      type="text"
                      placeholder="Your Store Name"
                      value={storeProfile.storeName}
                      onChange={(e) =>
                        setStoreProfile((prev) => ({
                          ...prev,
                          storeName: e.target.value,
                        }))
                      }
                      className="h-11"
                    />
                  </div>

                  {/* Owner Name */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="owner-name"
                      className="text-gray-700 font-medium flex items-center gap-2"
                    >
                      <User className="w-4 h-4 text-gray-400" />
                      Your Name *
                    </Label>
                    <Input
                      id="owner-name"
                      type="text"
                      placeholder="Jane Smith"
                      value={storeProfile.ownerName}
                      onChange={(e) =>
                        setStoreProfile((prev) => ({
                          ...prev,
                          ownerName: e.target.value,
                        }))
                      }
                      className="h-11"
                    />
                  </div>

                  {/* Email (read-only, auto-filled) */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="email"
                      className="text-gray-700 font-medium"
                    >
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={storeProfile.email}
                      disabled
                      className="h-11 bg-gray-50 text-gray-500"
                    />
                  </div>

                  {/* Phone */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="phone"
                      className="text-gray-700 font-medium flex items-center gap-2"
                    >
                      <Phone className="w-4 h-4 text-gray-400" />
                      Phone Number
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="(555) 555-5555"
                      value={storeProfile.phone}
                      onChange={(e) =>
                        setStoreProfile((prev) => ({
                          ...prev,
                          phone: e.target.value,
                        }))
                      }
                      className="h-11"
                    />
                  </div>

                  {/* City & State */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label
                        htmlFor="city"
                        className="text-gray-700 font-medium flex items-center gap-2"
                      >
                        <MapPin className="w-4 h-4 text-gray-400" />
                        City
                      </Label>
                      <Input
                        id="city"
                        type="text"
                        placeholder="New York"
                        value={storeProfile.city}
                        onChange={(e) =>
                          setStoreProfile((prev) => ({
                            ...prev,
                            city: e.target.value,
                          }))
                        }
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="state"
                        className="text-gray-700 font-medium"
                      >
                        State
                      </Label>
                      <Input
                        id="state"
                        type="text"
                        placeholder="NY"
                        value={storeProfile.state}
                        onChange={(e) =>
                          setStoreProfile((prev) => ({
                            ...prev,
                            state: e.target.value,
                          }))
                        }
                        className="h-11"
                      />
                    </div>
                  </div>

                  {/* Store Type */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="store-type"
                      className="text-gray-700 font-medium flex items-center gap-2"
                    >
                      <Building2 className="w-4 h-4 text-gray-400" />
                      Business Type
                    </Label>
                    <Select
                      value={storeProfile.storeType}
                      onValueChange={(value) =>
                        setStoreProfile((prev) => ({
                          ...prev,
                          storeType: value as StoreProfile["storeType"],
                        }))
                      }
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select business type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="online">Online Only</SelectItem>
                        <SelectItem value="brick-and-mortar">
                          Brick & Mortar Only
                        </SelectItem>
                        <SelectItem value="both">
                          Both Online & Brick & Mortar
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Years in Business */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="years"
                      className="text-gray-700 font-medium flex items-center gap-2"
                    >
                      <Calendar className="w-4 h-4 text-gray-400" />
                      Years in Business
                    </Label>
                    <Select
                      value={storeProfile.yearsInBusiness}
                      onValueChange={(value) =>
                        setStoreProfile((prev) => ({
                          ...prev,
                          yearsInBusiness: value,
                        }))
                      }
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select years in business" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Less than 1 year</SelectItem>
                        <SelectItem value="1">1 year</SelectItem>
                        <SelectItem value="2">2 years</SelectItem>
                        <SelectItem value="3">3 years</SelectItem>
                        <SelectItem value="4">4 years</SelectItem>
                        <SelectItem value="5">5+ years</SelectItem>
                        <SelectItem value="10">10+ years</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button
                  size="lg"
                  className="w-full h-14 text-base font-semibold text-white transition-all duration-300"
                  style={{
                    background:
                      "linear-gradient(135deg, #0066cc 0%, #0052a3 100%)",
                    boxShadow: "0 4px 14px 0 rgba(0,102,204,0.3)",
                  }}
                  disabled={
                    isSavingProfile ||
                    !storeProfile.storeName ||
                    !storeProfile.ownerName ||
                    sessionStatus === "loading"
                  }
                  onClick={async () => {
                    const saved = await saveStoreProfile();
                    if (saved) {
                      transitionTo("shopify");
                    }
                    // If save failed, error was already shown to user
                  }}
                >
                  {sessionStatus === "loading" ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                      Loading...
                    </>
                  ) : isSavingProfile ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                      Saving...
                    </>
                  ) : (
                    <>
                      Continue
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Step 2: Connect Store */}
            {currentStep === "shopify" && (
              <div className="animate-welcome-fade-in-up">
                {!selectedPlatform ? (
                  <>
                    <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-3">
                      Connect Your Store
                    </h1>
                    <p className="text-gray-600 mb-8">
                      Select your e-commerce platform to sync your products
                    </p>

                    <div className="space-y-3">
                      <PlatformCard
                        logo="/shopify-logo.png"
                        name="Shopify"
                        description="Most popular e-commerce platform"
                        onSelect={() => setSelectedPlatform("shopify")}
                      />
                      <PlatformCard
                        logo="/lightspeed-logo.png"
                        name="Lightspeed"
                        description="Point of sale & e-commerce"
                        comingSoon
                      />
                      <PlatformCard
                        logo="/commentsold-logo.png"
                        name="CommentSold"
                        description="Live selling & social commerce"
                        comingSoon
                      />
                    </div>
                  </>
                ) : selectedPlatform === "shopify" ? (
                  <>
                    <button
                      onClick={() => setSelectedPlatform(null)}
                      className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6 transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span className="text-sm font-medium">
                        Back to platforms
                      </span>
                    </button>

                    <div className="flex items-center gap-4 mb-8">
                      <div
                        className="w-14 h-14 rounded-2xl bg-[#96bf48]/10 border border-[#96bf48]/20
                                        flex items-center justify-center"
                      >
                        <img
                          src="/shopify-logo.png"
                          alt="Shopify"
                          className="w-10 h-10"
                        />
                      </div>
                      <div>
                        <h1 className="text-2xl font-bold text-gray-900">
                          Connect Shopify
                        </h1>
                        <p className="text-gray-500">
                          Install from the Shopify App Store
                        </p>
                      </div>
                    </div>

                    <div className="space-y-6">
                      {/* Shopify Hosted Install Flow - Complies with Shopify Requirement 2.3.1 */}
                      {/* No manual myshopify.com URL entry - installation must come from Shopify surfaces */}
                      <div className="p-6 rounded-xl bg-gradient-to-br from-[#96bf48]/10 to-[#96bf48]/5 border border-[#96bf48]/20">
                        <p className="text-gray-700 mb-4">
                          To connect your Shopify store, install Thunder Text
                          directly from Shopify. This ensures a secure
                          connection to your store.
                        </p>
                        <Button
                          className="w-full h-12 text-base font-semibold bg-[#008060] hover:bg-[#006e52]"
                          onClick={() => {
                            // Use Shopify's hosted OAuth install flow
                            // This complies with requirement 2.3.1 - no manual myshopify.com URL entry
                            // Uses environment-based client_id (dev or prod)
                            const clientId =
                              process.env.NEXT_PUBLIC_SHOPIFY_API_KEY ||
                              "613bffa12a51873c2739ae67163a72e2";
                            window.location.href = `https://admin.shopify.com/oauth/install?client_id=${clientId}`;
                          }}
                        >
                          <img
                            src="/shopify-logo.png"
                            alt=""
                            className="w-5 h-5 mr-2"
                          />
                          Install from Shopify
                          <ExternalLink className="w-4 h-4 ml-2" />
                        </Button>
                      </div>

                      <div className="text-center text-sm text-gray-500">
                        <p>
                          Already installed? The app will appear in your Shopify
                          admin.
                        </p>
                      </div>

                      {/* What we access */}
                      <div className="p-5 rounded-xl bg-gray-100/50 border border-gray-200/50">
                        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <Store className="w-4 h-4 text-smart-500" />
                          What we&apos;ll access
                        </h4>
                        <ul className="space-y-2.5">
                          {[
                            "Your product catalog and images",
                            "Product descriptions and metadata",
                            "Store analytics for your BHB Coach",
                          ].map((item, i) => (
                            <li
                              key={i}
                              className="flex items-start gap-2.5 text-sm text-gray-600"
                            >
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                      <img
                        src={
                          selectedPlatform === "lightspeed"
                            ? "/lightspeed-logo.png"
                            : "/commentsold-logo.png"
                        }
                        alt={selectedPlatform}
                        className="w-10 h-10"
                      />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">
                      {selectedPlatform === "lightspeed"
                        ? "Lightspeed"
                        : "CommentSold"}{" "}
                      Coming Soon
                    </h2>
                    <p className="text-gray-500 mb-6">
                      We&apos;re working hard to bring this integration to you.
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => setSelectedPlatform(null)}
                    >
                      <ChevronLeft className="w-4 h-4 mr-2" />
                      Choose Another Platform
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Social Platforms */}
            {currentStep === "social" && (
              <div className="animate-welcome-fade-in-up">
                <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-3">
                  Connect Ad Platforms
                </h1>
                <p className="text-gray-600 mb-8">
                  Optional: Connect platforms to publish ads directly with ACE
                </p>

                <div className="space-y-3 mb-8">
                  <PlatformCard
                    logo="/shopify-logo.png"
                    name="Shopify"
                    description={
                      connections.shopifyDomain || "E-commerce platform"
                    }
                    connected={connections.shopify}
                  />
                  <PlatformCard
                    logo="/meta-logo.png"
                    name="Meta Ads"
                    description="Facebook & Instagram campaigns"
                    connected={connections.facebook}
                    onConnect={handleConnectFacebook}
                  />
                  <PlatformCard
                    logo="/google-ads-logo.png"
                    name="Google Ads"
                    description="Search & Display campaigns"
                    connected={connections.google}
                    onConnect={handleConnectGoogle}
                  />
                  <PlatformCard
                    logo="/tiktok-ads-logo.png"
                    name="TikTok Ads"
                    description="Short-form video campaigns"
                    comingSoon
                  />
                  <PlatformCard
                    logo="/pinterest-ads-logo.png"
                    name="Pinterest Ads"
                    description="Visual discovery campaigns"
                    comingSoon
                  />
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1 h-12"
                    onClick={() => transitionTo("complete")}
                  >
                    Skip for Now
                  </Button>
                  <Button
                    className="flex-1 h-12"
                    onClick={() => transitionTo("complete")}
                  >
                    Done Connecting
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: Complete */}
            {currentStep === "complete" && (
              <div className="text-center animate-welcome-fade-in-up relative">
                <CelebrationParticles />

                {/* Success Icon */}
                <div className="relative w-24 h-24 mx-auto mb-6">
                  <div
                    className="absolute inset-0 rounded-full animate-pulse opacity-20"
                    style={{
                      background:
                        "linear-gradient(135deg, #ffcc00 0%, #e6b800 100%)",
                    }}
                  />
                  <div
                    className="relative w-full h-full rounded-full flex items-center justify-center"
                    style={{
                      background:
                        "linear-gradient(135deg, #ffcc00 0%, #e6b800 100%)",
                      boxShadow: "0 8px 24px rgba(255,204,0,0.3)",
                    }}
                  >
                    <Check className="w-12 h-12 text-white" strokeWidth={3} />
                  </div>
                </div>

                <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-3">
                  You&apos;re All Set!
                </h1>
                <p className="text-lg text-gray-600 mb-8">
                  Your free trial plan is now active
                </p>

                {/* What's Included */}
                <div className="text-left p-6 rounded-2xl bg-white border border-gray-200 shadow-sm mb-8">
                  <h3 className="font-semibold text-gray-900 mb-4">
                    What&apos;s included in your trial:
                  </h3>
                  <ul className="space-y-3">
                    {[
                      "Engaging AI product descriptions",
                      "AI-powered ad copy generation",
                      "Brand voice training & best practices",
                      "Full access to all features",
                    ].map((item, i) => (
                      <li
                        key={i}
                        className="flex items-center gap-3 text-gray-700"
                      >
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: "#dbeafe" }}
                        >
                          <Check
                            className="w-4 h-4"
                            style={{ color: "#0066cc" }}
                          />
                        </div>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <Button
                  size="lg"
                  className="w-full h-14 text-base font-semibold text-white transition-all duration-300"
                  style={{
                    background:
                      "linear-gradient(135deg, #0066cc 0%, #0052a3 100%)",
                    boxShadow: "0 4px 14px 0 rgba(0,102,204,0.3)",
                  }}
                  onClick={handleGoToDashboard}
                >
                  Go to Dashboard
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
