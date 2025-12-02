'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, FileText, Target, Users, Gift, ShoppingBag, Facebook } from 'lucide-react';
import { logger } from '@/lib/logger'

type OnboardingStep = 'welcome' | 'shopify' | 'social' | 'complete';

interface ConnectionStatus {
  shopify: boolean;
  shopifyDomain?: string;
  facebook: boolean;
  google: boolean;
  pinterest: boolean;
  tiktok: boolean;
}

export default function WelcomePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
  const [shopDomain, setShopDomain] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<'shopify' | 'lightspeed' | 'commentsold' | null>(null);
  const [connections, setConnections] = useState<ConnectionStatus>({
    shopify: false,
    facebook: false,
    google: false,
    pinterest: false,
    tiktok: false,
  });

  // Handle step parameter from OAuth callbacks
  useEffect(() => {
    const stepParam = searchParams.get('step');
    if (stepParam && ['welcome', 'shopify', 'social', 'complete'].includes(stepParam)) {
      setCurrentStep(stepParam as OnboardingStep);
    }

    // Check if Facebook was just connected (from OAuth callback)
    const facebookConnected = searchParams.get('facebook_connected');
    if (facebookConnected === 'true') {
      // Re-check connections to update UI
      checkExistingConnections();
    }
  }, [searchParams]);

  // Check existing connections on mount
  useEffect(() => {
    checkExistingConnections();
  }, []);

  const checkExistingConnections = async () => {
    try {
      // Get shop from URL params
      const shop = searchParams.get('shop');
      if (!shop) {
        console.log('No shop parameter, skipping connection check');
        return;
      }

      const response = await fetch(`/api/settings/connections?shop=${shop}`);
      if (response.ok) {
        const data = await response.json();

        const newConnections: ConnectionStatus = {
          shopify: false,
          facebook: false,
          google: false,
          pinterest: false,
          tiktok: false,
        };

        data.connections?.forEach((conn: any) => {
          if (conn.provider === 'shopify' && conn.connected) {
            newConnections.shopify = true;
            newConnections.shopifyDomain = conn.metadata?.shop_domain;
          }
          if (conn.provider === 'facebook' && conn.connected) {
            newConnections.facebook = true;
          }
          if (conn.provider === 'google' && conn.connected) {
            newConnections.google = true;
          }
          if (conn.provider === 'pinterest' && conn.connected) {
            newConnections.pinterest = true;
          }
          if (conn.provider === 'tiktok' && conn.connected) {
            newConnections.tiktok = true;
          }
        });

        setConnections(newConnections);

        // If already connected to Shopify, skip to social or complete
        if (newConnections.shopify) {
          setCurrentStep('social');
        }
      }
    } catch (error) {
      logger.error('Error checking connections:', error as Error, { component: 'welcome' });
    }
  };

  const handleConnectShopify = () => {
    if (!shopDomain) {
      alert('Please enter your Shopify store domain');
      return;
    }

    setIsConnecting(true);

    // Normalize shop domain
    let normalizedShop = shopDomain.trim().toLowerCase();
    normalizedShop = normalizedShop
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '');

    if (!normalizedShop.includes('.myshopify.com')) {
      normalizedShop = `${normalizedShop}.myshopify.com`;
    }

    // Store return URL for after OAuth
    sessionStorage.setItem('onboarding_return', 'social');

    // Redirect to Shopify OAuth
    window.location.href = `/api/auth/shopify?shop=${normalizedShop}`;
  };

  const handleConnectFacebook = () => {
    // Get shop from URL params (passed after Shopify OAuth)
    const shop = searchParams.get('shop');

    if (!shop) {
      logger.error('Missing shop parameter for Facebook OAuth', undefined, { component: 'welcome' });
      alert('Unable to connect Facebook. Please reconnect your Shopify store first.');
      return;
    }

    sessionStorage.setItem('onboarding_return', 'complete');
    window.location.href = `/api/facebook/oauth/authorize?shop=${shop}&return_to=welcome`;
  };

  const handleSkipSocial = () => {
    setCurrentStep('complete');
  };

  const handleGoToDashboard = () => {
    router.push('/dashboard');
  };

  // Progress calculation
  const getProgress = () => {
    switch (currentStep) {
      case 'welcome': return 0;
      case 'shopify': return 33;
      case 'social': return 66;
      case 'complete': return 100;
      default: return 0;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 px-6 py-8">
      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-md border border-gray-200 p-8">
        {/* Progress Bar */}
        <div className="mb-8">
          <Progress value={getProgress()} className="h-2" />
          <p className="text-sm text-muted-foreground mt-2">Step {currentStep === 'welcome' ? 1 : currentStep === 'shopify' ? 2 : currentStep === 'social' ? 3 : 4} of 4</p>
        </div>

      {/* Step 1: Welcome */}
      {currentStep === 'welcome' && (
        <div>
          <div className="text-center pb-4 mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Welcome to Thunder Text & ACE Suite</h1>
            <p className="text-lg mt-2 text-gray-600">
              AI-powered product descriptions and ad copy for your e-commerce store
            </p>
          </div>
          <div className="space-y-6">
            {/* Feature Cards */}
            <div className="grid md:grid-cols-3 gap-4">
              <Card className="border-gray-200">
                <CardContent className="pt-6">
                  <div className="text-center space-y-3">
                    <FileText className="h-8 w-8 mx-auto text-primary" />
                    <h3 className="font-semibold text-gray-900">Thunder Text</h3>
                    <p className="text-sm text-gray-600">
                      Generate compelling product descriptions from your images and product data
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-gray-200">
                <CardContent className="pt-6">
                  <div className="text-center space-y-3">
                    <Target className="h-8 w-8 mx-auto text-primary" />
                    <h3 className="font-semibold text-gray-900">ACE (Ad Copy Engine)</h3>
                    <p className="text-sm text-gray-600">
                      Create high-converting Facebook and social media ads with AI
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-gray-200">
                <CardContent className="pt-6">
                  <div className="text-center space-y-3">
                    <Users className="h-8 w-8 mx-auto text-primary" />
                    <h3 className="font-semibold text-gray-900">BHB Coaching</h3>
                    <p className="text-sm text-gray-600">
                      Your personal coach helps optimize your store and content strategy
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Trial Banner */}
            <Card className="border-primary bg-primary/5">
              <CardContent className="pt-6">
                <div className="text-center space-y-3">
                  <Gift className="h-8 w-8 mx-auto text-primary" />
                  <h3 className="font-semibold text-lg text-gray-900">14-Day Free Trial Included</h3>
                  <p className="text-sm text-gray-600">
                    Full access to Thunder Text & ACE features, no credit card required
                  </p>
                </div>
              </CardContent>
            </Card>

            <Button size="lg" className="w-full" onClick={() => setCurrentStep('shopify')}>
              Let's Get Started →
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Connect E-commerce Platform */}
      {currentStep === 'shopify' && (
        <div>
          <div className="text-center pb-4 mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Connect Your E-commerce Platform</h1>
          </div>

          {!selectedPlatform ? (
            <div className="space-y-6">
              <p className="text-center text-sm font-semibold text-gray-900">Select your e-commerce platform:</p>

              {/* Platform Selection Cards */}
              <div className="grid md:grid-cols-3 gap-4">
                {/* Shopify */}
                <Card
                  className="cursor-pointer hover:border-primary transition-colors border-gray-200"
                  onClick={() => setSelectedPlatform('shopify')}
                >
                  <CardContent className="pt-6 pb-6">
                    <div className="text-center space-y-3">
                      <div className="h-30 flex items-center justify-center">
                        <img src="/shopify-logo.png" alt="Shopify" className="w-30 h-30 object-contain" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Lightspeed */}
                <Card
                  className="cursor-pointer hover:border-primary transition-colors opacity-60 border-gray-200"
                  onClick={() => setSelectedPlatform('lightspeed')}
                >
                  <CardContent className="pt-6 pb-6">
                    <div className="text-center space-y-3">
                      <div className="h-30 flex items-center justify-center">
                        <img src="/lightspeed-logo.png" alt="Lightspeed" className="w-30 h-30 object-contain" />
                      </div>
                      <p className="text-xs text-gray-500">Coming Soon</p>
                    </div>
                  </CardContent>
                </Card>

                {/* CommentSold */}
                <Card
                  className="cursor-pointer hover:border-primary transition-colors opacity-60 border-gray-200"
                  onClick={() => setSelectedPlatform('commentsold')}
                >
                  <CardContent className="pt-6 pb-6">
                    <div className="text-center space-y-3">
                      <div className="h-30 flex items-center justify-center">
                        <img src="/commentsold-logo.png" alt="CommentSold" className="w-30 h-30 object-contain" />
                      </div>
                      <p className="text-xs text-gray-500">Coming Soon</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : selectedPlatform === 'shopify' ? (
            /* Shopify Connection Flow */
            <div className="space-y-6">
              <Button
                variant="ghost"
                onClick={() => setSelectedPlatform(null)}
                className="mb-4"
              >
                ← Back to platform selection
              </Button>

              <Card className="border-gray-200">
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <h3 className="font-semibold text-center text-gray-900">Enter your Shopify store name</h3>

                    <div className="space-y-2">
                      <Label htmlFor="shop-name" className="text-gray-900">Shop Name</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="shop-name"
                          type="text"
                          placeholder="my-store"
                          value={shopDomain.replace('.myshopify.com', '')}
                          onChange={(e) => setShopDomain(e.target.value.replace('.myshopify.com', ''))}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              handleConnectShopify();
                            }
                          }}
                          disabled={isConnecting}
                          className="flex-1"
                        />
                        <span className="text-sm text-gray-500 whitespace-nowrap">.myshopify.com</span>
                      </div>
                      <p className="text-xs text-gray-500">
                        Enter just the store name (e.g., "my-store" not "my-store.myshopify.com")
                      </p>
                    </div>

                    <Button
                      className="w-full"
                      onClick={handleConnectShopify}
                      disabled={isConnecting || !shopDomain}
                    >
                      {isConnecting ? 'Connecting...' : 'Connect Shopify Store'}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-gray-200">
                <CardContent className="pt-6">
                  <h4 className="font-semibold mb-3 text-gray-900">What we'll access:</h4>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2 text-sm text-gray-700">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Your product catalog and images</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm text-gray-700">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Product descriptions and metadata</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm text-gray-700">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Store analytics (for your BHB Coach)</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          ) : (
            /* Coming Soon for Lightspeed/CommentSold */
            <Card className="border-gray-200">
              <CardContent className="pt-6 text-center">
                <h3 className="font-semibold mb-4 text-gray-900">{selectedPlatform === 'lightspeed' ? 'Lightspeed' : 'CommentSold'} Integration</h3>
                <p className="text-gray-600 mb-6">
                  We're working on {selectedPlatform === 'lightspeed' ? 'Lightspeed' : 'CommentSold'} integration. It will be available soon!
                </p>
                <Button variant="outline" onClick={() => setSelectedPlatform(null)}>
                  ← Choose a different platform
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Step 3: Connect Social Platforms */}
      {currentStep === 'social' && (
        <Card className="border-gray-200">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-gray-900">Connect Social Ad Platforms</CardTitle>
            <CardDescription className="text-gray-600">
              Optional: Connect ad platforms to create and manage campaigns with ACE
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="max-w-md mx-auto space-y-4">
              {/* Shopify */}
              <Card className="border-gray-200">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-16 w-16 flex items-center justify-center flex-shrink-0">
                      <img src="/shopify-logo.png" alt="Shopify" className="w-16 h-16 object-contain" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Shopify</h3>
                      <p className="text-sm text-gray-600">
                        {connections.shopifyDomain || 'E-commerce platform'}
                      </p>
                    </div>
                  </div>

                  {connections.shopify ? (
                    <div className="bg-green-100 text-green-700 px-3 py-2 rounded-md text-center text-sm font-semibold">
                      ✓ Connected
                    </div>
                  ) : (
                    <Button variant="outline" className="w-full">
                      Connect Shopify
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* Meta / Facebook Ads */}
              <Card className="border-gray-200">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-16 w-16 flex items-center justify-center flex-shrink-0">
                      <img src="/meta-logo.png" alt="Meta" className="w-16 h-16 object-contain" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Meta Ads</h3>
                      <p className="text-sm text-gray-600">
                        Facebook & Instagram campaigns
                      </p>
                    </div>
                  </div>

                  {connections.facebook ? (
                    <div className="bg-green-100 text-green-700 px-3 py-2 rounded-md text-center text-sm font-semibold">
                      ✓ Connected
                    </div>
                  ) : (
                    <Button variant="outline" className="w-full" onClick={handleConnectFacebook}>
                      Connect Meta
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* Google Ads */}
              <Card className="border-gray-200">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-16 w-16 flex items-center justify-center flex-shrink-0">
                      <img src="/google-ads-logo.png" alt="Google Ads" className="w-16 h-16 object-contain" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Google Ads</h3>
                      <p className="text-sm text-gray-600">
                        Search & Display campaigns
                      </p>
                    </div>
                  </div>

                  {connections.google ? (
                    <div className="bg-green-100 text-green-700 px-3 py-2 rounded-md text-center text-sm font-semibold">
                      ✓ Connected
                    </div>
                  ) : (
                    <Button variant="outline" className="w-full" onClick={() => {
                      const shop = searchParams.get('shop');
                      if (shop) {
                        window.location.href = `/api/google/oauth/authorize?shop=${shop}&return_to=/welcome`;
                      }
                    }}>
                      Connect Google Ads
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* TikTok Ads */}
              <Card className="opacity-60 border-gray-200">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-16 w-16 flex items-center justify-center flex-shrink-0">
                      <img src="/tiktok-ads-logo.png" alt="TikTok Ads" className="w-16 h-16 object-contain" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">TikTok Ads</h3>
                      <p className="text-sm text-gray-600">
                        Short-form video campaigns
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 text-center">Coming Soon</p>
                </CardContent>
              </Card>

              {/* Pinterest Ads */}
              <Card className="opacity-60 border-gray-200">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-16 w-16 flex items-center justify-center flex-shrink-0">
                      <img src="/pinterest-ads-logo.png" alt="Pinterest Ads" className="w-16 h-16 object-contain" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Pinterest Ads</h3>
                      <p className="text-sm text-gray-600">
                        Visual discovery campaigns
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 text-center">Coming Soon</p>
                </CardContent>
              </Card>

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={handleSkipSocial}>
                  Skip for Now
                </Button>
                <Button className="flex-1" onClick={() => router.push(`/?shop=${searchParams.get('shop')}`)}>
                  Done Connecting Accounts
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Complete */}
      {currentStep === 'complete' && (
        <Card className="border-gray-200">
          <CardContent className="pt-12 pb-8 text-center">
            <div className="text-6xl mb-6">🎉</div>

            <h2 className="text-3xl font-bold mb-2 text-gray-900">You're All Set!</h2>
            <p className="text-lg text-gray-600 mb-8">
              Your 14-day free trial has been activated
            </p>

            <Card className="max-w-lg mx-auto mb-8 border-gray-200">
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-4 text-left text-gray-900">What's included in your trial:</h3>
                <ul className="space-y-3 text-left">
                  <li className="flex items-start gap-2 text-gray-700">
                    <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span>Unlimited AI product descriptions (Thunder Text)</span>
                  </li>
                  <li className="flex items-start gap-2 text-gray-700">
                    <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span>AI-powered ad copy generation (ACE)</span>
                  </li>
                  <li className="flex items-start gap-2 text-gray-700">
                    <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span>Personal BHB Coach support</span>
                  </li>
                  <li className="flex items-start gap-2 text-gray-700">
                    <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span>Brand voice training & best practices</span>
                  </li>
                  <li className="flex items-start gap-2 text-gray-700">
                    <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span>Full access to all features</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Button size="lg" onClick={handleGoToDashboard}>
              Go to Dashboard →
            </Button>
          </CardContent>
        </Card>
      )}
      </div>
    </div>
  );
}
