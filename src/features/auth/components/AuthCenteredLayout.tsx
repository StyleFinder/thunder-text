'use client';

import { ReactNode } from 'react';
import { ThunderTextLogo } from './ThunderTextLogo';

interface AuthCenteredLayoutProps {
  children: ReactNode;
}

/**
 * AuthCenteredLayout - Layout for utility auth pages (forgot-password, reset-password, error, confirm-action)
 * Features:
 * - Dark navy gradient background
 * - Centered white card
 * - Thunder Text logo at top
 */
export function AuthCenteredLayout({ children }: AuthCenteredLayoutProps) {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{
        background: 'linear-gradient(135deg, #001429 0%, #002952 50%, #003d7a 100%)'
      }}
    >
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center mb-8">
          <ThunderTextLogo variant="light" />
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
