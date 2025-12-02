/**
 * ACE Design System - Layout Constants
 */

export const layout = {
  padding: '24px', // 32px * 0.75
  cornerRadius: '6px', // 8px * 0.75
  shadow: '0px 1.5px 6px rgba(0,0,0,0.08)', // reduced shadow

  spacing: {
    xs: '3px', // 4px * 0.75
    sm: '6px', // 8px * 0.75
    md: '12px', // 16px * 0.75
    lg: '18px', // 24px * 0.75
    xl: '24px', // 32px * 0.75
    xxl: '36px', // 48px * 0.75
  },

  breakpoints: {
    mobile: '640px',
    tablet: '768px',
    desktop: '1024px',
    wide: '1280px',
  },
} as const;
