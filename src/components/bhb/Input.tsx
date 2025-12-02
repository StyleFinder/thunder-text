import React from 'react';
import { colors } from '@/lib/design-system/colors';
import { typography } from '@/lib/design-system/typography';
import { layout } from '@/lib/design-system/layout';

interface InputProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: 'text' | 'email' | 'password' | 'number';
  multiline?: boolean | number;
  disabled?: boolean;
  className?: string;
  error?: string;
}

export function Input({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  multiline = false,
  disabled = false,
  className = '',
  error,
}: InputProps) {
  const baseStyles: React.CSSProperties = {
    width: '100%',
    padding: '9px 12px', // 12px * 0.75 = 9px, 16px * 0.75 = 12px
    fontSize: typography.body.fontSize,
    fontFamily: typography.fontFamily,
    color: colors.oxfordNavyDark,
    backgroundColor: colors.white,
    border: `1px solid ${error ? colors.error : '#d9d9d9'}`,
    borderRadius: layout.cornerRadius,
    outline: 'none',
    transition: 'border-color 0.2s ease',
  };

  const labelStyles: React.CSSProperties = {
    display: 'block',
    marginBottom: layout.spacing.sm,
    fontSize: typography.cardLabel.fontSize,
    fontWeight: typography.cardLabel.fontWeight,
    color: typography.cardLabel.color,
    fontFamily: typography.fontFamily,
  };

  const errorStyles: React.CSSProperties = {
    display: 'block',
    marginTop: layout.spacing.sm,
    fontSize: typography.bodySmall.fontSize,
    color: colors.error,
    fontFamily: typography.fontFamily,
  };

  return (
    <div className={className}>
      {label && <label style={labelStyles}>{label}</label>}
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          rows={typeof multiline === 'number' ? multiline : 4}
          style={{ ...baseStyles, resize: 'vertical', minHeight: '100px' }}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          style={baseStyles}
        />
      )}
      {error && <span style={errorStyles}>{error}</span>}
    </div>
  );
}
