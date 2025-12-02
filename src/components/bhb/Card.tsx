import React from 'react';
import { colors } from '@/lib/design-system/colors';
import { layout } from '@/lib/design-system/layout';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: keyof typeof layout.spacing | string;
  background?: string;
}

export function Card({ children, className = '', padding = 'xl', background = colors.white }: CardProps) {
  const paddingValue = typeof padding === 'string' && padding in layout.spacing
    ? layout.spacing[padding as keyof typeof layout.spacing]
    : padding;

  return (
    <div
      className={className}
      style={{
        backgroundColor: background,
        borderRadius: layout.cornerRadius,
        boxShadow: layout.shadow,
        padding: paddingValue,
      }}
    >
      {children}
    </div>
  );
}
