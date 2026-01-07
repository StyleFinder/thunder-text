/* eslint-disable react/no-unescaped-entities -- Quotes and apostrophes in JSX text are intentional */
"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { AlertCircle } from "lucide-react";

export default function InstallPage() {
  const searchParams = useSearchParams();
  const [shop, setShop] = useState("");
  const [installing, setInstalling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if we already have a shop parameter
  useEffect(() => {
    const shopParam = searchParams?.get("shop");
    if (shopParam) {
      setShop(shopParam.replace(".myshopify.com", ""));
    }
  }, [searchParams]);

  const handleInstall = () => {
    if (!shop) {
      setError("Please enter your shop domain");
      return;
    }

    setInstalling(true);
    const shopDomain = shop.includes(".myshopify.com")
      ? shop
      : `${shop}.myshopify.com`;

    // Redirect to the server-side OAuth initiation endpoint
    // The server will generate secure state parameters and redirect to Shopify
    window.location.href = `/api/auth/shopify?shop=${encodeURIComponent(shopDomain)}`;
  };

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-oxford-navy mb-2">
          Install Thunder Text
        </h1>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-oxford-navy">
              Welcome to Thunder Text!
            </CardTitle>
            <CardDescription>
              Thunder Text uses AI to generate compelling product descriptions
              from your product images. Install the app to get started.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive" className="border-berry bg-berry/10">
                <AlertCircle className="h-4 w-4 text-berry" />
                <AlertDescription className="text-berry">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-3">
              <p className="text-oxford-navy">
                Enter your Shopify store domain:
              </p>

              <div className="flex items-center gap-2">
                <Input
                  type="text"
                  value={shop}
                  onChange={(e) => setShop(e.target.value)}
                  placeholder="your-store"
                  disabled={installing}
                  className="max-w-xs border-gray-300 focus:border-smart-blue-500 focus:ring-smart-blue-500"
                />
                <span className="text-oxford-navy">.myshopify.com</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                onClick={handleInstall}
                disabled={!shop || installing}
                className="bg-smart-blue-500 hover:bg-smart-blue-600 text-white"
              >
                {installing ? "Installing..." : "Install App"}
              </Button>

              {installing && (
                <Badge
                  variant="secondary"
                  className="bg-smart-blue-100 text-smart-blue-700"
                >
                  Redirecting to Shopify...
                </Badge>
              )}
            </div>

            <div className="pt-4 border-t border-gray-200">
              <div className="space-y-2">
                <h3 className="font-semibold text-oxford-navy">
                  What permissions will Thunder Text request?
                </h3>
                <ul className="list-disc list-inside space-y-1 text-oxford-navy ml-2">
                  <li>Read and write products</li>
                  <li>Read and write product content</li>
                  <li>Generate AI descriptions</li>
                  <li>Update product metafields</li>
                </ul>
                <p className="text-sm text-gray-600">
                  Thunder Text will never modify your products without your
                  explicit approval.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-oxford-navy">
              Already installed?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-oxford-navy">
              If you've already installed Thunder Text, you can access it from
              your Shopify admin:
            </p>
            <ol className="list-decimal list-inside space-y-1 text-oxford-navy ml-2">
              <li>Go to your Shopify admin</li>
              <li>Click on "Apps" in the left sidebar</li>
              <li>Select "Thunder Text" from your installed apps</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
