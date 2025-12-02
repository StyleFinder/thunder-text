import React from 'react';
import { colors } from '@/lib/design-system/colors';
import { typography } from '@/lib/design-system/typography';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'success' | 'warning' | 'error' | 'info' | 'coach';
  className?: string;
}

export function Badge({ children, variant = 'primary', className = '' }: BadgeProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: colors.smartBlue,
          color: colors.white,
        };
      case 'success':
        return {
          backgroundColor: colors.success,
          color: colors.white,
        };
      case 'warning':
        return {
          backgroundColor: colors.brightAmber,
          color: colors.oxfordNavyDark,
        };
      case 'error':
        return {
          backgroundColor: colors.berryLipstick,
          color: colors.white,
        };
      case 'info':
        return {
          backgroundColor: colors.smartBlue,
          color: colors.white,
        };
      case 'coach':
        return {
          backgroundColor: colors.berryLipstick,
          color: colors.white,
        };
    }
  };

  const baseStyles: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 500,
    fontFamily: typography.fontFamily,
    ...getVariantStyles(),
  };

  return (
    <span className={className} style={baseStyles}>
      {children}
    </span>
  );
}
