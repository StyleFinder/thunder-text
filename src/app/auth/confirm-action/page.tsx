'use client';

import { useState, useEffect, ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
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
  ShieldAlert,
  Zap
} from 'lucide-react';

type ActionType = 'account_deletion' | 'email_change' | 'password_change' | 'disconnect_integration';

interface ActionInfo {
  icon: ReactNode;
  title: string;
  description: string;
  warningMessage: string;
  confirmButtonText: string;
  successMessage: string;
  color: string;
  isDangerous: boolean;
}

const actionDetails: Record<ActionType, ActionInfo> = {
  account_deletion: {
    icon: <Trash2 className="w-8 h-8" />,
    title: 'Confirm Account Deletion',
    description: 'You are about to permanently delete your account.',
    warningMessage: 'This action cannot be undone. All your data, including generated content, settings, and integrations will be permanently removed.',
    confirmButtonText: 'Yes, Delete My Account',
    successMessage: 'Your account has been successfully deleted.',
    color: '#dc2626',
    isDangerous: true
  },
  email_change: {
    icon: <Mail className="w-8 h-8" />,
    title: 'Confirm Email Change',
    description: 'You are about to change your email address.',
    warningMessage: 'After confirming, you will need to use your new email address to log in.',
    confirmButtonText: 'Confirm Email Change',
    successMessage: 'Your email address has been successfully changed.',
    color: '#0066cc',
    isDangerous: false
  },
  password_change: {
    icon: <Key className="w-8 h-8" />,
    title: 'Confirm Password Change',
    description: 'You are about to change your password.',
    warningMessage: 'This will update your password immediately. You may need to log in again on other devices.',
    confirmButtonText: 'Confirm Password Change',
    successMessage: 'Your password has been successfully changed.',
    color: '#0066cc',
    isDangerous: false
  },
  disconnect_integration: {
    icon: <Unplug className="w-8 h-8" />,
    title: 'Confirm Integration Disconnect',
    description: 'You are about to disconnect an integration.',
    warningMessage: 'This will revoke access and remove all associated data. You can reconnect later if needed.',
    confirmButtonText: 'Disconnect Integration',
    successMessage: 'The integration has been successfully disconnected.',
    color: '#f59e0b',
    isDangerous: false
  }
};

export default function ConfirmActionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [tokenValid, setTokenValid] = useState(false);
  const [actionType, setActionType] = useState<ActionType | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<Record<string, unknown> | null>(null);

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

      if (actionType === 'account_deletion') {
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

  // Loading state while verifying
  if (verifying) {
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
            <div className="text-center py-8">
              <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" style={{ color: '#0066cc' }} />
              <h2 className="text-xl font-semibold text-gray-900">Verifying Confirmation Link...</h2>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{
        background: 'linear-gradient(135deg, #001429 0%, #002952 50%, #003d7a 100%)'
      }}
    >
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #ffcc00 0%, #ff9900 100%)' }}
          >
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-white">Thunder Text</span>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {success && actionInfo ? (
            // Success State
            <div className="text-center">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
                style={{ background: 'rgba(34, 197, 94, 0.1)' }}
              >
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-3">Action Confirmed</h1>
              <p className="text-gray-500 mb-6">{actionInfo.successMessage}</p>
              {actionType === 'account_deletion' ? (
                <p className="text-sm text-gray-400">Redirecting you to the home page...</p>
              ) : (
                <Button
                  className="w-full h-11 text-base font-medium"
                  style={{
                    background: 'linear-gradient(135deg, #0066cc 0%, #0099ff 100%)',
                    border: 'none'
                  }}
                  onClick={() => router.push('/dashboard')}
                >
                  Go to Dashboard
                </Button>
              )}
            </div>
          ) : !tokenValid ? (
            // Invalid Token State
            <div className="text-center">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
                style={{ background: 'rgba(220, 38, 38, 0.1)' }}
              >
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-3">Link Expired or Invalid</h1>
              <p className="text-gray-500 mb-6">
                {error || 'This confirmation link has expired or is invalid. Please try the action again from your dashboard.'}
              </p>
              <Button
                className="w-full h-11 text-base font-medium mb-4"
                style={{
                  background: 'linear-gradient(135deg, #0066cc 0%, #0099ff 100%)',
                  border: 'none'
                }}
                onClick={() => router.push('/dashboard')}
              >
                Go to Dashboard
              </Button>
              <Link
                href="/auth/login"
                className="inline-flex items-center gap-2 text-sm font-medium hover:underline"
                style={{ color: '#0066cc' }}
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Login
              </Link>
            </div>
          ) : actionInfo ? (
            // Confirmation Form State
            <>
              <div className="text-center mb-6">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
                  style={{
                    background: `${actionInfo.color}15`,
                    color: actionInfo.color
                  }}
                >
                  {actionInfo.icon}
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">{actionInfo.title}</h1>
                <p className="text-gray-500">{actionInfo.description}</p>
              </div>

              {error && (
                <Alert variant="destructive" className="mb-6">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Warning Box */}
              <div
                className="p-4 rounded-xl mb-6"
                style={{
                  background: actionInfo.isDangerous ? 'rgba(220, 38, 38, 0.05)' : '#f9fafb',
                  border: actionInfo.isDangerous ? '1px solid rgba(220, 38, 38, 0.2)' : '1px solid #e5e7eb'
                }}
              >
                <div className="flex items-start gap-3">
                  <ShieldAlert
                    className="w-5 h-5 flex-shrink-0 mt-0.5"
                    style={{ color: actionInfo.isDangerous ? '#dc2626' : '#6b7280' }}
                  />
                  <p
                    className="text-sm"
                    style={{ color: actionInfo.isDangerous ? '#dc2626' : '#6b7280' }}
                  >
                    {actionInfo.warningMessage}
                  </p>
                </div>
              </div>

              {/* Metadata */}
              {metadata && Object.keys(metadata).length > 0 && (
                <div className="p-4 bg-gray-50 rounded-xl mb-6">
                  <p className="text-xs font-semibold text-gray-500 mb-2">Details:</p>
                  {actionType === 'email_change' && typeof metadata.newEmail === 'string' && (
                    <p className="text-sm text-gray-700">
                      New email: <strong>{metadata.newEmail}</strong>
                    </p>
                  )}
                  {actionType === 'disconnect_integration' && typeof metadata.provider === 'string' && (
                    <p className="text-sm text-gray-700">
                      Integration: <strong>{metadata.provider}</strong>
                    </p>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="space-y-3">
                <Button
                  className="w-full h-11 text-base font-medium"
                  style={{
                    background: actionInfo.isDangerous
                      ? '#dc2626'
                      : 'linear-gradient(135deg, #0066cc 0%, #0099ff 100%)',
                    border: 'none'
                  }}
                  disabled={loading}
                  onClick={handleConfirm}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    actionInfo.confirmButtonText
                  )}
                </Button>

                <Button
                  variant="outline"
                  className="w-full h-11 border-gray-200 hover:bg-gray-50"
                  disabled={loading}
                  onClick={() => router.push('/dashboard')}
                >
                  Cancel
                </Button>
              </div>

              <div className="pt-6 mt-6 border-t border-gray-200 text-center">
                <p className="text-xs text-gray-400">
                  This confirmation link will expire in 30 minutes.
                </p>
              </div>
            </>
          ) : (
            // Unknown action type
            <div className="text-center">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
                style={{ background: 'rgba(220, 38, 38, 0.1)' }}
              >
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-3">Unknown Action</h1>
              <p className="text-gray-500 mb-6">
                We couldn't recognize the requested action. Please try again from your dashboard.
              </p>
              <Button
                className="w-full h-11 text-base font-medium"
                style={{
                  background: 'linear-gradient(135deg, #0066cc 0%, #0099ff 100%)',
                  border: 'none'
                }}
                onClick={() => router.push('/dashboard')}
              >
                Go to Dashboard
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
