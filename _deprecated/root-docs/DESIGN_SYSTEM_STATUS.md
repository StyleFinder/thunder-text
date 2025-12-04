# Thunder Text Design System Modernization

## ✅ Completed (Step 1: Foundation)

### Tailwind Configuration

- ✅ Added Inter font family as default sans font
- ✅ Added consistent 8px-based spacing system (4px, 8px, 12px, 16px, 24px, 32px, etc.)
- ✅ Added typography scale with proper line heights
- ✅ ACE color palette properly defined (oxford, smart, dodger, berry, amber)
- ✅ Semantic colors using CSS custom properties

### Global Styles (globals.css)

- ✅ Fixed background color inconsistency (#e5e5e5 → #f9fafb)
- ✅ Inter font applied globally
- ✅ Base typography styles for headings
- ✅ Form input styling with focus states
- ✅ Button styling foundation

### shadcn/ui Components

- ✅ Input component - Inter font, 14px
- ✅ Textarea component - Inter font, 14px
- ✅ Select component - Inter font, 14px, gray dropdown background (#f9fafb), fixed checkmark spacing
- ✅ Button component - Using semantic color tokens

---

## 🔄 Next Steps (Step 2: Component Fixes)

### High Priority - Most Visible Issues

#### 1. Navigation Sidebar (AppNavigation.tsx)

**Current Issues:**

- Old-style iconography
- Inconsistent spacing
- Not modern/classic design
- Poor visual hierarchy

**Needs:**

- Clean, modern sidebar layout
- Consistent 8px spacing system
- Active state indicators
- Hover effects using ACE colors
- Better icon styling

#### 2. Card Components

**Current Issues:**

- Inconsistent padding
- Shadow/border inconsistencies

**Needs:**

- Standardize padding to 32px
- Consistent border-radius (12px from --radius)
- Subtle shadow system
- Proper white background (#ffffff)

#### 3. Form Components

**Status:** Mostly complete, but need to verify:

- [ ] All inputs use Inter font
- [ ] All inputs have consistent border colors
- [ ] All focus states use ACE blue (#0066cc)
- [ ] Placeholder text uses muted color (#6b7280)

---

## 📋 Design Token Reference

### Colors

```
Primary (Smart Blue): #0066cc
Secondary (Oxford Navy): #003366
Background: #f9fafb
Foreground (Text): #111827
Muted Text: #6b7280
Border: #e5e7eb
Card Background: #ffffff
Accent (Amber): #ffcc00
Destructive (Berry): #cc0066
```

### Typography

```
Font Family: Inter
Base Size: 14px
Line Height: 1.5 (body), 1.2 (headings)

h1: 36px / 700
h2: 24px / 700
h3: 20px / 600
h4-6: inherit / 600
```

### Spacing (8px grid)

```
1: 4px
2: 8px
3: 12px
4: 16px
6: 24px
8: 32px
12: 48px
```

### Border Radius

```
sm: 4px
md: 10px
lg: 12px (default --radius)
```

---

## 🎯 Design Philosophy

### Modern Classic Approach

- **Clean & Minimal**: Ample whitespace, clear hierarchy
- **Professional**: Subtle colors, proper contrast
- **Accessible**: WCAG AA compliance, keyboard navigation
- **Consistent**: Same patterns across all pages

### Component Patterns

1. **Cards**: White background, subtle border, 32px padding, 12px radius
2. **Buttons**: Rounded (8px), semantic colors, hover states
3. **Inputs**: White background, gray border, blue focus ring
4. **Typography**: Clear hierarchy, consistent spacing

---

## 🔍 Audit Checklist

### For Each Page:

- [ ] Background is #f9fafb
- [ ] All text uses Inter font
- [ ] Spacing follows 8px grid
- [ ] Cards have 32px padding
- [ ] Inputs have consistent styling
- [ ] Buttons use semantic variants
- [ ] Color palette matches ACE

### Priority Pages:

1. `/create` - Create Product (mostly done)
2. `/` - Dashboard
3. Navigation sidebar (all pages)

---

## 📝 Implementation Strategy

### Phase 1: Foundation ✅ COMPLETE

- [x] Update Tailwind config
- [x] Fix global styles
- [x] Update core shadcn components (input, textarea, select)

### Phase 2: Navigation (NEXT)

- [ ] Redesign sidebar navigation
- [ ] Update header/top navigation
- [ ] Add proper active states

### Phase 3: Page Layouts

- [ ] Standardize page containers
- [ ] Consistent card layouts
- [ ] Typography hierarchy

### Phase 4: Refinement

- [ ] Add micro-interactions
- [ ] Polish transitions
- [ ] Accessibility audit

---

## 🛠️ Tools & Technologies

**Foundation:**

- Tailwind CSS v3.x
- shadcn/ui components (Radix UI primitives)
- CSS Custom Properties (for theme tokens)

**Design System:**

- ACE color palette
- Inter font family
- 8px spacing grid
- Semantic color tokens
