'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useNavigation } from '../hooks/useNavigation';
import {
  Loader2,
  Sparkles,
  FileText,
  Megaphone,
  Zap,
  Clock,
  DollarSign,
  TrendingUp,
  ArrowRight,
  Settings,
  Crown,
  LayoutGrid,
  PenTool,
  Target,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HotTakesCard } from '../components/HotTakesCard';

export const dynamic = 'force-dynamic';

// Stat Card Component
function StatCard({
  icon: Icon,
  label,
  value,
  subtext,
  color
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  subtext: string;
  color: 'blue' | 'green' | 'amber' | 'purple';
}) {
  const colorStyles = {
    blue: {
      iconBg: 'rgba(0, 102, 204, 0.1)',
      iconColor: '#0066cc',
      valueColor: '#0066cc'
    },
    green: {
      iconBg: 'rgba(34, 197, 94, 0.1)',
      iconColor: '#16a34a',
      valueColor: '#16a34a'
    },
    amber: {
      iconBg: 'rgba(245, 158, 11, 0.1)',
      iconColor: '#d97706',
      valueColor: '#d97706'
    },
    purple: {
      iconBg: 'rgba(139, 92, 246, 0.1)',
      iconColor: '#7c3aed',
      valueColor: '#7c3aed'
    }
  };

  const styles = colorStyles[color];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 mb-1">{label}</p>
          <p className="text-2xl font-bold" style={{ color: styles.valueColor }}>
            {value}
          </p>
          <p className="text-xs text-gray-400 mt-1">{subtext}</p>
        </div>
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ background: styles.iconBg }}
        >
          <Icon className="w-5 h-5" style={{ color: styles.iconColor }} />
        </div>
      </div>
    </div>
  );
}

// Feature Tile Component
function FeatureTile({
  icon: Icon,
  title,
  description,
  onClick,
  variant = 'default'
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  onClick: () => void;
  variant?: 'default' | 'primary';
}) {
  const isPrimary = variant === 'primary';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left p-5 rounded-xl border transition-all group ${
        isPrimary
          ? 'bg-gradient-to-br from-blue-600 to-blue-700 border-blue-500 hover:from-blue-700 hover:to-blue-800'
          : 'bg-white border-gray-200 hover:border-blue-200 hover:shadow-md'
      }`}
    >
      <div className="flex items-start gap-4">
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
            isPrimary
              ? 'bg-white/20'
              : 'bg-gradient-to-br from-blue-50 to-blue-100'
          }`}
        >
          <Icon
            className={`w-6 h-6 ${isPrimary ? 'text-white' : 'text-blue-600'}`}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3
              className={`font-semibold ${
                isPrimary ? 'text-white' : 'text-gray-900'
              }`}
            >
              {title}
            </h3>
            <ChevronRight
              className={`w-5 h-5 transition-transform group-hover:translate-x-1 ${
                isPrimary ? 'text-white/70' : 'text-gray-400'
              }`}
            />
          </div>
          <p
            className={`text-sm mt-1 ${
              isPrimary ? 'text-white/80' : 'text-gray-500'
            }`}
          >
            {description}
          </p>
        </div>
      </div>
    </button>
  );
}

// Quick Link Component
function QuickLink({
  icon: Icon,
  label,
  onClick
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors text-sm text-gray-700 hover:text-gray-900"
    >
      <Icon className="w-4 h-4" />
      <span>{label}</span>
    </button>
  );
}

function DashboardContent() {
  const searchParams = useSearchParams();
  const { navigateTo } = useNavigation();
  const shop = searchParams?.get('shop');

  const storeName = shop
    ? decodeURIComponent(shop).replace('.myshopify.com', '')
    : 'Your Store';

  // 14-day free trial tracking
  const trialStartDate = new Date('2025-11-30'); // TODO: Get from user account
  const trialEndDate = new Date(trialStartDate);
  trialEndDate.setDate(trialEndDate.getDate() + 14);
  const today = new Date();
  const daysRemaining = Math.max(
    0,
    Math.ceil((trialEndDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  );
  const trialDays = 14;
  const trialProgress = ((trialDays - daysRemaining) / trialDays) * 100;

  // No shop state
  if (!shop) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-6"
        style={{
          background: 'linear-gradient(135deg, #001429 0%, #002952 50%, #003d7a 100%)'
        }}
      >
        <div className="w-full max-w-md">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #ffcc00 0%, #ff9900 100%)' }}
            >
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">Thunder Text</span>
          </div>
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
                style={{ background: 'rgba(0, 102, 204, 0.1)' }}
              >
                <Sparkles className="w-8 h-8" style={{ color: '#0066cc' }} />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-3">
                Authentication Required
              </h1>
              <p className="text-gray-500 mb-6">
                Please install Thunder Text from your Shopify admin panel to access the
                dashboard.
              </p>
              <Button
                className="w-full h-11 text-base font-medium"
                style={{
                  background: 'linear-gradient(135deg, #0066cc 0%, #0099ff 100%)',
                  border: 'none'
                }}
                onClick={() => navigateTo('/')}
              >
                Back to Home
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Welcome Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Welcome back, {storeName}
              </h1>
              <p className="text-gray-500 mt-1">
                Create compelling product descriptions and ads with AI
              </p>
            </div>
            <div className="flex items-center gap-3">
              <QuickLink
                icon={Settings}
                label="Settings"
                onClick={() => navigateTo('/settings')}
              />
              <QuickLink
                icon={LayoutGrid}
                label="Products"
                onClick={() => navigateTo('/products')}
              />
            </div>
          </div>
        </div>

        {/* Trial Banner */}
        {daysRemaining > 0 && (
          <div className="mb-8 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-5 text-white">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                  <Crown className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">
                    {daysRemaining} days left in your free trial
                  </h3>
                  <p className="text-white/80 text-sm">
                    Upgrade now to unlock unlimited access and premium features
                  </p>
                </div>
              </div>
              <Button
                className="bg-white text-blue-600 hover:bg-blue-50 font-semibold px-6"
                onClick={() => navigateTo('/settings')}
              >
                Upgrade Now
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
            {/* Progress bar */}
            <div className="mt-4 h-2 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white/60 rounded-full transition-all duration-500"
                style={{ width: `${trialProgress}%` }}
              />
            </div>
            <p className="text-white/70 text-xs mt-2">
              Day {trialDays - daysRemaining} of {trialDays}
            </p>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={FileText}
            label="Products Generated"
            value="0"
            subtext="This month"
            color="blue"
          />
          <StatCard
            icon={Clock}
            label="Time Saved"
            value="0 min"
            subtext="vs. manual writing"
            color="green"
          />
          <StatCard
            icon={DollarSign}
            label="Estimated Savings"
            value="$0"
            subtext="Based on avg. copywriter rate"
            color="amber"
          />
          <StatCard
            icon={TrendingUp}
            label="Ads Created"
            value="0"
            subtext="Ready to publish"
            color="purple"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Quick Actions */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>

            <FeatureTile
              icon={Sparkles}
              title="Create New Product"
              description="Upload images and generate compelling product descriptions instantly"
              onClick={() => navigateTo('/create-pd')}
              variant="primary"
            />

            <FeatureTile
              icon={PenTool}
              title="Enhance Existing Product"
              description="Improve your current product descriptions with AI optimization"
              onClick={() => navigateTo('/enhance')}
            />

            <FeatureTile
              icon={Megaphone}
              title="Create Social Media Ad"
              description="Generate high-converting ad copy for Facebook, Instagram & more"
              onClick={() => navigateTo('/aie')}
            />

            <FeatureTile
              icon={Target}
              title="Run Facebook Ads"
              description="Connect your Facebook account and launch ads directly"
              onClick={() => navigateTo('/facebook-ads')}
            />
          </div>

          {/* Right Column - Hot Takes & Resources */}
          <div className="space-y-6">
            {/* Hot Takes */}
            <HotTakesCard />

            {/* Resources Card */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Resources</h3>
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => navigateTo('/brand-voice')}
                  className="w-full flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                      <PenTool className="w-4 h-4 text-blue-600" />
                    </div>
                    <span className="text-sm font-medium text-gray-700">Brand Voice</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition-transform" />
                </button>

                <button
                  type="button"
                  onClick={() => navigateTo('/content-center')}
                  className="w-full flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                      <LayoutGrid className="w-4 h-4 text-green-600" />
                    </div>
                    <span className="text-sm font-medium text-gray-700">Content Center</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition-transform" />
                </button>

                <button
                  type="button"
                  onClick={() => navigateTo('/bhb')}
                  className="w-full flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                      <Zap className="w-4 h-4 text-amber-600" />
                    </div>
                    <span className="text-sm font-medium text-gray-700">BHB Coach</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition-transform" />
                </button>

                <button
                  type="button"
                  onClick={() => navigateTo('/help')}
                  className="w-full flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-purple-600" />
                    </div>
                    <span className="text-sm font-medium text-gray-700">Help & Tips</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function Dashboard() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="flex flex-col items-center gap-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #ffcc00 0%, #ff9900 100%)' }}
            >
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin" style={{ color: '#0066cc' }} />
              <p className="text-sm text-gray-500">Loading Dashboard...</p>
            </div>
          </div>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
