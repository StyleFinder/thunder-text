import React from 'react';
import { colors } from '@/lib/design-system/colors';
import { typography } from '@/lib/design-system/typography';
import { layout } from '@/lib/design-system/layout';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void | Promise<void>;
  variant?: 'primary' | 'secondary' | 'outline' | 'text';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
  fullWidth?: boolean;
  style?: React.CSSProperties;
}

export function Button({
  children,
  onClick,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  className = '',
  type = 'button',
  fullWidth = false,
  style,
}: ButtonProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: colors.smartBlue,
          color: colors.white,
          border: 'none',
        };
      case 'secondary':
        return {
          backgroundColor: colors.oxfordNavy,
          color: colors.white,
          border: 'none',
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          color: colors.smartBlue,
          border: `2px solid ${colors.smartBlue}`,
        };
      case 'text':
        return {
          backgroundColor: 'transparent',
          color: colors.smartBlue,
          border: 'none',
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          padding: '6px 12px',
          fontSize: '12px',
        };
      case 'medium':
        return {
          padding: '10px 20px',
          fontSize: '14px',
        };
      case 'large':
        return {
          padding: '14px 28px',
          fontSize: '16px',
        };
    }
  };

  const baseStyles: React.CSSProperties = {
    fontFamily: typography.fontFamily,
    fontWeight: 600,
    borderRadius: layout.cornerRadius,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    transition: 'all 0.2s ease',
    width: fullWidth ? '100%' : 'auto',
    ...getVariantStyles(),
    ...getSizeStyles(),
    ...style,
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={className}
      style={baseStyles}
    >
      {children}
    </button>
  );
}
