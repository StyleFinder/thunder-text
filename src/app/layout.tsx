import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { PolarisProvider } from './components/PolarisProvider';

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
          <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
            <header style={{ marginBottom: '40px', textAlign: 'center' }}>
              <h1 style={{ color: '#2563eb', fontSize: '2.5rem', marginBottom: '10px' }}>Thunder Text</h1>
              <p style={{ color: '#6b7280', fontSize: '1.2rem' }}>AI-Powered Product Description Generator</p>
            </header>
            {children}
          </div>
        </PolarisProvider>
      </body>
    </html>
  );
}
