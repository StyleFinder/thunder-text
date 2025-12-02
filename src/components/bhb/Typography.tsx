import React from 'react';
import { typography } from '@/lib/design-system/typography';
import { colors } from '@/lib/design-system/colors';

interface TextProps {
  children: React.ReactNode;
  variant?: 'h1' | 'h2' | 'h3' | 'body' | 'bodySmall' | 'cardLabel' | 'cardValue';
  color?: string;
  className?: string;
  style?: React.CSSProperties;
}

export function Text({ children, variant = 'body', color, className = '', style = {} }: TextProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'h1':
        return typography.heading1;
      case 'h2':
        return typography.heading2;
      case 'h3':
        return typography.heading3;
      case 'cardLabel':
        return typography.cardLabel;
      case 'cardValue':
        return typography.cardValue;
      case 'bodySmall':
        return typography.bodySmall;
      default:
        return typography.body;
    }
  };

  const variantStyles = getVariantStyles();
  const Tag = variant.startsWith('h') ? (variant as 'h1' | 'h2' | 'h3') : 'span';

  const combinedStyles: React.CSSProperties = {
    fontFamily: typography.fontFamily,
    fontSize: variantStyles.fontSize,
    fontWeight: variantStyles.fontWeight,
    color: color || variantStyles.color,
    margin: 0,
    ...style,
  };

  return (
    <Tag className={className} style={combinedStyles}>
      {children}
    </Tag>
  );
}
