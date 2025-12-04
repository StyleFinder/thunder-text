'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, Button, Input, Text } from '@/components/bhb';
import { colors } from '@/lib/design-system/colors';
import { layout } from '@/lib/design-system/layout';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { logger } from '@/lib/logger'

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);


    const result = await signIn('credentials', {
      email,
      password,
      userType: 'shop', // Standalone shop user
      redirect: false
    });

    if (result?.error) {
      logger.error(`[Login Page] Login failed: ${result.error}`, undefined, { component: 'login' });

      // Check for account lockout
      if (result.error.includes('ACCOUNT_LOCKED')) {
        const lockoutSeconds = parseInt(result.error.split(':')[1]) || 900;
        const lockoutMinutes = Math.ceil(lockoutSeconds / 60);
        setError(`Account temporarily locked due to too many failed attempts. Please try again in ${lockoutMinutes} minute${lockoutMinutes > 1 ? 's' : ''}.`);
      } else {
        setError('Invalid email or password');
      }
      setLoading(false);
      return;
    }

    console.log('[Login Page] Login successful, redirecting...');
    const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
    router.push(callbackUrl);
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
          <div style={{ textAlign: 'center', marginBottom: layout.spacing.xl }}>
            <Text variant="h1" style={{ marginBottom: layout.spacing.xs }}>
              Welcome Back to Thunder Text
            </Text>
            <Text color={colors.grayText}>
              Sign in to create amazing product descriptions
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
              label="Email"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="you@example.com"
              required
            />

            <div>
              <Input
                label="Password"
                type="password"
                value={password}
                onChange={setPassword}
                placeholder="••••••••"
                required
              />
              <div style={{ textAlign: 'right', marginTop: layout.spacing.xs }}>
                <Link
                  href="/auth/forgot-password"
                  style={{
                    color: colors.smartBlue,
                    textDecoration: 'none',
                    fontSize: '13px'
                  }}
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="large"
              fullWidth
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>

            <div style={{
              marginTop: layout.spacing.lg,
              padding: layout.spacing.md,
              backgroundColor: colors.backgroundLight,
              borderRadius: layout.cornerRadius,
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              gap: layout.spacing.sm
            }}>
              <Text variant="bodySmall" color={colors.grayText}>
                Don't have an account?{' '}
                <Link href="/auth/signup" style={{ color: colors.smartBlue, textDecoration: 'none' }}>
                  Sign up
                </Link>
              </Text>

              <div style={{ borderTop: `1px solid ${colors.grayText}`, paddingTop: layout.spacing.sm }}>
                <Text variant="bodySmall" color={colors.grayText}>
                  Have a Shopify store?{' '}
                  <Link href="/auth/shopify" style={{ color: colors.smartBlue, textDecoration: 'none' }}>
                    Connect with Shopify
                  </Link>
                </Text>
              </div>

              <Text variant="bodySmall" color={colors.grayText}>
                Are you a coach?{' '}
                <Link href="/coach/login" style={{ color: colors.smartBlue, textDecoration: 'none' }}>
                  Coach Login
                </Link>
              </Text>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
