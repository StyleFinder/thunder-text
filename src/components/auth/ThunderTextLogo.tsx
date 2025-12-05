'use client';

import { Zap } from 'lucide-react';

interface ThunderTextLogoProps {
  variant?: 'light' | 'dark';
  size?: 'sm' | 'md' | 'lg';
}

/**
 * ThunderTextLogo - Consistent branding component for auth pages
 */
export function ThunderTextLogo({ variant = 'light', size = 'md' }: ThunderTextLogoProps) {
  const sizeClasses = {
    sm: { container: 'w-8 h-8', icon: 'w-4 h-4', text: 'text-lg' },
    md: { container: 'w-10 h-10', icon: 'w-5 h-5', text: 'text-xl' },
    lg: { container: 'w-12 h-12', icon: 'w-6 h-6', text: 'text-2xl' }
  };

  const { container, icon, text } = sizeClasses[size];
  const textColor = variant === 'light' ? 'text-white' : 'text-gray-900';

  return (
    <div className="flex items-center gap-3">
      <div
        className={`${container} rounded-xl flex items-center justify-center`}
        style={{ background: 'linear-gradient(135deg, #ffcc00 0%, #ff9900 100%)' }}
      >
        <Zap className={`${icon} text-white`} />
      </div>
      <span className={`${text} font-bold ${textColor}`}>Thunder Text</span>
    </div>
  );
}
