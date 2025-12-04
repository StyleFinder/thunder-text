/**
 * ACE Design System - Color Palette
 */

export const colors = {
  // Primary Brand Colors
  oxfordNavyDark: '#001429',   // Very dark blue, almost black - navigation header
  oxfordNavy: '#003366',       // Deep navy blue - headings, primary text
  smartBlue: '#0066cc',        // Vibrant professional blue - links, primary actions
  berryLipstick: '#cc0066',    // Bold pink/magenta - accents, badges
  brightAmber: '#ffcc00',      // Vibrant gold/yellow - positive metrics, highlights

  // Neutral Colors
  background: '#fafaf9',       // Warm off-white - page background
  backgroundLight: '#f5f5f4',  // Light gray background - secondary surfaces
  white: '#ffffff',            // Pure white - card backgrounds
  grayText: '#6b7280',         // Medium gray - secondary text
  border: '#e5e7eb',           // Light gray - borders, dividers

  // Semantic Colors
  success: '#10b981',          // Green - success states
  warning: '#ffcc00',          // Amber - warnings (same as brightAmber)
  error: '#cc0066',            // Berry - errors (same as berryLipstick)
  info: '#0066cc',             // Smart Blue - info (same as smartBlue)
} as const;

export type ColorKey = keyof typeof colors;
