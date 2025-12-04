# ACE Design System

**Version**: 1.0
**Last Updated**: November 30, 2025
**Status**: Active

---

## Color Palette

### Primary Colors

- **Oxford Navy**: `#003366` - Headings, primary text, important UI elements
- **Smart Blue**: `#0066cc` - Primary actions, links, buttons, focus states, interactive elements

### Backgrounds

- **Warm Background**: `#fafaf9` - Page backgrounds
- **White**: `#ffffff` - Card backgrounds, input backgrounds

### Text Colors

- **Gray Text**: `#6b7280` - Secondary text, descriptions, hints
- **Gray Border**: `#e5e7eb` - Borders, dividers, input borders

### Accent Colors

- **Light Blue Background**: `#f0f7ff` - Badges, info alerts, hover states
- **Light Blue Border**: `#bfdbfe` - Info alert borders

### Status Colors

#### Success (Green)

- **Success Background**: `#f0fdf4` - Success alert background
- **Success Border**: `#bbf7d0` - Success alert border
- **Success Text**: `#166534` - Success message text
- **Success Primary**: `#16a34a` - Success icons, primary success text
- **Success Dark**: `#15803d` - Success headings, bold text

#### Error (Red)

- **Error Background**: `#fff5f5` - Error alert background
- **Error Border**: `#fecaca` - Error alert border
- **Error Primary**: `#dc2626` - Error icons, primary error text
- **Error Dark**: `#b91c1c` - Error headings, buttons
- **Error Darker**: `#991b1b` - Error button hover states

#### Warning (Amber)

- **Warning Background**: `#fffbeb` - Warning alert background
- **Warning Border**: `#fcd34d` - Warning alert border
- **Warning Text**: `#78350f` - Warning message text
- **Warning Dark**: `#92400e` - Warning headings

#### Info (Blue)

- **Info Background**: `#eff6ff` - Info alert background
- **Info Border**: `#bfdbfe` - Info alert border
- **Info Text**: `#003366` - Info message text (Oxford Navy)
- **Info Secondary**: `#0066cc` - Info secondary text (Smart Blue)

### Interactive States

- **Disabled Background**: `#f9fafb` - Disabled inputs, buttons
- **Hover Background**: `#f9fafb` - Button hover states
- **Focus Border**: `#0066cc` - Smart Blue for input focus states

---

## Typography

### Font Family

```css
font-family:
  Inter,
  -apple-system,
  BlinkMacSystemFont,
  "Segoe UI",
  sans-serif;
```

### Headings

- **H1**: `32px` / `700` weight / Oxford Navy `#003366`
- **H2**: `24px` / `700` weight / Oxford Navy `#003366`
- **H3**: `20px` / `700` weight / Oxford Navy `#003366`

### Body Text

- **Body**: `14px` / `1.5-1.6` line-height
- **Small**: `12px`

### Weights

- Normal: `400`
- Medium: `500`
- Semibold: `600`
- Bold: `700`

---

## Spacing Scale

Based on **8px grid system**:

- **4px**: Minimal spacing (title to subtitle)
- **8px**: Tight spacing (label to input field)
- **12px**: Comfortable spacing (related items in a group, button gaps)
- **16px**: Standard spacing (form fields, elements within cards)
- **24px**: Spacious spacing (card padding, section gaps)
- **32px**: Section breaks (between major sections)
- **48px**: Major section breaks

### Common Use Cases

- **Card padding**: `24px`
- **Between elements in card**: `16px`
- **Related items**: `12px`
- **Label to input**: `8px`
- **Title to subtitle**: `4px`

---

## Form Elements

### Input Fields & Text Boxes

#### Dimensions

- **Padding**: `12px` (vertical and horizontal)
- **Font Size**: `14px`
- **Border**: `1px solid #e5e7eb`
- **Border Radius**: `8px`

#### States

**Default**:

```css
padding: 12px;
font-size: 14px;
border: 1px solid #e5e7eb;
border-radius: 8px;
background: #ffffff;
color: #003366;
```

**Focus**:

```css
border-color: #0066cc;
outline: none;
```

**Disabled**:

```css
background: #f9fafb;
color: #6b7280;
cursor: not-allowed;
```

#### Input Padding Standard

**Inner Padding**: `12px` on all sides

- This provides adequate space between text and input borders
- Maintains consistent visual rhythm with 8px grid system
- Ensures comfortable touch targets (minimum 44px height with 12px top + 12px bottom + 20px text height)

### Labels

- **Font Size**: `14px`
- **Font Weight**: `600`
- **Color**: Oxford Navy `#003366`
- **Margin Bottom**: `8px` (from label to input)

### Textareas

- Same as inputs but with adjustable rows
- Default rows: `3-4`
- Min height: Consider content needs

### Select Dropdowns

- Same styling as inputs
- Chevron icon for visual affordance
- Focus state with Smart Blue border

---

## Buttons

### Primary Button

```css
background: #0066cc;
color: #ffffff;
border: none;
border-radius: 8px;
padding: 12px 24px;
font-size: 14px;
font-weight: 600;
cursor: pointer;
transition: all 0.15s ease;
```

**Hover**: `background: #0052a3`

**Disabled**:

```css
background: #f9fafb;
color: #6b7280;
cursor: not-allowed;
```

### Secondary/Outline Button

```css
background: transparent;
color: #003366;
border: 1px solid #e5e7eb;
border-radius: 8px;
padding: 12px 24px;
font-size: 14px;
font-weight: 600;
cursor: pointer;
transition: all 0.15s ease;
```

**Hover**:

```css
background: #f9fafb;
border-color: #0066cc;
```

### Destructive Button (Delete/Cancel)

```css
background: #dc2626;
color: #ffffff;
border: none;
border-radius: 8px;
padding: 12px 24px;
font-size: 14px;
font-weight: 600;
cursor: pointer;
transition: all 0.15s ease;
```

**Hover**: `background: #b91c1c`

### Button Sizes

- **Small**: `padding: 8px 16px; font-size: 12px`
- **Medium** (Default): `padding: 12px 24px; font-size: 14px`
- **Large**: `padding: 16px 32px; font-size: 16px`

---

## Cards

### Standard Card

```css
background: #ffffff;
border: 1px solid #e5e7eb;
border-radius: 8px;
box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
padding: 24px;
```

### Card Header

- **Border Bottom**: `1px solid #e5e7eb`
- **Padding**: `24px`
- **Margin Bottom**: `0` (content starts with padding)

### Card Content

- **Padding**: `24px`
- **Gap Between Elements**: `16px`

---

## Alerts

### Info Alert

```css
background: #eff6ff;
border: 1px solid #bfdbfe;
border-radius: 8px;
padding: 16px;
```

- **Icon Color**: Smart Blue `#0066cc`
- **Text Color**: Oxford Navy `#003366`

### Success Alert

```css
background: #f0fdf4;
border: 1px solid #bbf7d0;
border-radius: 8px;
padding: 16px;
```

- **Icon Color**: `#16a34a`
- **Text Color**: `#166534`
- **Heading Color**: `#15803d`

### Warning Alert

```css
background: #fffbeb;
border: 1px solid #fcd34d;
border-radius: 8px;
padding: 16px;
```

- **Text Color**: `#78350f`
- **Heading Color**: `#92400e`

### Error Alert

```css
background: #fff5f5;
border: 1px solid #fecaca;
border-radius: 8px;
padding: 16px;
```

- **Icon Color**: `#dc2626`
- **Text Color**: `#b91c1c`

---

## Modals

### Modal Backdrop

```css
position: fixed;
inset: 0;
background: rgba(0, 0, 0, 0.5);
display: flex;
align-items: center;
justify-content: center;
z-index: 50;
padding: 16px;
```

### Modal Container

```css
background: #ffffff;
border-radius: 8px;
box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
max-width: 600px; /* or as needed */
width: 100%;
```

### Modal Header

```css
padding: 24px;
border-bottom: 1px solid #e5e7eb;
```

### Modal Content

```css
padding: 24px;
```

### Modal Footer

```css
padding: 24px;
border-top: 1px solid #e5e7eb;
display: flex;
gap: 12px;
justify-content: flex-end;
```

---

## Badges

### Standard Badge

```css
display: inline-block;
padding: 6px 12px;
background: #f0f7ff;
border: 1px solid #bfdbfe;
border-radius: 6px;
font-size: 14px;
font-weight: 500;
color: #003366;
```

### Status Badges

- Success: Green background `#f0fdf4` with green border `#bbf7d0`
- Error: Red background `#fff5f5` with red border `#fecaca`
- Warning: Amber background `#fffbeb` with amber border `#fcd34d`

---

## Layout

### Page Container

```css
background: #fafaf9;
min-height: 100vh;
padding: 32px 16px;
```

### Content Max Width

```css
max-width: 800px; /* for single column */
max-width: 1000px; /* for wider content */
margin: 0 auto;
width: 100%;
```

### Grid Gaps

- **Between cards**: `24px`
- **Between sections**: `32px`
- **Within grid**: `16px` or `24px`

---

## Transitions

### Standard Transition

```css
transition: all 0.15s ease;
```

Use for:

- Button hover states
- Input focus states
- Border color changes
- Background color changes

---

## Accessibility

### Minimum Touch Targets

- Buttons: `44px × 44px` minimum
- Input height with padding: `44px` minimum (12px padding × 2 + ~20px text)

### Focus States

- Always visible with Smart Blue `#0066cc` border
- Never remove outline without replacement
- Keyboard navigable

### Color Contrast

- Headings (Oxford Navy on white): 8.59:1 ✅
- Body text (Gray on white): 4.61:1 ✅
- Smart Blue on white: 5.74:1 ✅

---

## Best Practices

### DO

- Use Oxford Navy for headings and important text
- Use Smart Blue for interactive elements
- Maintain 8px grid spacing
- Add 12px padding inside all inputs
- Use consistent border radius (8px for cards/inputs, 6px for badges)
- Include hover states on all clickable elements
- Use proper semantic HTML

### DON'T

- Mix spacing that doesn't align to 8px grid
- Use colors outside the defined palette
- Remove input padding (must maintain 12px minimum)
- Skip focus states
- Use less than 12px padding in inputs
- Mix font families

---

## Component Examples

### Example: Text Input with Label

```tsx
<div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
  <label
    style={{
      fontSize: "14px",
      fontWeight: 600,
      color: "#003366",
      fontFamily:
        'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}
  >
    Email Address
  </label>
  <input
    type="email"
    placeholder="you@example.com"
    style={{
      padding: "12px",
      fontSize: "14px",
      fontFamily:
        'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      border: "1px solid #e5e7eb",
      borderRadius: "8px",
      outline: "none",
      transition: "border-color 0.15s ease",
    }}
    onFocus={(e) => {
      e.currentTarget.style.borderColor = "#0066cc";
    }}
    onBlur={(e) => {
      e.currentTarget.style.borderColor = "#e5e7eb";
    }}
  />
</div>
```

### Example: Primary Button

```tsx
<button
  style={{
    background: "#0066cc",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    padding: "12px 24px",
    fontSize: "14px",
    fontWeight: 600,
    fontFamily:
      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    cursor: "pointer",
    transition: "all 0.15s ease",
  }}
  onMouseEnter={(e) => {
    e.currentTarget.style.background = "#0052a3";
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.background = "#0066cc";
  }}
>
  Save Changes
</button>
```

---

## Version History

### 1.0 (November 30, 2025)

- Initial ACE Design System documentation
- Defined color palette and typography standards
- Documented spacing scale (8px grid)
- **Added input padding standard: 12px on all sides**
- Established button, card, alert, and modal patterns
- Created component examples

---

**Maintained by**: Thunder Text Design Team
**For questions**: Refer to implementation examples in codebase
