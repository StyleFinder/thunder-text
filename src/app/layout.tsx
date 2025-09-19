import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { PolarisProvider } from './components/PolarisProvider';
import { AppLayout } from './components/AppLayout';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Thunder Text - AI Product Descriptions",
  description: "Generate compelling, SEO-optimized product descriptions from images using AI",
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
          <AppLayout>
            {children}
          </AppLayout>
        </PolarisProvider>
      </body>
    </html>
  );
}
