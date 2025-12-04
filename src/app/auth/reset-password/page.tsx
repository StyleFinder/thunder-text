'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, Button, Input, Text } from '@/components/bhb';
import { colors } from '@/lib/design-system/colors';
import { layout } from '@/lib/design-system/layout';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, ArrowLeft, Eye, EyeOff, Shield, Loader2 } from 'lucide-react';

type PasswordStrength = 'weak' | 'fair' | 'good' | 'strong';

interface PasswordValidation {
  isValid: boolean;
  errors: string[];
  strength: PasswordStrength;
}

const strengthColors: Record<PasswordStrength, string> = {
  weak: colors.error,
  fair: '#f59e0b',
  good: colors.smartBlue,
  strong: colors.success
};

const strengthLabels: Record<PasswordStrength, string> = {
  weak: 'Weak',
  fair: 'Fair',
  good: 'Good',
  strong: 'Strong'
};

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [maskedEmail, setMaskedEmail] = useState<string | null>(null);
  const [tokenValid, setTokenValid] = useState(false);
  const [validation, setValidation] = useState<PasswordValidation | null>(null);

  // Verify token on mount
  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setError('Invalid reset link. Please request a new password reset.');
        setVerifying(false);
        return;
      }

      try {
        const response = await fetch(`/api/auth/reset-password?token=${token}`);
        const data = await response.json();

        if (!response.ok) {
          setError(data.error || 'Invalid or expired reset link');
          setTokenValid(false);
        } else {
          setTokenValid(true);
          setMaskedEmail(data.email);
        }
      } catch {
        setError('Failed to verify reset link');
        setTokenValid(false);
      } finally {
        setVerifying(false);
      }
    };

    verifyToken();
  }, [token]);

  // Validate password as user types
  useEffect(() => {
    if (!password) {
      setValidation(null);
      return;
    }

    const errors: string[] = [];
    let score = 0;

    if (password.length >= 8) score += 1;
    else errors.push('At least 8 characters');

    if (/[A-Z]/.test(password)) score += 1;
    else errors.push('One uppercase letter');

    if (/[a-z]/.test(password)) score += 1;
    else errors.push('One lowercase letter');

    if (/[0-9]/.test(password)) score += 1;
    else errors.push('One number');

    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 1;

    let strength: PasswordStrength = 'weak';
    if (score >= 5) strength = 'strong';
    else if (score >= 4) strength = 'good';
    else if (score >= 3) strength = 'fair';

    setValidation({
      isValid: errors.length === 0,
      errors,
      strength
    });
  }, [password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (!validation?.isValid) {
      setError('Please meet all password requirements');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset password');
      }

      setSuccess(true);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Something went wrong';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

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
                Verifying Reset Link...
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
                Password Reset Successfully
              </Text>

              <Text color={colors.grayText} style={{ marginBottom: layout.spacing.xl }}>
                Your password has been changed. You can now log in with your new password.
              </Text>

              <Button
                variant="primary"
                size="large"
                fullWidth
                onClick={() => router.push('/auth/login')}
              >
                Go to Login
              </Button>
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
                {error || 'This password reset link has expired or is invalid. Please request a new one.'}
              </Text>

              <Button
                variant="primary"
                size="large"
                fullWidth
                onClick={() => router.push('/auth/forgot-password')}
                style={{ marginBottom: layout.spacing.md }}
              >
                Request New Reset Link
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
          ) : (
            // Form State
            <>
              <div style={{ textAlign: 'center', marginBottom: layout.spacing.xl }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  backgroundColor: `${colors.smartBlue}15`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto',
                  marginBottom: layout.spacing.lg
                }}>
                  <Shield size={32} color={colors.smartBlue} />
                </div>

                <Text variant="h1" style={{ marginBottom: layout.spacing.xs }}>
                  Reset Your Password
                </Text>
                {maskedEmail && (
                  <Text color={colors.grayText}>
                    Enter a new password for <strong>{maskedEmail}</strong>
                  </Text>
                )}
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
                <div style={{ position: 'relative' }}>
                  <Input
                    label="New Password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={setPassword}
                    placeholder="Enter new password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '38px',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: colors.grayText
                    }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {/* Password Strength Indicator */}
                {validation && (
                  <div style={{ marginTop: `-${layout.spacing.sm}` }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: layout.spacing.sm,
                      marginBottom: layout.spacing.xs
                    }}>
                      <div style={{
                        flex: 1,
                        height: '4px',
                        backgroundColor: colors.border,
                        borderRadius: '2px',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          width: validation.strength === 'weak' ? '25%' :
                                 validation.strength === 'fair' ? '50%' :
                                 validation.strength === 'good' ? '75%' : '100%',
                          height: '100%',
                          backgroundColor: strengthColors[validation.strength],
                          transition: 'width 0.3s ease'
                        }} />
                      </div>
                      <Text variant="bodySmall" style={{ color: strengthColors[validation.strength] }}>
                        {strengthLabels[validation.strength]}
                      </Text>
                    </div>

                    {validation.errors.length > 0 && (
                      <div style={{
                        padding: layout.spacing.sm,
                        backgroundColor: colors.background,
                        borderRadius: layout.cornerRadius
                      }}>
                        <Text variant="bodySmall" color={colors.grayText} style={{ marginBottom: layout.spacing.xs }}>
                          Requirements:
                        </Text>
                        {validation.errors.map((err, i) => (
                          <Text key={i} variant="bodySmall" color={colors.error} style={{ display: 'block' }}>
                            • {err}
                          </Text>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div style={{ position: 'relative' }}>
                  <Input
                    label="Confirm Password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                    placeholder="Confirm new password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '38px',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: colors.grayText
                    }}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {confirmPassword && password !== confirmPassword && (
                  <Text variant="bodySmall" color={colors.error} style={{ marginTop: `-${layout.spacing.sm}` }}>
                    Passwords do not match
                  </Text>
                )}

                <Button
                  type="submit"
                  variant="primary"
                  size="large"
                  fullWidth
                  disabled={loading || !validation?.isValid || password !== confirmPassword}
                >
                  {loading ? 'Resetting Password...' : 'Reset Password'}
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
