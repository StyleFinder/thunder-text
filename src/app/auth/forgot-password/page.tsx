'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Mail,
  Loader2,
  Zap,
  Send
} from 'lucide-react';

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

              <h1 className="text-2xl font-bold text-gray-900 mb-3">Check Your Email</h1>
              <p className="text-gray-500 mb-6">
                If an account exists for <strong className="text-gray-700">{email}</strong>, we've sent password reset instructions to that address.
              </p>

              <div className="p-4 bg-gray-50 rounded-xl mb-6">
                <div className="flex items-center justify-center gap-2 text-gray-500 text-sm">
                  <Mail className="w-4 h-4" />
                  <span>The link will expire in 1 hour</span>
                </div>
              </div>

              <p className="text-sm text-gray-400 mb-6">
                Didn't receive the email? Check your spam folder or{' '}
                <button
                  onClick={() => setSuccess(false)}
                  className="font-medium hover:underline"
                  style={{ color: '#0066cc' }}
                >
                  try again
                </button>
              </p>

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
                  <Mail className="w-8 h-8" style={{ color: '#0066cc' }} />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Forgot Your Password?</h1>
                <p className="text-gray-500">
                  Enter your email address and we'll send you a link to reset your password.
                </p>
              </div>

              {error && (
                <Alert variant="destructive" className="mb-6">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-700">Email address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      className="pl-10 h-11"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading || !email}
                  className="w-full h-11 text-base font-medium"
                  style={{
                    background: 'linear-gradient(135deg, #0066cc 0%, #0099ff 100%)',
                    border: 'none'
                  }}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      Send Reset Link
                      <Send className="w-4 h-4 ml-2" />
                    </>
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
