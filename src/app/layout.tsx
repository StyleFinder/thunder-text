import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { PolarisProvider } from './components/PolarisProvider';
import { AppLayout } from './components/AppLayout';
import { UnifiedAuthProvider } from './components/UnifiedAuthProvider';
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
  return (
    <html lang="en">
      <body className={inter.className}>
        <PolarisProvider>
          <UnifiedAuthProvider>
            <ServiceWorkerCleanup />
            <AppLayout>
              {children}
            </AppLayout>
          </UnifiedAuthProvider>
        </PolarisProvider>
      </body>
    </html>
  );
}
