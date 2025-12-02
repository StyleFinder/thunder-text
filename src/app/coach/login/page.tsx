'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, Button, Input, Text } from '@/components/bhb';
import { colors } from '@/lib/design-system/colors';
import { layout } from '@/lib/design-system/layout';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { logger } from '@/lib/logger'

export default function CoachLoginPage() {
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
      userType: 'coach', // Coach login
      redirect: false
    });

    if (result?.error) {
      logger.error('[Coach Login] Login failed:', result.error, undefined, { component: 'login' });
      setError('Invalid coach credentials');
      setLoading(false);
      return;
    }

    console.log('[Coach Login] Login successful, redirecting to BHB dashboard...');
    const callbackUrl = searchParams.get('callbackUrl') || '/bhb';
    router.push(callbackUrl);
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #000000 0%, #434343 50%, #C0C0C0 100%)',
      padding: layout.spacing.lg
    }}>
      <div style={{ maxWidth: '500px', width: '100%' }}>
        <Card>
          <div style={{ textAlign: 'center', marginBottom: layout.spacing.xl }}>
            <div style={{ marginBottom: layout.spacing.lg }}>
              <Text style={{
                fontSize: '32px',
                fontWeight: 700,
                color: '#000000',
                textAlign: 'center',
                display: 'block'
              }}>
                Boutique Hub Black
              </Text>
            </div>
            <Text variant="h1" style={{ marginBottom: layout.spacing.xs }}>
              Coach Portal
            </Text>
            <Text color={colors.grayText}>
              Monitor store performance and pixel health
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
              label="Coach Email"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="coach@theboutiquehub.com"
              required
            />

            <Input
              label="Password"
              type="password"
              value={password}
              onChange={setPassword}
              placeholder="••••••••"
              required
            />

            <Button
              type="submit"
              variant="primary"
              size="large"
              fullWidth
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In as Coach'}
            </Button>

            <div style={{
              marginTop: layout.spacing.lg,
              padding: layout.spacing.md,
              backgroundColor: colors.backgroundLight,
              borderRadius: layout.cornerRadius,
              textAlign: 'center'
            }}>
              <Text variant="bodySmall" color={colors.grayText}>
                For BoutiqueHub Black coaches only
              </Text>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
