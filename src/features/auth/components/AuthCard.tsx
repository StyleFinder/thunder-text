'use client';

import { ReactNode } from 'react';

interface AuthCardProps {
  children: ReactNode;
  variant?: 'default' | 'shadow';
}

/**
 * AuthCard - Consistent card styling for auth pages
 */
export function AuthCard({ children, variant = 'shadow' }: AuthCardProps) {
  const shadowClass = variant === 'shadow' ? 'shadow-xl' : 'shadow-sm border border-gray-200';

  return (
    <div className={`bg-white rounded-2xl ${shadowClass} p-8`}>
      {children}
    </div>
  );
}
