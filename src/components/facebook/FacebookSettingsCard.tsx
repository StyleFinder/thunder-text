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

'use client'

import { useState, useEffect } from 'react'
import {
  Card,
  BlockStack,
  Text,
  TextField,
  Button,
  InlineStack,
  Checkbox,
  Banner,
  Spinner,
  Icon,
} from '@shopify/polaris'
import { DeleteIcon } from '@shopify/polaris-icons'

interface FacebookNotificationSettings {
  id?: string
  primary_email: string
  additional_emails: string[]
  custom_conversion_benchmark: number
  custom_roas_benchmark: number
  alert_threshold_percentage: number
  notify_on_conversion: boolean
  notify_on_roas: boolean
  is_enabled: boolean
}

interface FacebookSettingsCardProps {
  shop: string
}

export default function FacebookSettingsCard({ shop }: FacebookSettingsCardProps) {
  const [settings, setSettings] = useState<FacebookNotificationSettings>({
    primary_email: '',
    additional_emails: [],
    custom_conversion_benchmark: 3.0,
    custom_roas_benchmark: 3.0,
    alert_threshold_percentage: 10,
    notify_on_conversion: true,
    notify_on_roas: true,
    is_enabled: true,
  })
  const [newEmail, setNewEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (shop) {
      fetchSettings()
    }
  }, [shop])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/facebook/settings?shop=${shop}`)
      const data = await response.json()

      if (data.success && data.data) {
        setSettings(data.data)
      }
    } catch (err) {
      console.error('Error fetching Facebook settings:', err)
      setError('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError(null)
      setSuccess(false)

      // Validate primary email
      if (!settings.primary_email || !isValidEmail(settings.primary_email)) {
        setError('Please enter a valid primary email address')
        return
      }

      // Validate benchmarks
      if (settings.custom_conversion_benchmark <= 0) {
        setError('Conversion rate benchmark must be greater than 0')
        return
      }

      if (settings.custom_roas_benchmark <= 0) {
        setError('ROAS benchmark must be greater than 0')
        return
      }

      const response = await fetch('/api/facebook/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shop,
          ...settings,
        }),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to save settings')
      }

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      console.error('Error saving settings:', err)
      setError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const isValidEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  const handleAddEmail = () => {
    if (!newEmail) return

    if (!isValidEmail(newEmail)) {
      setError('Please enter a valid email address')
      return
    }

    if (settings.additional_emails.includes(newEmail)) {
      setError('This email is already added')
      return
    }

    setSettings({
      ...settings,
      additional_emails: [...settings.additional_emails, newEmail],
    })
    setNewEmail('')
    setError(null)
  }

  const handleRemoveEmail = (emailToRemove: string) => {
    setSettings({
      ...settings,
      additional_emails: settings.additional_emails.filter(
        (email) => email !== emailToRemove
      ),
    })
  }

  if (loading) {
    return (
      <Card>
        <InlineStack align="center" blockAlign="center" gap="200">
          <Spinner size="small" />
          <Text as="p" tone="subdued">
            Loading Facebook alert settings...
          </Text>
        </InlineStack>
      </Card>
    )
  }

  return (
    <Card>
      <BlockStack gap="400">
        <BlockStack gap="200">
          <Text as="h3" variant="headingMd">
            Facebook Ad Alert Settings
          </Text>
          <Text as="p" variant="bodyMd" tone="subdued">
            Receive daily email alerts at 6 AM ET when campaigns fall below your benchmarks
          </Text>
        </BlockStack>

        {error && (
          <Banner tone="critical" onDismiss={() => setError(null)}>
            {error}
          </Banner>
        )}

        {success && (
          <Banner tone="success" onDismiss={() => setSuccess(false)}>
            Settings saved successfully! You'll receive alerts starting tomorrow at 6 AM ET.
          </Banner>
        )}

        {/* Email Configuration */}
        <BlockStack gap="300">
          <Text as="h4" variant="headingSm">
            Email Recipients
          </Text>

          <TextField
            label="Primary Email"
            value={settings.primary_email}
            onChange={(value) =>
              setSettings({ ...settings, primary_email: value })
            }
            type="email"
            placeholder="your-email@example.com"
            autoComplete="email"
            requiredIndicator
            helpText="Daily alerts will be sent to this email address"
          />

          <BlockStack gap="200">
            <Text as="p" variant="bodyMd" fontWeight="semibold">
              Additional Recipients (Optional)
            </Text>
            {settings.additional_emails.map((email) => (
              <div
                key={email}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  backgroundColor: '#F6F6F7',
                  borderRadius: '4px',
                }}
              >
                <Text as="span" variant="bodyMd">
                  {email}
                </Text>
                <Button
                  icon={DeleteIcon}
                  onClick={() => handleRemoveEmail(email)}
                  variant="plain"
                  tone="critical"
                />
              </div>
            ))}

            <InlineStack gap="200" align="start">
              <div style={{ flex: 1 }}>
                <TextField
                  label=""
                  value={newEmail}
                  onChange={setNewEmail}
                  type="email"
                  placeholder="additional-email@example.com"
                  autoComplete="off"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleAddEmail()
                    }
                  }}
                />
              </div>
              <Button onClick={handleAddEmail}>+ Add Email</Button>
            </InlineStack>
          </BlockStack>
        </BlockStack>

        {/* Benchmark Configuration */}
        <BlockStack gap="300">
          <Text as="h4" variant="headingSm">
            Performance Benchmarks
          </Text>

          <InlineStack gap="400" align="start">
            <div style={{ flex: 1 }}>
              <TextField
                label="Conversion Rate Benchmark (%)"
                value={settings.custom_conversion_benchmark.toString()}
                onChange={(value) =>
                  setSettings({
                    ...settings,
                    custom_conversion_benchmark: parseFloat(value) || 0,
                  })
                }
                type="number"
                min={0}
                step={0.1}
                suffix="%"
                helpText="Alert when conversion rate falls below this value"
              />
            </div>
            <div style={{ flex: 1 }}>
              <TextField
                label="ROAS Benchmark (x)"
                value={settings.custom_roas_benchmark.toString()}
                onChange={(value) =>
                  setSettings({
                    ...settings,
                    custom_roas_benchmark: parseFloat(value) || 0,
                  })
                }
                type="number"
                min={0}
                step={0.1}
                suffix="x"
                helpText="Alert when ROAS falls below this value"
              />
            </div>
          </InlineStack>

          <TextField
            label="Alert Threshold (%)"
            value={settings.alert_threshold_percentage.toString()}
            onChange={(value) =>
              setSettings({
                ...settings,
                alert_threshold_percentage: parseInt(value) || 0,
              })
            }
            type="number"
            min={0}
            max={100}
            suffix="%"
            helpText="Trigger alerts when metrics fall this percentage below benchmarks"
          />
        </BlockStack>

        {/* Alert Triggers */}
        <BlockStack gap="300">
          <Text as="h4" variant="headingSm">
            Alert Triggers
          </Text>

          <Checkbox
            label="Alert on Conversion Rate"
            checked={settings.notify_on_conversion}
            onChange={(value) =>
              setSettings({ ...settings, notify_on_conversion: value })
            }
            helpText="Receive alerts when conversion rate falls below benchmark"
          />

          <Checkbox
            label="Alert on ROAS"
            checked={settings.notify_on_roas}
            onChange={(value) =>
              setSettings({ ...settings, notify_on_roas: value })
            }
            helpText="Receive alerts when ROAS falls below benchmark"
          />

          <Checkbox
            label="Enable Email Alerts"
            checked={settings.is_enabled}
            onChange={(value) =>
              setSettings({ ...settings, is_enabled: value })
            }
            helpText="Turn on/off all Facebook ad alerts"
          />
        </BlockStack>

        {/* Save Button */}
        <InlineStack align="end">
          <Button
            variant="primary"
            onClick={handleSave}
            loading={saving}
            disabled={!settings.primary_email}
          >
            Save Settings
          </Button>
        </InlineStack>

        {/* Info Banner */}
        <Banner tone="info">
          <BlockStack gap="100">
            <Text as="p" variant="bodyMd" fontWeight="semibold">
              How it works:
            </Text>
            <Text as="p" variant="bodySm">
              • Alerts run daily at 6 AM Eastern Time
            </Text>
            <Text as="p" variant="bodySm">
              • You'll receive one email per day for underperforming campaigns
            </Text>
            <Text as="p" variant="bodySm">
              • Alerts include campaign names, metrics, and direct links to Facebook Ads
            </Text>
          </BlockStack>
        </Banner>
      </BlockStack>
    </Card>
  )
}
