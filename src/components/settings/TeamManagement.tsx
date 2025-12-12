'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { logger } from '@/lib/logger'
import {
  Users,
  UserPlus,
  Mail,
  Clock,
  RefreshCw,
  Trash2,
  AlertCircle,
  Check,
  Loader2,
  ArrowUpRight
} from 'lucide-react'

interface Invitation {
  id: string
  invited_email: string
  invited_name: string | null
  status: 'pending' | 'accepted' | 'expired' | 'revoked'
  created_at: string
  expires_at: string
  accepted_at: string | null
}

interface InvitationLimits {
  used: number
  limit: number
  canInvite: boolean
}

interface TeamManagementProps {
  shopDomain: string
  shopId: string
}

export function TeamManagement({ shopDomain }: TeamManagementProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [limits, setLimits] = useState<InvitationLimits>({ used: 0, limit: 0, canInvite: false })

  // Invite form state
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [sending, setSending] = useState(false)

  // Action states
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    fetchTeamData()
  }, [shopDomain])

  const fetchTeamData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/invitations?shop=${encodeURIComponent(shopDomain)}`)
      const data = await response.json()

      if (data.success) {
        setInvitations(data.invitations || [])
        setLimits(data.limits || { used: 0, limit: 0, canInvite: false })
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to load team data',
          variant: 'destructive',
        })
      }
    } catch (err) {
      logger.error('Error fetching team data:', err as Error, { component: 'TeamManagement' })
      toast({
        title: 'Error',
        description: 'Failed to load team data',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!inviteEmail.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter an email address',
        variant: 'destructive',
      })
      return
    }

    if (!limits.canInvite) {
      toast({
        title: 'Invitation limit reached',
        description: 'Upgrade your plan to invite more team members',
        variant: 'destructive',
      })
      return
    }

    setSending(true)
    try {
      const response = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shop: shopDomain,
          email: inviteEmail.trim(),
          name: inviteName.trim() || null,
        }),
      })
      const data = await response.json()

      if (data.success) {
        toast({
          title: 'Invitation sent',
          description: `Invitation sent to ${inviteEmail}`,
        })
        setInviteEmail('')
        setInviteName('')
        fetchTeamData()
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to send invitation',
          variant: 'destructive',
        })
      }
    } catch (err) {
      logger.error('Error sending invitation:', err as Error, { component: 'TeamManagement' })
      toast({
        title: 'Error',
        description: 'Failed to send invitation',
        variant: 'destructive',
      })
    } finally {
      setSending(false)
    }
  }

  const handleResend = async (invitationId: string) => {
    setActionLoading(invitationId)
    try {
      const response = await fetch(`/api/invitations/${invitationId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shop: shopDomain,
          action: 'resend',
        }),
      })
      const data = await response.json()

      if (data.success) {
        toast({
          title: 'Invitation resent',
          description: 'The invitation email has been sent again',
        })
        fetchTeamData()
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to resend invitation',
          variant: 'destructive',
        })
      }
    } catch (err) {
      logger.error('Error resending invitation:', err as Error, { component: 'TeamManagement' })
      toast({
        title: 'Error',
        description: 'Failed to resend invitation',
        variant: 'destructive',
      })
    } finally {
      setActionLoading(null)
    }
  }

  const handleRevoke = async (invitationId: string) => {
    setActionLoading(invitationId)
    try {
      const response = await fetch(`/api/invitations/${invitationId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shop: shopDomain }),
      })
      const data = await response.json()

      if (data.success) {
        toast({
          title: 'Invitation revoked',
          description: 'The invitation has been cancelled',
        })
        fetchTeamData()
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to revoke invitation',
          variant: 'destructive',
        })
      }
    } catch (err) {
      logger.error('Error revoking invitation:', err as Error, { component: 'TeamManagement' })
      toast({
        title: 'Error',
        description: 'Failed to revoke invitation',
        variant: 'destructive',
      })
    } finally {
      setActionLoading(null)
    }
  }

  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date()
    const expires = new Date(expiresAt)
    const diffMs = expires.getTime() - now.getTime()

    if (diffMs <= 0) return 'Expired'

    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

    if (days > 0) return `${days}d ${hours}h remaining`
    return `${hours}h remaining`
  }

  const getStatusBadge = (status: Invitation['status']) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700">
            <Clock className="w-3 h-3" />
            Pending
          </span>
        )
      case 'accepted':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
            <Check className="w-3 h-3" />
            Accepted
          </span>
        )
      case 'expired':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-500">
            <AlertCircle className="w-3 h-3" />
            Expired
          </span>
        )
      case 'revoked':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">
            <Trash2 className="w-3 h-3" />
            Revoked
          </span>
        )
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5" style={{ color: '#0066cc' }} />
            <h3 className="text-lg font-semibold text-gray-900">Team Management</h3>
          </div>
        </div>
        <div className="p-6 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      </div>
    )
  }

  // Check if user has no subscription (limit = 0)
  const noSubscription = limits.limit === 0

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-5 h-5" style={{ color: '#0066cc' }} />
              <h3 className="text-lg font-semibold text-gray-900">Team Management</h3>
            </div>
            <p className="text-sm text-gray-500">
              Invite team members to collaborate on your store
            </p>
          </div>
          {!noSubscription && (
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">
                {limits.used} of {limits.limit} invitations used
              </p>
              <div className="w-24 h-2 bg-gray-200 rounded-full mt-1">
                <div
                  className="h-2 rounded-full transition-all"
                  style={{
                    width: `${Math.min((limits.used / limits.limit) * 100, 100)}%`,
                    background: limits.used >= limits.limit ? '#dc2626' : 'linear-gradient(135deg, #0066cc 0%, #0099ff 100%)'
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="p-6">
        {noSubscription ? (
          // No subscription - show upgrade prompt
          <div className="text-center py-6">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-gray-400" />
            </div>
            <h4 className="text-lg font-semibold text-gray-900 mb-2">
              Team Features Require a Subscription
            </h4>
            <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
              Upgrade to Starter to invite up to 3 team members, or Pro to invite up to 10 team members.
            </p>
            <Button
              className="h-11 px-6 text-base font-medium"
              style={{
                background: 'linear-gradient(135deg, #0066cc 0%, #0099ff 100%)',
                border: 'none'
              }}
              onClick={() => window.location.href = `/settings?shop=${shopDomain}#subscription`}
            >
              <ArrowUpRight className="w-4 h-4 mr-2" />
              View Subscription Plans
            </Button>
          </div>
        ) : (
          <>
            {/* Invite Form */}
            <form onSubmit={handleInvite} className="mb-6">
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_160px_auto] gap-3">
                <Input
                  type="email"
                  placeholder="Email address"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  disabled={sending || !limits.canInvite}
                  className="h-11"
                />
                <Input
                  type="text"
                  placeholder="Name (optional)"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  disabled={sending || !limits.canInvite}
                  className="h-11"
                />
                <Button
                  type="submit"
                  className="h-11 px-6 whitespace-nowrap"
                  style={{
                    background: limits.canInvite
                      ? 'linear-gradient(135deg, #0066cc 0%, #0099ff 100%)'
                      : '#d1d5db',
                    border: 'none'
                  }}
                  disabled={sending || !limits.canInvite}
                >
                  {sending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Invite
                    </>
                  )}
                </Button>
              </div>
              {!limits.canInvite && limits.limit > 0 && (
                <p className="text-sm text-red-600 mt-2 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  Invitation limit reached. Upgrade your plan to invite more team members.
                </p>
              )}
            </form>

            {/* Pending Invitations */}
            {invitations.filter(i => i.status === 'pending').length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Pending Invitations</h4>
                <div className="space-y-2">
                  {invitations
                    .filter(i => i.status === 'pending')
                    .map((invitation) => (
                      <div
                        key={invitation.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-yellow-50 border border-yellow-200"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-yellow-200 flex items-center justify-center">
                            <Mail className="w-5 h-5 text-yellow-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {invitation.invited_name || invitation.invited_email}
                            </p>
                            {invitation.invited_name && (
                              <p className="text-xs text-gray-500">{invitation.invited_email}</p>
                            )}
                            <p className="text-xs text-yellow-600 mt-0.5">
                              {getTimeRemaining(invitation.expires_at)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleResend(invitation.id)}
                            disabled={actionLoading === invitation.id}
                            className="h-8"
                          >
                            {actionLoading === invitation.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <>
                                <RefreshCw className="w-3 h-3 mr-1" />
                                Resend
                              </>
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRevoke(invitation.id)}
                            disabled={actionLoading === invitation.id}
                            className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Past Invitations (Accepted/Expired/Revoked) */}
            {invitations.filter(i => i.status !== 'pending').length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-500 mb-3">Past Invitations</h4>
                <div className="space-y-2">
                  {invitations
                    .filter(i => i.status !== 'pending')
                    .slice(0, 5) // Show only last 5
                    .map((invitation) => (
                      <div
                        key={invitation.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-200"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <Mail className="w-5 h-5 text-gray-400" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-700">
                              {invitation.invited_name || invitation.invited_email}
                            </p>
                            <p className="text-xs text-gray-400">
                              {invitation.invited_email}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {getStatusBadge(invitation.status)}
                          {(invitation.status === 'expired' || invitation.status === 'revoked') && limits.canInvite && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleResend(invitation.id)}
                              disabled={actionLoading === invitation.id}
                              className="h-8"
                            >
                              {actionLoading === invitation.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <>
                                  <RefreshCw className="w-3 h-3 mr-1" />
                                  Re-invite
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {invitations.length === 0 && (
              <div className="text-center py-6">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                  <UserPlus className="w-8 h-8 text-gray-400" />
                </div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">
                  Invite Your First Team Member
                </h4>
                <p className="text-sm text-gray-500 max-w-md mx-auto">
                  Team members will have access to your store's integrations and can help manage product descriptions and ads.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
