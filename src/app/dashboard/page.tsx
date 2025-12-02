'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useNavigation } from '../hooks/useNavigation'
import { Loader2, Sparkles, FileText, Megaphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import styles from './dashboard.module.css'

export const dynamic = 'force-dynamic'

function DashboardContent() {
  const searchParams = useSearchParams()
  const { navigateTo } = useNavigation()
  const shop = searchParams?.get('shop')

  const storeName = shop ? decodeURIComponent(shop) : 'ThunderText Store'

  // 14-day free trial tracking
  const trialStartDate = new Date('2025-11-30') // TODO: Get from user account
  const trialEndDate = new Date(trialStartDate)
  trialEndDate.setDate(trialEndDate.getDate() + 14)
  const today = new Date()
  const daysRemaining = Math.max(0, Math.ceil((trialEndDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)))
  const trialDays = 14

  if (!shop) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6 py-12">
        <div className="bg-white rounded-xl shadow-md border border-gray-200 max-w-xl w-full p-8 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Access needed</p>
              <h1 className="text-xl font-semibold text-gray-900">Authentication Required</h1>
            </div>
          </div>
          <p className="text-sm text-gray-600">
            Please install Thunder Text from your Shopify admin panel to access the dashboard.
          </p>
          <Button onClick={() => navigateTo('/')}>
            Back to Home
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.pageWrapper}>
      <main className={`${styles.page}`}>
        <div className={styles.stack}>
          <div className={styles.card}>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
            <p className="text-sm text-gray-700 leading-relaxed">
              Welcome to Thunder Text & ACE— generate compelling product descriptions and social media ads using AI to boost your sales, increase productivity, boost profits.
            </p>
          </div>

          <div className={styles.card}>
            <div className="flex justify-between items-center mb-3">
              <h2 className={styles.sectionTitle}>14-Day Free Trial</h2>
              <span className="text-xs text-gray-500">{daysRemaining} days left</span>
            </div>
            <div className={styles.progressTrack}>
              <div
                className={styles.progressFill}
                style={{ width: `${((trialDays - daysRemaining) / trialDays) * 100}%` }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-sm text-gray-600">
              <span>
                Day {trialDays - daysRemaining} of {trialDays}
              </span>
              <button
                type="button"
                className={styles.upgradeButton}
                onClick={() => navigateTo('/settings')}
              >
                Upgrade now
              </button>
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.card}>
              <h2 className={styles.sectionTitle}>Quick Actions</h2>
              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={() => navigateTo('/create-pd')}
                >
                  <Sparkles className="h-4 w-4" />
                  Create New Product
                </button>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => navigateTo('/enhance')}
                >
                  <FileText className="h-4 w-4" />
                  Update Existing Product
                </button>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => navigateTo('/create-ad')}
                >
                  <Megaphone className="h-4 w-4" />
                  Create Ad
                </button>
              </div>
            </div>

            <div className={styles.card}>
              <h2 className={styles.sectionTitle}>ROI Calculator</h2>
              <div className={styles.roiBox}>
                <p className="text-sm text-gray-700">Total Savings</p>
                <div className="text-3xl font-bold text-[#065f46]">$0</div>
                <p className="text-xs text-gray-600">(0 min)</p>
              </div>
              <p className={`${styles.roiSummary}`}>
                <span className="font-semibold text-gray-900">0</span> products generated ·{' '}
                <span className="font-semibold text-gray-900">0 min</span> saved
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default function Dashboard() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#f3f4f6]">
          <div className="flex items-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-sm text-gray-500">Loading Dashboard...</p>
          </div>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  )
}
