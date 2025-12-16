# BHB Home Dashboard Redesign Plan

## Overview

Redesign the BHB (BoutiqueHub Black) Coaches Dashboard (`/bhb`) to follow the "Luminous Depth" design system established in the Welcome page, while preserving all existing functionality.

**Current Location**: `src/app/bhb/page.tsx`
**Effort**: High
**Priority**: Phase 6 (Medium)

---

## Current Features to Preserve

### 1. Authentication & Session

- Coach login via NextAuth session
- Role-based access (coach/admin only)
- Coach email extraction from session

### 2. Data Display

- **Summary Cards**: Total stores, campaigns, spend (30d), average ROAS
- **Performance Tiers**: Excellent, Good, Average, Poor, Critical with badges
- **Store Table**: Expandable rows showing campaigns per store

### 3. Interactive Features

- **Favorites System**: Star/unstar stores, favorites sorted first
- **Coach Filter**: Filter stores by coach's favorites
- **Search**: Search stores by domain name
- **Expandable Rows**: Show/hide campaigns per store

### 4. Data Fields per Store

- Shop domain (with link to store detail view)
- Facebook connected status (with disconnect warning)
- Coach assigned
- Campaign count
- Total spend, purchases, revenue
- Conversion rate, ROAS
- Performance tier badges

### 5. API Endpoints Used

- `GET /api/bhb/insights` - Main dashboard data
- `GET /api/coach/favorites` - Coach's favorites
- `GET /api/coach/favorites/all` - All coaches' favorites
- `GET /api/coaches` - List of coaches for filter

---

## Design System: "Luminous Depth"

### Color Palette

```typescript
// From welcome page and colors.ts
const designColors = {
  // Gradient backgrounds (left panel)
  gradientStart: "#001429", // Very dark navy
  gradientMid: "#002952", // Dark navy
  gradientEnd: "#003d7a", // Navy blue

  // Accent gradient for buttons/highlights
  accentStart: "#0066cc", // Smart blue
  accentEnd: "#0099ff", // Bright blue

  // Semantic
  amber: "#ffcc00", // Highlights, excellent tier
  success: "#10b981", // Good tier, connected status
  warning: "#f59e0b", // Poor tier
  error: "#cc0066", // Critical tier, errors

  // Neutrals
  background: "#f9fafb", // gray-50
  cardBg: "#ffffff",
  textPrimary: "#111827", // gray-900
  textSecondary: "#6b7280", // gray-500
  border: "#e5e7eb", // gray-200
};
```

### Layout Structure

```
┌─────────────────────────────────────────────────────────────────┐
│ ┌───────────────┐ ┌───────────────────────────────────────────┐ │
│ │               │ │                                           │ │
│ │  Left Panel   │ │              Main Content                 │ │
│ │  (280-320px)  │ │              (flex-1)                     │ │
│ │               │ │                                           │ │
│ │  - Logo       │ │  - Search & Filter Bar                    │ │
│ │  - Nav Links  │ │  - Summary Cards (4 grid)                 │ │
│ │  - Coach Info │ │  - Performance Table                      │ │
│ │               │ │  - Legend                                 │ │
│ │               │ │                                           │ │
│ └───────────────┘ └───────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## Component Architecture

### New Components to Create

#### 1. `BHBLayout.tsx`

Split-screen layout wrapper with animated gradient left panel.

```tsx
// Features:
// - Dark gradient left panel (like Welcome page)
// - GradientMesh animated background
// - Coach info display
// - Navigation links
// - Mobile responsive header
```

#### 2. `StatCard.tsx` (Enhanced)

Summary statistic cards with modern styling.

```tsx
interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  icon?: React.ElementType;
  highlight?: boolean; // For ROAS coloring
}
```

#### 3. `PerformanceTable.tsx`

Modern data table with expandable rows.

```tsx
// Features:
// - Sticky header
// - Alternating row colors
// - Expandable campaign rows with animation
// - Inline star/favorite toggle
// - Status badges with new design
```

#### 4. `SearchFilterBar.tsx`

Combined search and filter controls.

```tsx
// Features:
// - Search input with icon
// - Coach dropdown filter
// - Clear filters button
// - Results count display
```

#### 5. `PerformanceBadge.tsx`

Tier indicator badges with new styling.

```tsx
// Tiers with distinct visual hierarchy:
// - Excellent: Gold/amber with star icon
// - Good: Green with checkmark
// - Average: Blue/neutral
// - Poor: Orange with warning
// - Critical: Red with alert icon
```

---

## Implementation Steps

### Phase 1: Layout Foundation (1-2 hours)

1. Create `BHBLayout.tsx` with split-screen design
2. Add GradientMesh component (reuse from Welcome)
3. Implement responsive mobile header
4. Add navigation links (Dashboard, Hot Takes, Admin)

### Phase 2: Summary Cards Redesign (1 hour)

1. Create enhanced `StatCard` component
2. Apply gradient backgrounds and shadows
3. Add trend indicators (if data available)
4. Implement 4-column responsive grid

### Phase 3: Search & Filter Bar (30 min)

1. Create unified search/filter component
2. Style inputs with new design system
3. Add clear filters functionality
4. Show result count

### Phase 4: Performance Table Redesign (2-3 hours)

1. Create modern table with sticky header
2. Implement expandable rows with smooth animation
3. Redesign favorite star interaction
4. Update performance badges
5. Add disconnected platform warning styling
6. Improve coach column with multi-coach indicator

### Phase 5: Polish & Animations (1 hour)

1. Add fade-in animations for cards
2. Implement hover effects on rows
3. Add loading skeleton states
4. Ensure responsive behavior on all breakpoints

---

## Detailed UI Specifications

### Left Panel (280-320px)

```css
/* Background */
background: linear-gradient(135deg, #001429 0%, #002952 40%, #003d7a 100%);

/* Animated orbs (from Welcome) */
/* Noise texture overlay */
```

**Contents**:

- Logo: Thunder Text with Zap icon (amber)
- "BHB Coach Portal" subtitle
- Coach name/email from session
- Navigation:
  - Dashboard (active state)
  - Hot Takes
  - Store Directory (future)
  - Settings (admin only)

### Summary Cards Grid

```css
/* Card styling */
background: #ffffff;
border: 1px solid #e5e7eb;
border-radius: 16px;
box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
padding: 24px;

/* Label */
font-size: 12px;
font-weight: 500;
text-transform: uppercase;
letter-spacing: 0.05em;
color: #6b7280;

/* Value */
font-size: 32px;
font-weight: 700;
color: #111827;

/* Subtext */
font-size: 14px;
color: #6b7280;
```

### Performance Table

```css
/* Table container */
background: #ffffff;
border: 1px solid #e5e7eb;
border-radius: 16px;
overflow: hidden;

/* Header row */
background: #f9fafb;
font-size: 11px;
font-weight: 600;
text-transform: uppercase;
letter-spacing: 0.05em;
color: #6b7280;

/* Data rows */
border-bottom: 1px solid #f3f4f6;
transition: background-color 0.15s;

/* Hover state */
background-color: #f9fafb;

/* Expanded campaign rows */
background: #f9fafb;
padding-left: 48px;
```

### Performance Badges

| Tier      | Background | Text      | Icon     |
| --------- | ---------- | --------- | -------- |
| Excellent | `#fef3c7`  | `#92400e` | ⭐ Star  |
| Good      | `#d1fae5`  | `#065f46` | ✓ Check  |
| Average   | `#dbeafe`  | `#1e40af` | — Dash   |
| Poor      | `#fed7aa`  | `#9a3412` | ⚠ Alert |
| Critical  | `#fee2e2`  | `#991b1b` | 🚨 Alert |

---

## File Changes Required

### New Files

- `src/components/bhb/BHBLayout.tsx`
- `src/components/bhb/StatCard.tsx` (enhanced version)
- `src/components/bhb/PerformanceTable.tsx`
- `src/components/bhb/SearchFilterBar.tsx`
- `src/components/bhb/PerformanceBadge.tsx`

### Modified Files

- `src/app/bhb/page.tsx` - Complete redesign using new components
- `src/app/globals.css` - Add BHB-specific animations if needed

### Preserved (No Changes)

- `src/app/api/bhb/insights/route.ts`
- `src/app/api/coach/favorites/route.ts`
- All coach API routes

---

## Responsive Breakpoints

| Breakpoint  | Layout                                      |
| ----------- | ------------------------------------------- |
| < 768px     | Single column, mobile header, stacked cards |
| 768-1024px  | Two-column cards, compact table             |
| 1024-1280px | Left panel visible, 4-column cards          |
| > 1280px    | Full layout, expanded table                 |

---

## Accessibility Checklist

- [ ] Keyboard navigation for table rows
- [ ] ARIA labels for interactive elements
- [ ] Focus indicators on all buttons
- [ ] Screen reader support for performance tiers
- [ ] Color contrast meets WCAG AA
- [ ] Loading states announced

---

## Testing Checklist

- [ ] Coach login and session handling
- [ ] API data loading and error states
- [ ] Empty state (no stores)
- [ ] Favorites toggle functionality
- [ ] Search filtering
- [ ] Coach filter dropdown
- [ ] Expandable rows animation
- [ ] Mobile responsive behavior
- [ ] Dark mode compatibility (if applicable)

---

## Estimated Timeline

| Phase     | Duration      | Description         |
| --------- | ------------- | ------------------- |
| Phase 1   | 1-2 hours     | Layout foundation   |
| Phase 2   | 1 hour        | Summary cards       |
| Phase 3   | 30 min        | Search & filter     |
| Phase 4   | 2-3 hours     | Performance table   |
| Phase 5   | 1 hour        | Polish & animations |
| **Total** | **5-7 hours** | Full redesign       |

---

## Success Criteria

1. ✅ Visual consistency with Welcome page design
2. ✅ All existing functionality preserved
3. ✅ Improved readability and usability
4. ✅ Responsive on all devices
5. ✅ Smooth animations and transitions
6. ✅ No regression in API performance
7. ✅ Accessible to screen readers

---

_Plan created: December 8, 2025_
