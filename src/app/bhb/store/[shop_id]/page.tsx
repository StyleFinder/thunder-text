"use client";

import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState, useRef } from "react";
import {
  Loader2,
  ArrowLeft,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Store,
  ShoppingBag,
  Target,
  Pencil,
  X,
  Check,
  Plus,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  DollarSign,
  Package,
  Tag,
  MessageSquare,
  UserCog,
  ChevronDown,
  Building2,
} from "lucide-react";
import Link from "next/link";
import { BHBLayout } from "@/components/bhb";
import {
  getMockStoreDashboard,
  type StoreDashboardData,
} from "@/lib/mock-data/store-dashboard-mock";
import { logger } from "@/lib/logger";

// Real campaign data from Facebook API
interface RealCampaign {
  id: string;
  name: string;
  status: string;
  objective?: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  purchases: number;
  purchase_value: number;
  roas: number;
  conversion_rate: number;
  platform: "meta" | "google" | "tiktok" | "pinterest";
}

interface CampaignsApiResponse {
  success: boolean;
  facebook_connected: boolean;
  ad_accounts?: Array<{ id: string; name: string }>;
  selected_ad_account?: { id: string; name: string };
  campaigns: RealCampaign[];
  data_period?: string;
  message?: string;
  error?: string;
}

interface Coach {
  id: string;
  name: string;
  email: string;
  is_active: boolean;
}

interface ShopProfile {
  id: string;
  shop_domain: string;
  display_name: string | null;
  email: string | null;
  owner_name: string | null;
  owner_phone: string | null;
  industry_niche: string | null;
  years_in_business: number | null;
  city: string | null;
  state: string | null;
  store_type: "online" | "brick-and-mortar" | "both" | null;
  ecommerce_platform: "shopify" | "lightspeed" | "commentsold" | null;
  advertising_goals: string | null;
  coach_assigned: string | null;
}

interface ProfileFormData {
  owner_name: string;
  owner_phone: string;
  industry_niche: string;
  years_in_business: string;
  city: string;
  state: string;
  store_type: string;
  ecommerce_platform: string;
}

export default function StoreDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const shopId = params.shop_id as string;

  const [storeData, setStoreData] = useState<StoreDashboardData | null>(null);
  const [shopProfile, setShopProfile] = useState<ShopProfile | null>(null);
  const [realCampaigns, setRealCampaigns] = useState<RealCampaign[]>([]);
  const [facebookConnected, setFacebookConnected] = useState(false);
  const [selectedAdAccount, setSelectedAdAccount] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [timePeriod, setTimePeriod] = useState<"7" | "30" | "60" | "90">("30");
  const [advertisingGoals, setAdvertisingGoals] = useState("");
  const [isEditingGoals, setIsEditingGoals] = useState(false);
  const [isSavingGoals, setIsSavingGoals] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState("");
  const [showAddNote, setShowAddNote] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const campaignsPerPage = 10;

  // Coach assignment state (admin only)
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [assignedCoach, setAssignedCoach] = useState<string | null>(null);
  const [isAssigningCoach, setIsAssigningCoach] = useState(false);
  const [showCoachDropdown, setShowCoachDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Profile edit modal state
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileForm, setProfileForm] = useState<ProfileFormData>({
    owner_name: "",
    owner_phone: "",
    industry_niche: "",
    years_in_business: "",
    city: "",
    state: "",
    store_type: "",
    ecommerce_platform: "",
  });

  // Get coach info from session
  const coachEmail = session?.user?.email || "";
  const coachName = session?.user?.name || "";
  const isAdmin = (session?.user as { role?: string })?.role === "admin";
  const userRole = (session?.user as { role?: string })?.role;

  useEffect(() => {
    if (status === "loading") return;

    // Allow both coaches and admins to view the store dashboard
    if (!session || (userRole !== "coach" && userRole !== "admin")) {
      router.push("/coach/login");
      return;
    }

    async function fetchData() {
      // Start with mock data for campaigns, metrics, etc.
      const data = getMockStoreDashboard(shopId);
      if (!data) {
        router.push("/bhb");
        return;
      }

      setStoreData(data);
      setAdvertisingGoals(data.advertisingGoals);

      // Fetch real shop profile from the database
      try {
        const profileResponse = await fetch(`/api/bhb/shops/${shopId}/profile`);
        if (profileResponse.ok) {
          const { profile } = await profileResponse.json();
          setShopProfile(profile);
          setAssignedCoach(profile.coach_assigned);

          // If we have real advertising goals, use them
          if (profile.advertising_goals) {
            setAdvertisingGoals(profile.advertising_goals);
          }

          // Initialize profile form with real data
          setProfileForm({
            owner_name: profile.owner_name || "",
            owner_phone: profile.owner_phone || "",
            industry_niche: profile.industry_niche || "",
            years_in_business: profile.years_in_business?.toString() || "",
            city: profile.city || "",
            state: profile.state || "",
            store_type: profile.store_type || "",
            ecommerce_platform: profile.ecommerce_platform || "",
          });
        }
      } catch (error) {
        logger.error(
          "[Store Dashboard] Error fetching profile:",
          error as Error,
          { component: "[shop_id]" },
        );
      }

      // Fetch real campaign data from Facebook API
      try {
        const campaignsResponse = await fetch(
          `/api/bhb/shops/${shopId}/campaigns`,
        );
        if (campaignsResponse.ok) {
          const campaignsData: CampaignsApiResponse =
            await campaignsResponse.json();
          setFacebookConnected(campaignsData.facebook_connected);
          if (campaignsData.selected_ad_account) {
            setSelectedAdAccount(campaignsData.selected_ad_account);
          }
          if (campaignsData.campaigns && campaignsData.campaigns.length > 0) {
            // Add platform info to campaigns (they come from Facebook/Meta)
            const campaignsWithPlatform = campaignsData.campaigns.map((c) => ({
              ...c,
              platform: "meta" as const,
            }));
            setRealCampaigns(campaignsWithPlatform);
          }
        }
      } catch (error) {
        logger.error(
          "[Store Dashboard] Error fetching campaigns:",
          error as Error,
          { component: "[shop_id]" },
        );
      }

      // Fetch coach notes
      try {
        const response = await fetch(`/api/coach/notes?shop_id=${shopId}`);
        if (response.ok) {
          const { notes } = await response.json();
          setStoreData((prev) =>
            prev ? { ...prev, coachNotes: notes } : null,
          );
        }
      } catch (error) {
        logger.error(
          "[Store Dashboard] Error fetching notes:",
          error as Error,
          { component: "[shop_id]" },
        );
      }

      // If admin, fetch list of coaches for assignment dropdown
      if (userRole === "admin") {
        try {
          const coachesResponse = await fetch("/api/admin/coaches");
          if (coachesResponse.ok) {
            const { coaches: coachList } = await coachesResponse.json();
            setCoaches(coachList || []);
          }
        } catch (error) {
          logger.error(
            "[Store Dashboard] Error fetching coaches:",
            error as Error,
            { component: "[shop_id]" },
          );
        }
      }

      setLoading(false);
    }

    fetchData();
  }, [session, status, shopId, router, userRole]);

  const handleSaveGoals = async () => {
    setIsSavingGoals(true);
    try {
      const response = await fetch(`/api/bhb/shops/${shopId}/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ advertising_goals: advertisingGoals }),
      });

      if (response.ok) {
        const { profile } = await response.json();
        if (profile) {
          setShopProfile(profile);
        }
        setIsEditingGoals(false);
      } else {
        alert("Failed to save advertising goals. Please try again.");
      }
    } catch (error) {
      logger.error("[Store Dashboard] Error saving goals:", error as Error, {
        component: "[shop_id]",
      });
      alert("Failed to save advertising goals. Please try again.");
    } finally {
      setIsSavingGoals(false);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowCoachDropdown(false);
      }
    };

    if (showCoachDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showCoachDropdown]);

  const handleAssignCoach = async (coachEmailToAssign: string | null) => {
    setIsAssigningCoach(true);
    try {
      const response = await fetch(`/api/bhb/shops/${shopId}/assign-coach`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coach_email: coachEmailToAssign }),
      });

      if (response.ok) {
        setAssignedCoach(coachEmailToAssign);
        setShowCoachDropdown(false);
      } else {
        const { error } = await response.json();
        logger.error(
          "[Store Dashboard] Error assigning coach:",
          new Error(error),
          { component: "[shop_id]" },
        );
        alert("Failed to assign coach. Please try again.");
      }
    } catch (error) {
      logger.error("[Store Dashboard] Error assigning coach:", error as Error, {
        component: "[shop_id]",
      });
      alert("Failed to assign coach. Please try again.");
    } finally {
      setIsAssigningCoach(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNoteContent.trim()) return;

    try {
      const response = await fetch("/api/coach/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shop_id: shopId,
          content: newNoteContent,
        }),
      });

      if (response.ok) {
        const { note } = await response.json();
        setStoreData({
          ...storeData!,
          coachNotes: [note, ...storeData!.coachNotes],
        });
        setNewNoteContent("");
        setShowAddNote(false);
      } else {
        const { error } = await response.json();
        logger.error("[Store Dashboard] Error saving note:", error as Error, {
          component: "[shop_id]",
        });
        alert("Failed to save note. Please try again.");
      }
    } catch (error) {
      logger.error("[Store Dashboard] Error saving note:", error as Error, {
        component: "[shop_id]",
      });
      alert("Failed to save note. Please try again.");
    }
  };

  const handleEditProfileClick = () => {
    // Reset form with current profile data
    setProfileForm({
      owner_name: shopProfile?.owner_name || "",
      owner_phone: shopProfile?.owner_phone || "",
      industry_niche: shopProfile?.industry_niche || "",
      years_in_business: shopProfile?.years_in_business?.toString() || "",
      city: shopProfile?.city || "",
      state: shopProfile?.state || "",
      store_type: shopProfile?.store_type || "",
      ecommerce_platform: shopProfile?.ecommerce_platform || "",
    });
    setProfileError("");
    setShowEditProfileModal(true);
  };

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    setProfileError("");

    try {
      const response = await fetch(`/api/bhb/shops/${shopId}/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner_name: profileForm.owner_name || null,
          owner_phone: profileForm.owner_phone || null,
          industry_niche: profileForm.industry_niche || null,
          years_in_business: profileForm.years_in_business
            ? parseInt(profileForm.years_in_business)
            : null,
          city: profileForm.city || null,
          state: profileForm.state || null,
          store_type: profileForm.store_type || null,
          ecommerce_platform: profileForm.ecommerce_platform || null,
        }),
      });

      if (response.ok) {
        const { profile } = await response.json();
        if (profile) {
          setShopProfile(profile);
          if (profile.advertising_goals) {
            setAdvertisingGoals(profile.advertising_goals);
          }
        }
        setShowEditProfileModal(false);
      } else {
        const { error } = await response.json();
        setProfileError(error || "Failed to save profile");
      }
    } catch (error) {
      logger.error("[Store Dashboard] Error saving profile:", error as Error, {
        component: "[shop_id]",
      });
      setProfileError("Failed to save profile. Please try again.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Get display values - prefer real profile data, fall back to mock data
  const getOwnerName = () =>
    shopProfile?.owner_name || storeData?.ownerInfo.name || "Not set";
  const getOwnerEmail = () =>
    shopProfile?.email || storeData?.ownerInfo.email || "Not set";
  const getOwnerPhone = () =>
    shopProfile?.owner_phone || storeData?.ownerInfo.phone || "";
  const getCity = () => shopProfile?.city || storeData?.ownerInfo.city || "";
  const getState = () => shopProfile?.state || storeData?.ownerInfo.state || "";
  const getIndustryNiche = () =>
    shopProfile?.industry_niche ||
    storeData?.ownerInfo.industryNiche ||
    "Not set";
  const getYearsInBusiness = () =>
    shopProfile?.years_in_business ?? storeData?.ownerInfo.yearsInBusiness ?? 0;
  const getStoreType = () =>
    shopProfile?.store_type || storeData?.ownerInfo.storeType || null;
  const getStoreName = () =>
    shopProfile?.display_name ||
    shopProfile?.shop_domain ||
    storeData?.shopName ||
    "Store";

  // Check if profile has any real data (not just mock)
  const hasRealProfileData =
    shopProfile &&
    (shopProfile.owner_name ||
      shopProfile.owner_phone ||
      shopProfile.city ||
      shopProfile.state ||
      shopProfile.industry_niche ||
      shopProfile.years_in_business ||
      shopProfile.store_type);

  // Loading state
  if (status === "loading" || loading) {
    return (
      <BHBLayout
        coachName={coachName}
        coachEmail={coachEmail}
        isAdmin={isAdmin}
      >
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
          <p className="text-gray-500">Loading store dashboard...</p>
        </div>
      </BHBLayout>
    );
  }

  // No data state
  if (!storeData) {
    return (
      <BHBLayout
        coachName={coachName}
        coachEmail={coachEmail}
        isAdmin={isAdmin}
      >
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <Store className="w-16 h-16 text-gray-300" />
          <h2 className="text-xl font-semibold text-gray-900">
            Store not found
          </h2>
          <Link
            href="/bhb"
            className="text-blue-600 hover:text-blue-700 flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
        </div>
      </BHBLayout>
    );
  }

  const platformNames: Record<string, string> = {
    meta: "Meta",
    google: "Google",
    tiktok: "TikTok",
    pinterest: "Pinterest",
  };

  const platformColors: Record<string, string> = {
    meta: "bg-blue-100 text-blue-800",
    google: "bg-red-100 text-red-800",
    tiktok: "bg-gray-900 text-white",
    pinterest: "bg-rose-100 text-rose-800",
  };

  // Use real campaigns if available, otherwise fall back to mock data
  const hasRealCampaigns = realCampaigns.length > 0;

  // Build all campaign table data - prefer real campaigns from Facebook API
  const allCampaignData: Array<{
    id: string;
    name: string;
    status: string;
    platform: string;
    spend: number;
    impressions: number;
    clicks: number;
    ctr: number;
    conversions: number;
    roas: number;
    platformName: string;
    platformColor: string;
  }> = hasRealCampaigns
    ? realCampaigns.map((campaign) => ({
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        platform: campaign.platform,
        spend: campaign.spend,
        impressions: campaign.impressions,
        clicks: campaign.clicks,
        ctr: campaign.ctr,
        conversions: campaign.purchases,
        roas: campaign.roas,
        platformName: platformNames[campaign.platform] || campaign.platform,
        platformColor:
          platformColors[campaign.platform] || "bg-gray-100 text-gray-800",
      }))
    : storeData.campaigns.map((campaign) => ({
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        platform: campaign.platform,
        spend: campaign.spend,
        impressions: campaign.impressions,
        clicks: campaign.clicks,
        ctr: campaign.ctr,
        conversions: campaign.conversions,
        roas: campaign.roas,
        platformName: platformNames[campaign.platform] || campaign.platform,
        platformColor:
          platformColors[campaign.platform] || "bg-gray-100 text-gray-800",
      }));

  // Pagination logic
  const totalPages = Math.ceil(allCampaignData.length / campaignsPerPage);
  const startIndex = (currentPage - 1) * campaignsPerPage;
  const endIndex = startIndex + campaignsPerPage;
  const paginatedCampaigns = allCampaignData.slice(startIndex, endIndex);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const getROASColor = (roas: number) => {
    if (roas >= 4) return "text-emerald-600";
    if (roas >= 2) return "text-amber-600";
    return "text-rose-600";
  };

  return (
    <BHBLayout coachName={coachName} coachEmail={coachEmail} isAdmin={isAdmin}>
      <div className="space-y-6">
        {/* Back Link & Header */}
        <div className="animate-bhb-fade-in">
          <Link
            href="/bhb"
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
                {getStoreName()}
              </h1>
              <p className="text-gray-500 mt-1">{getIndustryNiche()}</p>
            </div>
          </div>
        </div>

        {/* Store Information Card */}
        <div className="animate-bhb-fade-in" style={{ animationDelay: "50ms" }}>
          <div className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg hover:shadow-gray-200/50 transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Store className="w-5 h-5 text-blue-600" />
                Store Information
              </h2>
              <button
                onClick={handleEditProfileClick}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <Pencil className="w-4 h-4" />
                Edit
              </button>
            </div>

            {!hasRealProfileData && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800">
                  This store profile hasn&apos;t been set up yet. Click
                  &quot;Edit&quot; to add store information.
                </p>
              </div>
            )}

            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-6">
              {/* Owner Info */}
              <div className="space-y-3">
                <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                  <span className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-400" />
                    {getOwnerName()}
                  </span>
                  <span className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    {getOwnerEmail()}
                  </span>
                  {getOwnerPhone() && (
                    <span className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-400" />
                      {getOwnerPhone()}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                  {getCity() && getState() && (
                    <span className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      {getCity()}, {getState()}
                    </span>
                  )}
                  {getStoreType() && (
                    <span className="flex items-center gap-2">
                      <ShoppingBag className="w-4 h-4 text-gray-400" />
                      {getStoreType() === "both"
                        ? "Online & Physical"
                        : getStoreType() === "online"
                          ? "Online Only"
                          : "Physical Store"}
                    </span>
                  )}
                  {getYearsInBusiness() > 0 && (
                    <span className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      {getYearsInBusiness()} years in business
                    </span>
                  )}
                </div>
              </div>

              {/* Connected Platforms */}
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                  Connected Platforms
                </p>
                <div className="flex flex-wrap gap-2">
                  {storeData.connectedPlatforms.map((platform) => {
                    /* eslint-disable security/detect-object-injection -- Safe: platform is from trusted storeData */
                    const colorClass =
                      platformColors[platform] || "bg-gray-100 text-gray-800";
                    const displayName = platformNames[platform] || platform;
                    /* eslint-enable security/detect-object-injection */
                    return (
                      <span
                        key={platform}
                        className={`px-3 py-1 rounded-full text-xs font-medium ${colorClass}`}
                      >
                        ✓ {displayName}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Coach Assignment Section - Admin Only */}
            {isAdmin && (
              <div className="mt-6 pt-6 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{
                        background:
                          "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)",
                      }}
                    >
                      <UserCog className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        Assigned Coach
                      </p>
                      <p className="text-xs text-gray-500">
                        {assignedCoach
                          ? coaches.find((c) => c.email === assignedCoach)
                              ?.name || assignedCoach
                          : "No coach assigned"}
                      </p>
                    </div>
                  </div>

                  {/* Coach Dropdown */}
                  <div className="relative" ref={dropdownRef}>
                    <button
                      onClick={() => setShowCoachDropdown(!showCoachDropdown)}
                      disabled={isAssigningCoach}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {isAssigningCoach ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          {assignedCoach ? "Change Coach" : "Assign Coach"}
                          <ChevronDown className="w-4 h-4" />
                        </>
                      )}
                    </button>

                    {showCoachDropdown && (
                      <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
                        {/* Unassign option */}
                        {assignedCoach && (
                          <button
                            onClick={() => handleAssignCoach(null)}
                            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors"
                          >
                            Unassign Coach
                          </button>
                        )}

                        {/* Coach list */}
                        {coaches.filter(
                          (c) => c.is_active || c.email === assignedCoach,
                        ).length === 0 ? (
                          <p className="px-4 py-2 text-sm text-gray-500">
                            No coaches available
                          </p>
                        ) : (
                          coaches
                            .filter(
                              (c) => c.is_active || c.email === assignedCoach,
                            )
                            .map((coach) => (
                              <button
                                key={coach.id}
                                onClick={() => handleAssignCoach(coach.email)}
                                className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                                  coach.email === assignedCoach
                                    ? "bg-blue-50 text-blue-700 font-medium"
                                    : "text-gray-700 hover:bg-gray-50"
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span>{coach.name}</span>
                                  {coach.email === assignedCoach && (
                                    <Check className="w-4 h-4 text-blue-600" />
                                  )}
                                </div>
                                <span className="text-xs text-gray-500">
                                  {coach.email}
                                </span>
                              </button>
                            ))
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Display assigned coach for non-admins */}
            {!isAdmin && assignedCoach && (
              <div className="mt-6 pt-6 border-t border-gray-100">
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{
                      background:
                        "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)",
                    }}
                  >
                    <UserCog className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Assigned Coach
                    </p>
                    <p className="text-xs text-gray-500">{assignedCoach}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Advertising Goals Card */}
        <div
          className="animate-bhb-fade-in"
          style={{ animationDelay: "100ms" }}
        >
          <div className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg hover:shadow-gray-200/50 transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-600" />
                Advertising Goals
              </h2>
              {!isEditingGoals ? (
                <button
                  onClick={() => setIsEditingGoals(true)}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                  Edit
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setAdvertisingGoals(
                        shopProfile?.advertising_goals ||
                          storeData.advertisingGoals,
                      );
                      setIsEditingGoals(false);
                    }}
                    disabled={isSavingGoals}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveGoals}
                    disabled={isSavingGoals}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {isSavingGoals ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    Save
                  </button>
                </div>
              )}
            </div>

            {isEditingGoals ? (
              <textarea
                value={advertisingGoals}
                onChange={(e) => setAdvertisingGoals(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                rows={4}
              />
            ) : (
              <p className="text-gray-600">
                {advertisingGoals || "No advertising goals set yet."}
              </p>
            )}
          </div>
        </div>

        {/* Active Campaigns */}
        <div
          className="animate-bhb-fade-in"
          style={{ animationDelay: "150ms" }}
        >
          <div className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg hover:shadow-gray-200/50 transition-all duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  Active Campaigns
                  {hasRealCampaigns && (
                    <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-800 rounded-full">
                      Live Data
                    </span>
                  )}
                  {!hasRealCampaigns && !facebookConnected && (
                    <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                      Sample Data
                    </span>
                  )}
                </h2>
                {selectedAdAccount && (
                  <p className="text-xs text-gray-500 mt-1">
                    Ad Account: {selectedAdAccount.name}
                  </p>
                )}
              </div>

              {/* Time Period Toggle */}
              <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden">
                {(["7", "30", "60", "90"] as const).map((period) => (
                  <button
                    key={period}
                    onClick={() => setTimePeriod(period)}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${
                      timePeriod === period
                        ? "bg-blue-600 text-white"
                        : "bg-white text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {period}d
                  </button>
                ))}
              </div>
            </div>

            {/* Campaigns Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Campaign
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Platform
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Spend
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Impr.
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Clicks
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      CTR
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Conv.
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      ROAS
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedCampaigns.map((campaign) => (
                    <tr
                      key={campaign.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <span className="font-medium text-gray-900">
                          {campaign.name}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${campaign.platformColor}`}
                        >
                          {campaign.platformName}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            campaign.status === "active" ||
                            campaign.status === "ACTIVE"
                              ? "bg-emerald-100 text-emerald-800"
                              : campaign.status === "paused" ||
                                  campaign.status === "PAUSED"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {campaign.status.toLowerCase()}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-sm text-gray-600">
                        {formatCurrency(campaign.spend)}
                      </td>
                      <td className="py-3 px-4 text-right text-sm text-gray-600">
                        {campaign.impressions.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right text-sm text-gray-600">
                        {campaign.clicks.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right text-sm text-gray-600">
                        {campaign.ctr.toFixed(1)}%
                      </td>
                      <td className="py-3 px-4 text-right text-sm text-gray-600">
                        {campaign.conversions}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span
                          className={`font-semibold ${getROASColor(campaign.roas)}`}
                        >
                          {campaign.roas.toFixed(2)}x
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-6 pt-4 border-t border-gray-100">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </button>
                <span className="text-sm text-gray-500">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Metrics Grid */}
        <div
          className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-bhb-fade-in"
          style={{ animationDelay: "200ms" }}
        >
          {/* Average Order Value */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg hover:shadow-gray-200/50 transition-all duration-300">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Average Order Value
              </span>
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{
                  background:
                    "linear-gradient(135deg, #0066cc 0%, #0099ff 100%)",
                }}
              >
                <DollarSign className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900">
              ${storeData.metrics.averageOrderValue.toFixed(2)}
            </div>
            <p className="text-sm text-gray-500 mt-1">Last 30 days</p>
          </div>

          {/* Top Products */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg hover:shadow-gray-200/50 transition-all duration-300">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Top Products
              </span>
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{
                  background:
                    "linear-gradient(135deg, #0066cc 0%, #0099ff 100%)",
                }}
              >
                <Package className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="space-y-2">
              {storeData.metrics.topProducts.slice(0, 3).map((product, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-gray-700 truncate max-w-[60%]">
                    {product.name}
                  </span>
                  <span className="text-gray-500">
                    {formatCurrency(product.revenue)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Categories */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg hover:shadow-gray-200/50 transition-all duration-300">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Top Categories
              </span>
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{
                  background:
                    "linear-gradient(135deg, #0066cc 0%, #0099ff 100%)",
                }}
              >
                <Tag className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="space-y-2">
              {storeData.metrics.topCategories
                .slice(0, 3)
                .map((category, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-gray-700 truncate max-w-[60%]">
                      {category.name}
                    </span>
                    <span className="text-gray-500">
                      {formatCurrency(category.revenue)}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Coach Notes */}
        <div
          className="animate-bhb-fade-in"
          style={{ animationDelay: "250ms" }}
        >
          <div className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg hover:shadow-gray-200/50 transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-blue-600" />
                Coach Notes
              </h2>
              {!showAddNote ? (
                <button
                  onClick={() => setShowAddNote(true)}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Note
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setNewNoteContent("");
                      setShowAddNote(false);
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </button>
                  <button
                    onClick={handleAddNote}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                  >
                    <Check className="w-4 h-4" />
                    Save
                  </button>
                </div>
              )}
            </div>

            {showAddNote && (
              <div className="mb-4">
                <textarea
                  value={newNoteContent}
                  onChange={(e) => setNewNoteContent(e.target.value)}
                  placeholder="Enter your coaching notes, recommendations, or observations about this store..."
                  className="w-full p-3 border border-gray-300 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  rows={4}
                />
              </div>
            )}

            {storeData.coachNotes.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">
                  No notes yet. Add your first note to track coaching sessions
                  and recommendations.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {storeData.coachNotes.map((note, index) => (
                  <div
                    key={note.id}
                    className={`${index > 0 ? "pt-4 border-t border-gray-100" : ""}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900">
                        {note.coachName}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(note.createdAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-gray-600 text-sm">{note.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {showEditProfileModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-blue-600" />
                  Edit Store Profile
                </h2>
                <button
                  onClick={() => setShowEditProfileModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {profileError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">{profileError}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Owner Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Owner Name
                  </label>
                  <input
                    type="text"
                    value={profileForm.owner_name}
                    onChange={(e) =>
                      setProfileForm({
                        ...profileForm,
                        owner_name: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="John Smith"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={profileForm.owner_phone}
                    onChange={(e) =>
                      setProfileForm({
                        ...profileForm,
                        owner_phone: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="(555) 123-4567"
                  />
                </div>

                {/* City */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={profileForm.city}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, city: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="Austin"
                  />
                </div>

                {/* State */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    State
                  </label>
                  <input
                    type="text"
                    value={profileForm.state}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, state: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="TX"
                  />
                </div>

                {/* Industry Niche */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Industry / Niche
                  </label>
                  <input
                    type="text"
                    value={profileForm.industry_niche}
                    onChange={(e) =>
                      setProfileForm({
                        ...profileForm,
                        industry_niche: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="Women's Clothing"
                  />
                </div>

                {/* Years in Business */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Years in Business
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={profileForm.years_in_business}
                    onChange={(e) =>
                      setProfileForm({
                        ...profileForm,
                        years_in_business: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="3"
                  />
                </div>

                {/* Store Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Store Type
                  </label>
                  <select
                    value={profileForm.store_type}
                    onChange={(e) =>
                      setProfileForm({
                        ...profileForm,
                        store_type: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="">Select...</option>
                    <option value="online">Online Only</option>
                    <option value="brick-and-mortar">
                      Physical Store Only
                    </option>
                    <option value="both">Online & Physical</option>
                  </select>
                </div>

                {/* E-commerce Platform */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    E-commerce Platform
                  </label>
                  <select
                    value={profileForm.ecommerce_platform}
                    onChange={(e) =>
                      setProfileForm({
                        ...profileForm,
                        ecommerce_platform: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="">Select...</option>
                    <option value="shopify">Shopify</option>
                    <option value="lightspeed">Lightspeed</option>
                    <option value="commentsold">CommentSold</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowEditProfileModal(false)}
                disabled={isSavingProfile}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProfile}
                disabled={isSavingProfile}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isSavingProfile ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </BHBLayout>
  );
}
