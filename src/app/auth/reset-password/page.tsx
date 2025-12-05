'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Eye,
  EyeOff,
  Shield,
  Loader2,
  Zap,
  Lock
} from 'lucide-react';

type PasswordStrength = 'weak' | 'fair' | 'good' | 'strong';

interface PasswordValidation {
  isValid: boolean;
  errors: string[];
  strength: PasswordStrength;
}

const strengthColors: Record<PasswordStrength, string> = {
  weak: '#dc2626',
  fair: '#f59e0b',
  good: '#0066cc',
  strong: '#22c55e'
};

const strengthLabels: Record<PasswordStrength, string> = {
  weak: 'Weak',
  fair: 'Fair',
  good: 'Good',
  strong: 'Strong'
};

const strengthWidths: Record<PasswordStrength, string> = {
  weak: '25%',
  fair: '50%',
  good: '75%',
  strong: '100%'
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
              <h2 className="text-xl font-semibold text-gray-900">Verifying Reset Link...</h2>
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
          {success ? (
            // Success State
            <div className="text-center">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
                style={{ background: 'rgba(34, 197, 94, 0.1)' }}
              >
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-3">Password Reset Successfully</h1>
              <p className="text-gray-500 mb-6">
                Your password has been changed. You can now log in with your new password.
              </p>
              <Button
                className="w-full h-11 text-base font-medium"
                style={{
                  background: 'linear-gradient(135deg, #0066cc 0%, #0099ff 100%)',
                  border: 'none'
                }}
                onClick={() => router.push('/auth/login')}
              >
                Go to Login
              </Button>
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
                {error || 'This password reset link has expired or is invalid. Please request a new one.'}
              </p>
              <Button
                className="w-full h-11 text-base font-medium mb-4"
                style={{
                  background: 'linear-gradient(135deg, #0066cc 0%, #0099ff 100%)',
                  border: 'none'
                }}
                onClick={() => router.push('/auth/forgot-password')}
              >
                Request New Reset Link
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
          ) : (
            // Form State
            <>
              <div className="text-center mb-8">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
                  style={{ background: 'rgba(0, 102, 204, 0.1)' }}
                >
                  <Shield className="w-8 h-8" style={{ color: '#0066cc' }} />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Reset Your Password</h1>
                {maskedEmail && (
                  <p className="text-gray-500">
                    Enter a new password for <strong className="text-gray-700">{maskedEmail}</strong>
                  </p>
                )}
              </div>

              {error && (
                <Alert variant="destructive" className="mb-6">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-gray-700">New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter new password"
                      required
                      className="pl-10 pr-10 h-11"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Password Strength Indicator */}
                {validation && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full transition-all duration-300"
                          style={{
                            width: strengthWidths[validation.strength],
                            backgroundColor: strengthColors[validation.strength]
                          }}
                        />
                      </div>
                      <span
                        className="text-xs font-medium"
                        style={{ color: strengthColors[validation.strength] }}
                      >
                        {strengthLabels[validation.strength]}
                      </span>
                    </div>

                    {validation.errors.length > 0 && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">Requirements:</p>
                        {validation.errors.map((err, i) => (
                          <p key={i} className="text-xs text-red-500">• {err}</p>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-gray-700">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      required
                      className="pl-10 pr-10 h-11"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {confirmPassword && password !== confirmPassword && (
                    <p className="text-xs text-red-500">Passwords do not match</p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={loading || !validation?.isValid || password !== confirmPassword}
                  className="w-full h-11 text-base font-medium"
                  style={{
                    background: 'linear-gradient(135deg, #0066cc 0%, #0099ff 100%)',
                    border: 'none'
                  }}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Resetting Password...
                    </>
                  ) : (
                    'Reset Password'
                  )}
                </Button>

                <div className="pt-4 border-t border-gray-200 text-center">
                  <Link
                    href="/auth/login"
                    className="inline-flex items-center gap-2 text-sm font-medium hover:underline"
                    style={{ color: '#0066cc' }}
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Login
                  </Link>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
