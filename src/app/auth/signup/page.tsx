'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertCircle,
  Zap,
  FileText,
  Target,
  Users,
  ArrowRight,
  Loader2,
  Mail,
  Lock,
  Store,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import { logger } from '@/lib/logger';

// Gradient mesh background for left panel
function GradientMesh() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(135deg, #001429 0%, #002952 50%, #003d7a 100%)'
        }}
      />
      {/* Animated orbs */}
      <div
        className="absolute w-96 h-96 rounded-full blur-3xl opacity-20 animate-welcome-float"
        style={{
          background: 'radial-gradient(circle, #0099ff 0%, transparent 70%)',
          top: '10%',
          right: '-10%'
        }}
      />
      <div
        className="absolute w-80 h-80 rounded-full blur-3xl opacity-15 animate-welcome-float-slow"
        style={{
          background: 'radial-gradient(circle, #ffcc00 0%, transparent 70%)',
          bottom: '20%',
          left: '-5%'
        }}
      />
      <div
        className="absolute w-64 h-64 rounded-full blur-3xl opacity-10 animate-welcome-float-slower"
        style={{
          background: 'radial-gradient(circle, #0066cc 0%, transparent 70%)',
          top: '50%',
          right: '20%'
        }}
      />
    </div>
  );
}

// Benefit item for left panel
function BenefitItem({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3">
      <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
      <span style={{ color: 'rgba(255, 255, 255, 0.9)' }} className="text-sm">
        {text}
      </span>
    </div>
  );
}

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
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      logger.error('[Signup Page] Error:', err as Error, { component: 'signup' });
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Brand/Marketing */}
      <div className="hidden lg:flex lg:w-[420px] xl:w-[480px] relative flex-col justify-between p-8 overflow-hidden">
        <GradientMesh />

        {/* Content */}
        <div className="relative z-10">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-12">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #ffcc00 0%, #ff9900 100%)' }}
            >
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">Thunder Text</span>
          </div>

          {/* Headline */}
          <div className="mb-10">
            <h1
              className="text-3xl font-bold mb-3 leading-tight"
              style={{ color: 'white' }}
            >
              Start your<br />
              <span
                className="text-transparent bg-clip-text"
                style={{ backgroundImage: 'linear-gradient(90deg, #ffcc00 0%, #ff9900 100%)' }}
              >
                14-day free trial
              </span>
            </h1>
            <p style={{ color: 'rgba(255, 255, 255, 0.7)' }} className="text-base">
              No credit card required. Get instant access to AI-powered product descriptions and ad copy.
            </p>
          </div>

          {/* Benefits */}
          <div className="space-y-4">
            <BenefitItem text="Unlimited product descriptions" />
            <BenefitItem text="AI-powered ad copy generation" />
            <BenefitItem text="Personal BHB coaching session" />
            <BenefitItem text="Brand voice customization" />
            <BenefitItem text="Shopify & Lightspeed integration" />
          </div>
        </div>

        {/* Bottom testimonial */}
        <div className="relative z-10 pt-8 border-t" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
          <div
            className="p-4 rounded-xl"
            style={{ background: 'rgba(255, 255, 255, 0.05)' }}
          >
            <p style={{ color: 'rgba(255, 255, 255, 0.8)' }} className="text-sm italic mb-3">
              "Thunder Text saved us 20+ hours per week on product descriptions. The AI just gets our brand voice."
            </p>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500" />
              <div>
                <div className="text-white text-sm font-medium">Sarah M.</div>
                <div style={{ color: 'rgba(255, 255, 255, 0.5)' }} className="text-xs">Boutique Owner</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Signup Form */}
      <div className="flex-1 flex items-center justify-center bg-gray-50 p-6 lg:p-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #0066cc 0%, #0099ff 100%)' }}
            >
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">Thunder Text</span>
          </div>

          {/* Form Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Create your account</h2>
              <p className="text-gray-500">Start your free 14-day trial today</p>
            </div>

            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-700">
                  Email address <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    placeholder="you@example.com"
                    required
                    className="pl-10 h-11"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-700">
                  Password <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    placeholder="••••••••"
                    required
                    className="pl-10 h-11"
                  />
                </div>
                <p className="text-xs text-gray-400">Minimum 8 characters</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="shopName" className="text-gray-700">
                  Store name <span className="text-gray-400 font-normal">(optional)</span>
                </Label>
                <div className="relative">
                  <Store className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="shopName"
                    type="text"
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    placeholder="My Awesome Store"
                    className="pl-10 h-11"
                  />
                </div>
                <p className="text-xs text-gray-400">You can change this later</p>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 text-base font-medium"
                style={{
                  background: 'linear-gradient(135deg, #0066cc 0%, #0099ff 100%)',
                  border: 'none'
                }}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  <>
                    Create account
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>

              <p className="text-xs text-center text-gray-400">
                By creating an account, you agree to our{' '}
                <Link href="/privacy" className="underline hover:text-gray-600">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link href="/privacy" className="underline hover:text-gray-600">
                  Privacy Policy
                </Link>
              </p>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">or continue with</span>
              </div>
            </div>

            {/* Alternative signup */}
            <div className="space-y-3">
              <Link href="/auth/shopify" className="block">
                <Button
                  variant="outline"
                  className="w-full h-11 border-gray-200 hover:bg-gray-50"
                >
                  <Image
                    src="/shopify-logo.svg"
                    alt="Shopify"
                    width={20}
                    height={20}
                    className="mr-2"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                  Connect with Shopify
                </Button>
              </Link>
            </div>

            {/* Login link */}
            <p className="mt-6 text-center text-sm text-gray-500">
              Already have an account?{' '}
              <Link
                href="/auth/login"
                className="font-medium hover:underline"
                style={{ color: '#0066cc' }}
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
