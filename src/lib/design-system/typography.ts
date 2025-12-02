/**
 * ACE Design System - Typography
 */

export const typography = {
  fontFamily: "'Inter', 'SF Pro', -apple-system, BlinkMacSystemFont, sans-serif",

  heading1: {
    fontSize: '24px', // 32px * 0.75
    fontWeight: 700,
    color: '#003366',
  },

  heading2: {
    fontSize: '18px', // 24px * 0.75
    fontWeight: 700,
    color: '#003366',
  },

  heading3: {
    fontSize: '18px', // Readable heading size
    fontWeight: 600,
    color: '#003366',
  },

  subheading: {
    fontSize: '14px', // Accessible readable size
    fontWeight: 400,
    color: '#777777',
  },

  cardLabel: {
    fontSize: '14px', // Accessible readable size
    fontWeight: 500,
    color: '#003366',
  },

  cardValue: {
    fontSize: '27px', // 36px * 0.75
    fontWeight: 700,
    color: '#003366',
  },

  tableHeader: {
    fontSize: '14px', // Standard readable size
    fontWeight: 600,
    color: '#ffffff',
  },

  tableCell: {
    fontSize: '16px', // Web standard for body text
    fontWeight: 400,
    color: '#001429',
  },

  body: {
    fontSize: '16px', // Web standard for body text
    fontWeight: 400,
    color: '#001429',
  },

  bodySmall: {
    fontSize: '14px', // Accessible readable size for secondary text
    fontWeight: 400,
    color: '#777777',
  },
} as const;
