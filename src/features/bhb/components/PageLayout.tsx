import React from 'react';
import { colors } from '@/lib/design-system/colors';
import { typography } from '@/lib/design-system/typography';
import { layout } from '@/lib/design-system/layout';

interface PageLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  backLink?: {
    label: string;
    href: string;
  };
}

export function PageLayout({ children, title, subtitle, backLink }: PageLayoutProps) {
  return (
    <div style={{ backgroundColor: colors.backgroundLight, minHeight: '100vh', padding: layout.padding }}>
      {backLink && (
        <a
          href={backLink.href}
          style={{
            display: 'inline-block',
            marginBottom: layout.spacing.md,
            color: colors.smartBlue,
            textDecoration: 'none',
            fontFamily: typography.fontFamily,
            fontSize: typography.body.fontSize,
          }}
        >
          ← {backLink.label}
        </a>
      )}

      <div style={{ marginBottom: layout.spacing.xl }}>
        <h1
          style={{
            fontSize: typography.heading1.fontSize,
            fontWeight: typography.heading1.fontWeight,
            color: typography.heading1.color,
            fontFamily: typography.fontFamily,
            margin: 0,
            marginBottom: subtitle ? layout.spacing.sm : 0,
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            style={{
              fontSize: typography.subheading.fontSize,
              fontWeight: typography.subheading.fontWeight,
              color: typography.subheading.color,
              fontFamily: typography.fontFamily,
              margin: 0,
            }}
          >
            {subtitle}
          </p>
        )}
      </div>

      {children}
    </div>
  );
}
