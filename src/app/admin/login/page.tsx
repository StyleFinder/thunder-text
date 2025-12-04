'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, Shield, Key } from 'lucide-react';
import { logger } from '@/lib/logger';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [requires2FA, setRequires2FA] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        userType: 'admin',
        totpCode: requires2FA ? totpCode : undefined,
        redirect: false
      });

      if (result?.error) {
        // Check for 2FA-specific errors
        if (result.error.includes('2FA_REQUIRED')) {
          setRequires2FA(true);
          setError('');
          setLoading(false);
          return;
        }

        if (result.error.includes('2FA_INVALID')) {
          setError('Invalid authentication code. Please try again.');
          setLoading(false);
          return;
        }

        if (result.error.includes('ACCOUNT_LOCKED')) {
          const lockoutSeconds = parseInt(result.error.split(':')[1]) || 900;
          const lockoutMinutes = Math.ceil(lockoutSeconds / 60);
          setError(`Account temporarily locked. Please try again in ${lockoutMinutes} minute${lockoutMinutes > 1 ? 's' : ''}.`);
          setLoading(false);
          return;
        }

        setError('Invalid email or password');
        setLoading(false);
        return;
      }

      router.push('/admin/coaches');
    } catch (err) {
      logger.error('Login error:', err as Error, { component: 'admin-login' });
      setError('An error occurred during login');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-5" style={{
      background: 'linear-gradient(135deg, #434343 0%, #000000 100%)'
    }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Admin Portal
          </h1>
          <p className="text-white/70 text-lg">
            System Administration
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {requires2FA ? (
                <>
                  <Shield className="h-5 w-5" />
                  Two-Factor Authentication
                </>
              ) : (
                'Sign In'
              )}
            </CardTitle>
            <CardDescription>
              {requires2FA
                ? 'Enter the code from your authenticator app'
                : 'Enter your credentials to access the admin panel'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {!requires2FA ? (
                // Email/Password form
                <>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@example.com"
                      autoComplete="email"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      required
                    />
                  </div>
                </>
              ) : (
                // 2FA code input
                <div className="space-y-4">
                  <div className="p-4 bg-muted rounded-lg text-center">
                    <Key className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Open your authenticator app (Google Authenticator, Authy, etc.)
                      and enter the 6-digit code.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="totpCode">Authentication Code</Label>
                    <Input
                      id="totpCode"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      value={totpCode}
                      onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="000000"
                      autoComplete="one-time-code"
                      className="text-center text-2xl tracking-widest"
                      required
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setRequires2FA(false);
                      setTotpCode('');
                      setError('');
                    }}
                    className="text-sm text-muted-foreground hover:underline w-full text-center"
                  >
                    Back to login
                  </button>
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-smart-blue-500 hover:bg-smart-blue-600"
                disabled={loading || (requires2FA && totpCode.length !== 6)}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {requires2FA ? 'Verify' : 'Sign In'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
