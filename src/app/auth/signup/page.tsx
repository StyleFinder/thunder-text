'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { logger } from '@/lib/logger'

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [shopName, setShopName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Create account
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, shopName })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Signup failed');
      }

      console.log('[Signup Page] Account created, auto-logging in...');

      // Auto-login after signup
      const signInResult = await signIn('credentials', {
        email,
        password,
        userType: 'shop',
        redirect: false
      });

      if (signInResult?.error) {
        logger.error(`[Signup Page] Auto-login failed: ${signInResult.error}`, undefined, { component: 'signup' });
        throw new Error('Signup successful but login failed. Please login manually.');
      }

      console.log('[Signup Page] Auto-login successful, redirecting...');
      router.push('/dashboard');
    } catch (err: any) {
      logger.error('[Signup Page] Error:', err as Error, { component: 'signup' });
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-5" style={{
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      <div className="w-full max-w-[500px]">
        <Card>
          <CardContent className="p-6">
            <div className="text-center mb-6">
              <h1 className="text-[28px] font-semibold mb-2 text-oxford-900">
                Create Your Thunder Text Account
              </h1>
              <p className="text-muted-foreground">
                Start creating amazing product descriptions in minutes
              </p>
            </div>

            {error && (
              <Alert variant="destructive" className="mb-4 bg-berry-50 border-berry-500">
                <AlertDescription className="text-berry-700">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-oxford-900">
                  Email <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  placeholder="you@example.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-oxford-900">
                  Password <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  required
                />
                <p className="text-sm text-muted-foreground">
                  Minimum 8 characters
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="shopName" className="text-oxford-900">
                  Store Name (optional)
                </Label>
                <Input
                  id="shopName"
                  type="text"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  placeholder="My Awesome Store"
                />
                <p className="text-sm text-muted-foreground">
                  You can change this later
                </p>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-smart-500 hover:bg-smart-600 text-white"
                size="lg"
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </Button>

              <div className="text-center mt-4">
                <p className="text-muted-foreground">
                  Already have an account?{' '}
                  <Link href="/auth/login" className="text-smart-500 hover:underline">
                    Login
                  </Link>
                </p>
              </div>

              <div className="text-center mt-4 pt-4 border-t border-gray-200">
                <p className="text-muted-foreground">
                  Have a Shopify store?{' '}
                  <Link href="/auth/shopify" className="text-smart-500 hover:underline">
                    Connect with Shopify
                  </Link>
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
