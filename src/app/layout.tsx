import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { PolarisProvider } from './components/PolarisProvider';
import { AppLayout } from './components/AppLayout';
import { ConditionalShopifyAuth } from './components/ConditionalShopifyAuth';
import { ServiceWorkerCleanup } from './components/ServiceWorkerCleanup';
import { AuthSessionProvider } from '@/lib/auth/session-provider';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Thunder Text - AI Product Descriptions",
  description: "Generate compelling, SEO-optimized product descriptions from images using AI",
  other: {
    'shopify-api-key': process.env.NEXT_PUBLIC_SHOPIFY_API_KEY || '',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const apiKey = process.env.NEXT_PUBLIC_SHOPIFY_API_KEY || '';

  return (
    <html lang="en">
      <head>
        <meta name="shopify-api-key" content={apiKey} />
      </head>
      <body className={inter.className}>
        <AuthSessionProvider>
          <PolarisProvider>
            <ConditionalShopifyAuth>
              <ServiceWorkerCleanup />
              <AppLayout>
                {children}
              </AppLayout>
            </ConditionalShopifyAuth>
          </PolarisProvider>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
