'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, Button, Text } from '@/components/bhb';
import { colors } from '@/lib/design-system/colors';
import { layout } from '@/lib/design-system/layout';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Loader2,
  Trash2,
  Mail,
  Key,
  Unplug,
  ShieldAlert
} from 'lucide-react';

type ActionType = 'account_deletion' | 'email_change' | 'password_change' | 'disconnect_integration';

interface ActionInfo {
  icon: React.ReactNode;
  title: string;
  description: string;
  warningMessage: string;
  confirmButtonText: string;
  successMessage: string;
  color: string;
}

const actionDetails: Record<ActionType, ActionInfo> = {
  account_deletion: {
    icon: <Trash2 size={32} />,
    title: 'Confirm Account Deletion',
    description: 'You are about to permanently delete your account.',
    warningMessage: 'This action cannot be undone. All your data, including generated content, settings, and integrations will be permanently removed.',
    confirmButtonText: 'Yes, Delete My Account',
    successMessage: 'Your account has been successfully deleted.',
    color: colors.error
  },
  email_change: {
    icon: <Mail size={32} />,
    title: 'Confirm Email Change',
    description: 'You are about to change your email address.',
    warningMessage: 'After confirming, you will need to use your new email address to log in.',
    confirmButtonText: 'Confirm Email Change',
    successMessage: 'Your email address has been successfully changed.',
    color: colors.smartBlue
  },
  password_change: {
    icon: <Key size={32} />,
    title: 'Confirm Password Change',
    description: 'You are about to change your password.',
    warningMessage: 'This will update your password immediately. You may need to log in again on other devices.',
    confirmButtonText: 'Confirm Password Change',
    successMessage: 'Your password has been successfully changed.',
    color: colors.smartBlue
  },
  disconnect_integration: {
    icon: <Unplug size={32} />,
    title: 'Confirm Integration Disconnect',
    description: 'You are about to disconnect an integration.',
    warningMessage: 'This will revoke access and remove all associated data. You can reconnect later if needed.',
    confirmButtonText: 'Disconnect Integration',
    successMessage: 'The integration has been successfully disconnected.',
    color: '#f59e0b'
  }
};

export default function ConfirmActionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const actionParam = searchParams.get('action') as ActionType | null;

  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [tokenValid, setTokenValid] = useState(false);
  const [actionType, setActionType] = useState<ActionType | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<Record<string, unknown> | null>(null);

  // Verify token on mount
  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setError('Invalid confirmation link. Please try again.');
        setVerifying(false);
        return;
      }

      try {
        const response = await fetch(`/api/auth/confirm-action?token=${token}`);
        const data = await response.json();

        if (!response.ok) {
          setError(data.error || 'Invalid or expired confirmation link');
          setTokenValid(false);
        } else {
          setTokenValid(true);
          setActionType(data.actionType);
          setActionId(data.actionId);
          setMetadata(data.metadata);
        }
      } catch {
        setError('Failed to verify confirmation link');
        setTokenValid(false);
      } finally {
        setVerifying(false);
      }
    };

    verifyToken();
  }, [token]);

  const handleConfirm = async () => {
    if (!token || !actionId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/confirm-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, actionId })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to confirm action');
      }

      setSuccess(true);

      // Redirect based on action type
      if (actionType === 'account_deletion') {
        // Account deleted - redirect to home after delay
        setTimeout(() => {
          router.push('/');
        }, 3000);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Something went wrong';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const actionInfo = actionType ? actionDetails[actionType] : null;

  // Loading state while verifying token
  if (verifying) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: `linear-gradient(135deg, ${colors.oxfordNavy} 0%, ${colors.smartBlue} 50%, ${colors.berryLipstick} 100%)`,
        padding: layout.spacing.lg
      }}>
        <div style={{ maxWidth: '500px', width: '100%' }}>
          <Card>
            <div style={{ textAlign: 'center', padding: layout.spacing.xl }}>
              <Loader2 size={48} color={colors.smartBlue} style={{ animation: 'spin 1s linear infinite' }} />
              <Text variant="h2" style={{ marginTop: layout.spacing.lg }}>
                Verifying Confirmation Link...
              </Text>
            </div>
          </Card>
        </div>
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: `linear-gradient(135deg, ${colors.oxfordNavy} 0%, ${colors.smartBlue} 50%, ${colors.berryLipstick} 100%)`,
      padding: layout.spacing.lg
    }}>
      <div style={{ maxWidth: '500px', width: '100%' }}>
        <Card>
          {success && actionInfo ? (
            // Success State
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: `${colors.success}15`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto',
                marginBottom: layout.spacing.lg
              }}>
                <CheckCircle2 size={32} color={colors.success} />
              </div>

              <Text variant="h1" style={{ marginBottom: layout.spacing.md }}>
                Action Confirmed
              </Text>

              <Text color={colors.grayText} style={{ marginBottom: layout.spacing.xl }}>
                {actionInfo.successMessage}
              </Text>

              {actionType === 'account_deletion' ? (
                <Text variant="bodySmall" color={colors.grayText}>
                  Redirecting you to the home page...
                </Text>
              ) : (
                <Button
                  variant="primary"
                  size="large"
                  fullWidth
                  onClick={() => router.push('/dashboard')}
                >
                  Go to Dashboard
                </Button>
              )}
            </div>
          ) : !tokenValid ? (
            // Invalid Token State
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: `${colors.error}15`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto',
                marginBottom: layout.spacing.lg
              }}>
                <AlertCircle size={32} color={colors.error} />
              </div>

              <Text variant="h1" style={{ marginBottom: layout.spacing.md }}>
                Link Expired or Invalid
              </Text>

              <Text color={colors.grayText} style={{ marginBottom: layout.spacing.xl }}>
                {error || 'This confirmation link has expired or is invalid. Please try the action again from your dashboard.'}
              </Text>

              <Button
                variant="primary"
                size="large"
                fullWidth
                onClick={() => router.push('/dashboard')}
                style={{ marginBottom: layout.spacing.md }}
              >
                Go to Dashboard
              </Button>

              <Link
                href="/auth/login"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: layout.spacing.xs,
                  color: colors.smartBlue,
                  textDecoration: 'none',
                  fontSize: '14px'
                }}
              >
                <ArrowLeft size={16} />
                Back to Login
              </Link>
            </div>
          ) : actionInfo ? (
            // Confirmation Form State
            <>
              <div style={{ textAlign: 'center', marginBottom: layout.spacing.xl }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  backgroundColor: `${actionInfo.color}15`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto',
                  marginBottom: layout.spacing.lg,
                  color: actionInfo.color
                }}>
                  {actionInfo.icon}
                </div>

                <Text variant="h1" style={{ marginBottom: layout.spacing.xs }}>
                  {actionInfo.title}
                </Text>
                <Text color={colors.grayText}>
                  {actionInfo.description}
                </Text>
              </div>

              {error && (
                <div style={{ marginBottom: layout.spacing.md }}>
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                </div>
              )}

              {/* Warning Box */}
              <div style={{
                padding: layout.spacing.md,
                backgroundColor: actionType === 'account_deletion' ? `${colors.error}08` : colors.background,
                borderRadius: layout.cornerRadius,
                border: actionType === 'account_deletion' ? `1px solid ${colors.error}30` : `1px solid ${colors.border}`,
                marginBottom: layout.spacing.lg
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: layout.spacing.sm }}>
                  <ShieldAlert
                    size={20}
                    color={actionType === 'account_deletion' ? colors.error : colors.grayText}
                    style={{ flexShrink: 0, marginTop: '2px' }}
                  />
                  <Text
                    variant="bodySmall"
                    color={actionType === 'account_deletion' ? colors.error : colors.grayText}
                  >
                    {actionInfo.warningMessage}
                  </Text>
                </div>
              </div>

              {/* Show metadata if available */}
              {metadata && Object.keys(metadata).length > 0 && (
                <div style={{
                  padding: layout.spacing.md,
                  backgroundColor: colors.background,
                  borderRadius: layout.cornerRadius,
                  marginBottom: layout.spacing.lg
                }}>
                  <Text variant="bodySmall" color={colors.grayText} style={{ fontWeight: 600, marginBottom: layout.spacing.xs }}>
                    Details:
                  </Text>
                  {actionType === 'email_change' && Boolean(metadata.newEmail) && (
                    <Text variant="bodySmall" color={colors.oxfordNavy}>
                      New email: <strong>{String(metadata.newEmail)}</strong>
                    </Text>
                  )}
                  {actionType === 'disconnect_integration' && Boolean(metadata.provider) && (
                    <Text variant="bodySmall" color={colors.oxfordNavy}>
                      Integration: <strong>{String(metadata.provider)}</strong>
                    </Text>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: layout.spacing.md }}>
                <Button
                  variant={actionType === 'account_deletion' ? 'secondary' : 'primary'}
                  size="large"
                  fullWidth
                  disabled={loading}
                  onClick={handleConfirm}
                  style={actionType === 'account_deletion' ? {
                    backgroundColor: colors.error,
                    borderColor: colors.error,
                    color: colors.white
                  } : undefined}
                >
                  {loading ? 'Processing...' : actionInfo.confirmButtonText}
                </Button>

                <Button
                  variant="secondary"
                  size="large"
                  fullWidth
                  onClick={() => router.push('/dashboard')}
                  disabled={loading}
                >
                  Cancel
                </Button>
              </div>

              <div style={{
                textAlign: 'center',
                paddingTop: layout.spacing.lg,
                marginTop: layout.spacing.md,
                borderTop: `1px solid ${colors.border}`
              }}>
                <Text variant="bodySmall" color={colors.grayText}>
                  This confirmation link will expire in 30 minutes.
                </Text>
              </div>
            </>
          ) : (
            // Unknown action type
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: `${colors.error}15`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto',
                marginBottom: layout.spacing.lg
              }}>
                <AlertCircle size={32} color={colors.error} />
              </div>

              <Text variant="h1" style={{ marginBottom: layout.spacing.md }}>
                Unknown Action
              </Text>

              <Text color={colors.grayText} style={{ marginBottom: layout.spacing.xl }}>
                We couldn't recognize the requested action. Please try again from your dashboard.
              </Text>

              <Button
                variant="primary"
                size="large"
                fullWidth
                onClick={() => router.push('/dashboard')}
              >
                Go to Dashboard
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
