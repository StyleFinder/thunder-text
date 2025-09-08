import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@shopify/polaris";
import "@shopify/polaris/build/esm/styles.css";
import { SessionProvider } from "next-auth/react";

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
        <SessionProvider>
          <AppProvider i18n={{}} features={{ newDesignLanguage: true }}>
            {children}
          </AppProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
