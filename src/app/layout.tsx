import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { PolarisProvider } from './components/PolarisProvider';
import { AppLayout } from './components/AppLayout';
import { UnifiedShopifyAuth } from './components/UnifiedShopifyAuth';
import { ServiceWorkerCleanup } from './components/ServiceWorkerCleanup';

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
        <PolarisProvider>
          <UnifiedShopifyAuth>
            <ServiceWorkerCleanup />
            <AppLayout>
              {children}
            </AppLayout>
          </UnifiedShopifyAuth>
        </PolarisProvider>
      </body>
    </html>
  );
}
