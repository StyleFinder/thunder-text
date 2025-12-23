"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useShopContext } from "../ShopContext";
import {
  Loader2,
  AlertCircle,
  Settings,
  ArrowLeft,
  Zap,
  RefreshCw,
  Link2,
  FileText,
  Info,
  Bot,
  Download,
  Copy,
  Check,
  Eye,
  Calendar,
  Clock,
  CreditCard,
} from "lucide-react";
import ShopSizes from "@/components/ShopSizes";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

interface ShopInfo {
  id: string;
  shop_domain: string;
  created_at: string;
  updated_at: string;
}

function SettingsContent() {
  const { shopId, shopDomain } = useShopContext();
  const router = useRouter();
  const { toast } = useToast();
  const shop = shopDomain || shopId;

  const [shopInfo, setShopInfo] = useState<ShopInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionsCount, setConnectionsCount] = useState(0);
  const [llmsGenerating, setLlmsGenerating] = useState(false);
  const [llmsContent, setLlmsContent] = useState<string | null>(null);
  const [llmsStats, setLlmsStats] = useState<{
    productCount: number;
    generatedAt: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const [llmsSettings, setLlmsSettings] = useState({
    include_products: true,
    include_collections: false,
    include_blog_posts: false,
    sync_schedule: "none" as "none" | "daily" | "weekly",
    last_generated_at: null as string | null,
    next_sync_at: null as string | null,
    last_product_count: 0,
  });
  const [llmsSettingsSaving, setLlmsSettingsSaving] = useState(false);

  useEffect(() => {
    if (shop) {
      fetchSettings();
      fetchConnections();
      fetchLlmsSettings();
    } else {
      setLoading(false);
    }
  }, [shop]);

  const fetchSettings = async () => {
    try {
      setShopInfo({
        id: shopId,
        shop_domain: shop || "",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      setError(null);
    } catch (err) {
      logger.error("Error fetching settings:", err as Error, {
        component: "settings",
      });
      setError("Failed to load settings. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fetchConnections = async () => {
    try {
      const response = await fetch(`/api/settings/connections?shop=${shop}`);
      const data = await response.json();
      if (data.success && data.connections) {
        const connected = data.connections.filter((c: { connected: boolean }) => c.connected).length;
        setConnectionsCount(connected);
      }
    } catch (err) {
      logger.error("Error fetching connections:", err as Error, {
        component: "settings",
      });
    }
  };

  const fetchLlmsSettings = async () => {
    try {
      const response = await fetch(`/api/llms/settings?shop=${shop}`);
      const data = await response.json();
      if (data.success && data.settings) {
        setLlmsSettings({
          include_products: data.settings.include_products ?? true,
          include_collections: data.settings.include_collections ?? false,
          include_blog_posts: data.settings.include_blog_posts ?? false,
          sync_schedule: data.settings.sync_schedule ?? "none",
          last_generated_at: data.settings.last_generated_at,
          next_sync_at: data.settings.next_sync_at,
          last_product_count: data.settings.last_product_count ?? 0,
        });
      }
    } catch (err) {
      logger.error("Error fetching llms settings:", err as Error, {
        component: "settings",
      });
    }
  };

  const saveLlmsSettings = async (newSettings: Partial<typeof llmsSettings>) => {
    if (!shop) return;
    setLlmsSettingsSaving(true);
    const updatedSettings = { ...llmsSettings, ...newSettings };
    setLlmsSettings(updatedSettings);

    try {
      const response = await fetch(`/api/llms/settings?shop=${shop}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          include_products: updatedSettings.include_products,
          include_collections: updatedSettings.include_collections,
          include_blog_posts: updatedSettings.include_blog_posts,
          sync_schedule: updatedSettings.sync_schedule,
        }),
      });
      const data = await response.json();
      if (data.success && data.settings) {
        setLlmsSettings((prev) => ({
          ...prev,
          next_sync_at: data.settings.next_sync_at,
        }));
        toast({ title: "Settings saved", description: "AI Discovery settings updated successfully" });
      } else {
        toast({ title: "Error", description: data.error || "Failed to save settings", variant: "destructive" });
      }
    } catch (err) {
      logger.error("Error saving llms settings:", err as Error, { component: "settings" });
      toast({ title: "Error", description: "Failed to save settings", variant: "destructive" });
    } finally {
      setLlmsSettingsSaving(false);
    }
  };

  const generateLlmsTxt = async () => {
    if (!shop) return;
    setLlmsGenerating(true);
    setLlmsContent(null);
    setLlmsStats(null);

    try {
      const response = await fetch(`/api/llms/generate?shop=${shop}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await response.json();
      if (data.success) {
        setLlmsContent(data.content);
        setLlmsStats({ productCount: data.stats.productCount, generatedAt: data.stats.generatedAt });
        setLlmsSettings((prev) => ({
          ...prev,
          last_generated_at: data.stats.generatedAt,
          last_product_count: data.stats.productCount,
        }));
        toast({ title: "Success", description: `Generated llms.txt with ${data.stats.productCount} products` });
      } else {
        toast({ title: "Error", description: data.error || "Failed to generate llms.txt", variant: "destructive" });
      }
    } catch (err) {
      logger.error("Error generating llms.txt:", err as Error, { component: "settings" });
      toast({ title: "Error", description: "Failed to generate llms.txt", variant: "destructive" });
    } finally {
      setLlmsGenerating(false);
    }
  };

  const downloadLlmsTxt = () => {
    if (!llmsContent) return;
    const blob = new Blob([llmsContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "llms.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: "Downloaded", description: "llms.txt file downloaded successfully" });
  };

  const copyLlmsTxt = async () => {
    if (!llmsContent) return;
    try {
      await navigator.clipboard.writeText(llmsContent);
      setCopied(true);
      toast({ title: "Copied", description: "llms.txt content copied to clipboard" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Error", description: "Failed to copy to clipboard", variant: "destructive" });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <main className="max-w-4xl mx-auto px-6 py-8">
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gray-200 animate-pulse" />
              <div>
                <div className="h-8 w-32 bg-gray-200 rounded animate-pulse mb-2" />
                <div className="h-4 w-48 bg-gray-100 rounded animate-pulse" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
                <div className="h-5 bg-gray-200 rounded w-1/2 mb-4" />
                <div className="h-4 bg-gray-100 rounded w-full mb-2" />
                <div className="h-4 bg-gray-100 rounded w-3/4" />
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "linear-gradient(135deg, #001429 0%, #002952 50%, #003d7a 100%)" }}>
        <div className="w-full max-w-md">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #ffcc00 0%, #ff9900 100%)" }}>
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">Thunder Text</span>
          </div>
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: "rgba(220, 38, 38, 0.1)" }}>
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-3">Failed to Load Settings</h1>
              <p className="text-gray-500 mb-6">{error}</p>
              <Button className="w-full h-11" style={{ background: "linear-gradient(135deg, #0066cc 0%, #0099ff 100%)" }} onClick={() => { setLoading(true); setError(null); fetchSettings(); }}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #0066cc 0%, #0099ff 100%)" }}>
                <Settings className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
                <p className="text-gray-500 text-sm">Manage your Thunder Text preferences</p>
              </div>
            </div>
            <Button variant="outline" className="border-gray-200 hover:bg-gray-50" onClick={() => router.push(`/stores/${shopId}/dashboard`)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>

          <div className="rounded-xl p-4 flex items-center gap-3" style={{ background: "rgba(0, 102, 204, 0.05)", border: "1px solid rgba(0, 102, 204, 0.1)" }}>
            <Info className="w-5 h-5 flex-shrink-0" style={{ color: "#0066cc" }} />
            <p className="text-sm" style={{ color: "#0066cc" }}>Configure your prompts, templates, integrations, and size guides to customize your Thunder Text experience.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Connections */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center gap-2 mb-1">
                <Link2 className="w-5 h-5" style={{ color: "#0066cc" }} />
                <h3 className="text-lg font-semibold text-gray-900">Connections</h3>
                {connectionsCount > 0 && (
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-500 text-white text-xs font-semibold">{connectionsCount}</span>
                )}
              </div>
              <p className="text-sm text-gray-500">Manage integrations with Shopify, Meta, Google, and more</p>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <Link href={`/stores/${shopId}/settings/connections`}>
                <Button className="w-full h-11" style={{ background: "linear-gradient(135deg, #0066cc 0%, #0099ff 100%)" }}>
                  <Link2 className="w-4 h-4 mr-2" />
                  Manage Connections
                </Button>
              </Link>
              {connectionsCount > 0 && (
                <div className="rounded-lg p-4 bg-green-50 border border-green-200">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-500 text-white text-sm">✓</span>
                    <p className="text-sm font-semibold text-green-700">{connectionsCount} {connectionsCount === 1 ? "platform" : "platforms"} connected</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Billing & Plan */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center gap-2 mb-1">
                <CreditCard className="w-5 h-5" style={{ color: "#0066cc" }} />
                <h3 className="text-lg font-semibold text-gray-900">Billing & Plan</h3>
              </div>
              <p className="text-sm text-gray-500">Manage your subscription, view billing details, and upgrade your plan</p>
            </div>
            <div className="p-6">
              <Link href={`/stores/${shopId}/settings/billing`}>
                <Button className="w-full h-11" style={{ background: "linear-gradient(135deg, #0066cc 0%, #0099ff 100%)" }}>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Manage Billing & Plan
                </Button>
              </Link>
            </div>
          </div>

          {/* Account Information */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Account Information</h3>
            </div>
            <div className="p-6">
              {shopInfo && (
                <div className="flex flex-col gap-3">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Shop</p>
                    <p className="text-sm font-semibold text-gray-900">{shopInfo.shop_domain}</p>
                  </div>
                  <div className="h-px bg-gray-200" />
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Installed Since</p>
                    <p className="text-sm text-gray-900">{formatDate(shopInfo.created_at)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Prompts Management */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center gap-2 mb-1">
                <FileText className="w-5 h-5" style={{ color: "#0066cc" }} />
                <h3 className="text-lg font-semibold text-gray-900">Prompts Management</h3>
              </div>
              <p className="text-sm text-gray-500">Customize AI writing templates and system prompts for your product descriptions</p>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <Link href={`/stores/${shopId}/settings/prompts`}>
                <Button className="w-full h-11" style={{ background: "linear-gradient(135deg, #0066cc 0%, #0099ff 100%)" }}>
                  <Settings className="w-4 h-4 mr-2" />
                  Manage Prompts & Templates
                </Button>
              </Link>
            </div>
          </div>

          {/* AI Discovery - Full Width */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm col-span-1 lg:col-span-2">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center gap-2 mb-1">
                <Bot className="w-5 h-5" style={{ color: "#0066cc" }} />
                <h3 className="text-lg font-semibold text-gray-900">AI Discovery</h3>
                {llmsSettings.last_generated_at && (
                  <span className="ml-auto px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">Published</span>
                )}
              </div>
              <p className="text-sm text-gray-500">Generate an llms.txt file to help AI assistants like ChatGPT, Claude, and Gemini discover your products</p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-900 mb-3">Include Content</p>
                    <div className="flex flex-col gap-2">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" checked={llmsSettings.include_products} onChange={(e) => saveLlmsSettings({ include_products: e.target.checked })} disabled={llmsSettingsSaving} className="w-4 h-4 rounded border-gray-300 text-blue-600" />
                        <span className="text-sm text-gray-700">Products</span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" checked={llmsSettings.include_collections} onChange={(e) => saveLlmsSettings({ include_collections: e.target.checked })} disabled={llmsSettingsSaving} className="w-4 h-4 rounded border-gray-300 text-blue-600" />
                        <span className="text-sm text-gray-700">Collections</span>
                        <span className="text-xs text-gray-400">(Coming soon)</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-gray-900 mb-3">Auto-Sync Schedule</p>
                    <select value={llmsSettings.sync_schedule} onChange={(e) => saveLlmsSettings({ sync_schedule: e.target.value as "none" | "daily" | "weekly" })} disabled={llmsSettingsSaving} className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm text-gray-700">
                      <option value="none">None (Manual only)</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Once a week</option>
                    </select>
                    {llmsSettings.sync_schedule !== "none" && llmsSettings.next_sync_at && (
                      <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Next sync: {new Date(llmsSettings.next_sync_at).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                      </p>
                    )}
                  </div>

                  <Button className="w-full h-11 mt-2" style={{ background: "linear-gradient(135deg, #0066cc 0%, #0099ff 100%)" }} onClick={generateLlmsTxt} disabled={llmsGenerating}>
                    {llmsGenerating ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</>) : (<><Bot className="w-4 h-4 mr-2" />Generate llms.txt</>)}
                  </Button>
                </div>

                <div className="flex flex-col gap-4">
                  {llmsSettings.last_generated_at ? (
                    <div className="rounded-lg p-4 bg-green-50 border border-green-200">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-500 text-white text-sm">✓</span>
                        <p className="text-sm font-semibold text-green-700">Published</p>
                      </div>
                      <div className="flex flex-col gap-2 text-sm text-gray-600">
                        <p className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          Last updated: {new Date(llmsSettings.last_generated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}
                        </p>
                        {llmsSettings.last_product_count > 0 && <p className="text-gray-500">{llmsSettings.last_product_count} products included</p>}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg p-4 bg-gray-50 border border-gray-200">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-300 text-white text-sm">-</span>
                        <p className="text-sm font-semibold text-gray-500">Not yet generated</p>
                      </div>
                      <p className="text-sm text-gray-400">Click &quot;Generate llms.txt&quot; to create your AI discovery file</p>
                    </div>
                  )}

                  {llmsStats && (
                    <div className="rounded-lg p-4 border border-gray-200 bg-white">
                      <p className="text-sm font-semibold text-gray-900 mb-3">Generated File ({llmsStats.productCount} products)</p>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1" onClick={() => setShowPreview(true)}>
                          <Eye className="w-4 h-4 mr-2" />Preview
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1" onClick={downloadLlmsTxt}>
                          <Download className="w-4 h-4 mr-2" />Download
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1" onClick={copyLlmsTxt}>
                          {copied ? (<><Check className="w-4 h-4 mr-2" />Copied!</>) : (<><Copy className="w-4 h-4 mr-2" />Copy</>)}
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="rounded-lg p-4" style={{ background: "rgba(0, 102, 204, 0.05)", border: "1px solid rgba(0, 102, 204, 0.1)" }}>
                    <p className="text-sm text-gray-700 mb-2"><span className="font-semibold">What is llms.txt?</span></p>
                    <p className="text-sm text-gray-600">Similar to robots.txt for search engines, llms.txt helps AI assistants understand and recommend your products. Upload the generated file to your store&apos;s theme files.</p>
                  </div>
                </div>
              </div>

              {showPreview && llmsContent && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                  <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[80vh] flex flex-col">
                    <div className="flex items-center justify-between p-4 border-b border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900">llms.txt Preview</h3>
                      <Button variant="ghost" size="sm" onClick={() => setShowPreview(false)}>Close</Button>
                    </div>
                    <div className="p-4 overflow-auto flex-1">
                      <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono bg-gray-50 p-4 rounded-lg">{llmsContent}</pre>
                    </div>
                    <div className="flex gap-2 p-4 border-t border-gray-200">
                      <Button variant="outline" className="flex-1" onClick={downloadLlmsTxt}><Download className="w-4 h-4 mr-2" />Download</Button>
                      <Button variant="outline" className="flex-1" onClick={copyLlmsTxt}>{copied ? (<><Check className="w-4 h-4 mr-2" />Copied!</>) : (<><Copy className="w-4 h-4 mr-2" />Copy to Clipboard</>)}</Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Shop Sizes - Full Width */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm col-span-1 lg:col-span-2">
            <div className="p-6 pb-8">
              {shop && (
                <ShopSizes
                  shop={shop}
                  onToast={(message: string, error?: boolean) => {
                    toast({
                      title: error ? "Error" : "Success",
                      description: message,
                      variant: error ? "destructive" : "default",
                    });
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #ffcc00 0%, #ff9900 100%)" }}>
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin" style={{ color: "#0066cc" }} />
            <p className="text-sm text-gray-500">Loading Settings...</p>
          </div>
        </div>
      </div>
    }>
      <SettingsContent />
    </Suspense>
  );
}
