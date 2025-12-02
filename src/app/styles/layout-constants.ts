/**
 * Layout Constants for Consistent Page Styling
 *
 * These inline style objects ensure proper centering and width constraints
 * across all pages, matching the create-pd page pattern that displays correctly.
 *
 * Usage:
 * import { PAGE_HEADER_STYLES, PAGE_SECTION_STYLES } from '@/app/styles/layout-constants';
 *
 * <div style={PAGE_HEADER_STYLES}>
 *   <h1>Page Title</h1>
 * </div>
 */

/**
 * Main page header container
 * Use for the top-level page title and description area
 */
export const PAGE_HEADER_STYLES = {
  maxWidth: '800px',
  margin: '0 auto 24px auto',
  width: '100%'
} as const;

/**
 * Content sections (Cards, divs, etc.)
 * Use for main content blocks that need centering
 */
export const PAGE_SECTION_STYLES = {
  maxWidth: '800px',
  margin: '0 auto 32px auto',
  width: '100%'
} as const;

/**
 * Last section on page (no bottom margin)
 * Use for the final content block to avoid extra spacing
 */
export const PAGE_SECTION_LAST_STYLES = {
  maxWidth: '800px',
  margin: '0 auto',
  width: '100%'
} as const;

/**
 * Wide content sections (for tables, grids, etc.)
 * Use when you need more horizontal space
 */
export const PAGE_SECTION_WIDE_STYLES = {
  maxWidth: '1200px',
  margin: '0 auto 32px auto',
  width: '100%'
} as const;
