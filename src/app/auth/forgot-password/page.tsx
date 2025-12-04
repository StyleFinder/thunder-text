'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, Button, Input, Text } from '@/components/bhb';
import { colors } from '@/lib/design-system/colors';
import { layout } from '@/lib/design-system/layout';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, ArrowLeft, Mail } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send reset email');
      }

      setSuccess(true);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Something went wrong';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

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
          {success ? (
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
                Check Your Email
              </Text>

              <Text color={colors.grayText} style={{ marginBottom: layout.spacing.xl }}>
                If an account exists for <strong>{email}</strong>, we've sent password reset instructions to that address.
              </Text>

              <div style={{
                padding: layout.spacing.md,
                backgroundColor: colors.background,
                borderRadius: layout.cornerRadius,
                marginBottom: layout.spacing.lg
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: layout.spacing.sm, justifyContent: 'center' }}>
                  <Mail size={18} color={colors.grayText} />
                  <Text variant="bodySmall" color={colors.grayText}>
                    The link will expire in 1 hour
                  </Text>
                </div>
              </div>

              <Text variant="bodySmall" color={colors.grayText} style={{ marginBottom: layout.spacing.md }}>
                Didn't receive the email? Check your spam folder or{' '}
                <button
                  onClick={() => setSuccess(false)}
                  style={{
                    color: colors.smartBlue,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    padding: 0,
                    font: 'inherit'
                  }}
                >
                  try again
                </button>
              </Text>

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
          ) : (
            // Form State
            <>
              <div style={{ textAlign: 'center', marginBottom: layout.spacing.xl }}>
                <Text variant="h1" style={{ marginBottom: layout.spacing.xs }}>
                  Forgot Your Password?
                </Text>
                <Text color={colors.grayText}>
                  Enter your email address and we'll send you a link to reset your password.
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

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: layout.spacing.lg }}>
                <Input
                  label="Email Address"
                  type="email"
                  value={email}
                  onChange={setEmail}
                  placeholder="you@example.com"
                  required
                />

                <Button
                  type="submit"
                  variant="primary"
                  size="large"
                  fullWidth
                  disabled={loading || !email}
                >
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </Button>

                <div style={{
                  textAlign: 'center',
                  paddingTop: layout.spacing.md,
                  borderTop: `1px solid ${colors.border}`
                }}>
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
              </form>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
