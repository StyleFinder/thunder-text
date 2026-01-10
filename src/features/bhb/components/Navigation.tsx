import React from 'react';
import Link from 'next/link';
import { colors } from '@/lib/design-system/colors';
import { layout } from '@/lib/design-system/layout';
import { Icon, IconName } from './Icon';

export interface NavigationItem {
  url: string;
  label: string;
  icon?: IconName | React.ReactNode;
  selected?: boolean;
}

export interface NavigationProps {
  items: NavigationItem[];
}

export function Navigation({ items }: NavigationProps) {
  return (
    <nav
      style={{
        backgroundColor: colors.oxfordNavyDark,
        padding: layout.spacing.md,
        minHeight: '100vh',
        width: '240px',
        display: 'flex',
        flexDirection: 'column',
        gap: layout.spacing.xs,
      }}
    >
      {items.map((item) => {
        const isIconName = typeof item.icon === 'string';
        const iconElement = isIconName ? (
          <Icon name={item.icon as IconName} size={18} color={colors.white} />
        ) : (
          item.icon
        );

        return (
          <Link
            key={item.url}
            href={item.url}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: layout.spacing.sm,
              padding: `${layout.spacing.sm} ${layout.spacing.md}`,
              borderRadius: layout.cornerRadius,
              backgroundColor: item.selected ? colors.smartBlue : 'transparent',
              color: colors.white,
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: item.selected ? 600 : 400,
              transition: 'background-color 0.2s ease',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              if (!item.selected) {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
              }
            }}
            onMouseLeave={(e) => {
              if (!item.selected) {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            {iconElement && <span style={{ display: 'flex', alignItems: 'center' }}>{iconElement}</span>}
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
