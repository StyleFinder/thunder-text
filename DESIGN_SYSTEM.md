# ACE Design System

Thunder Text uses a custom design system that replaces Shopify Polaris with ACE-branded components.

## Color Palette

### Primary Brand Colors

- **Oxford Navy Dark**: `#001429` - Very dark blue, almost black (navigation header)
- **Oxford Navy**: `#003366` - Deep navy blue (headings, primary text)
- **Smart Blue**: `#0066cc` - Vibrant professional blue (links, primary actions)
- **Berry Lipstick**: `#cc0066` - Bold pink/magenta (accents, badges)
- **Bright Amber**: `#ffcc00` - Vibrant gold/yellow (positive metrics, highlights)

### Neutral Colors

- **Background**: `#fafaf9` - Warm off-white (page background)
- **White**: `#ffffff` - Pure white (card backgrounds)
- **Gray Text**: `#6b7280` - Medium gray (secondary text)
- **Border**: `#e5e7eb` - Light gray (borders, dividers)

### Semantic Colors

- **Success**: `#10b981` - Green (success states)
- **Warning**: `#ffcc00` - Amber (warnings)
- **Error**: `#cc0066` - Berry (errors)
- **Info**: `#0066cc` - Smart Blue (info)

## Typography

### Font Stack

```css
font-family:
  "Inter",
  "SF Pro",
  -apple-system,
  BlinkMacSystemFont,
  "Segoe UI",
  sans-serif;
```

### Headings

- All headings use **Oxford Navy** (#003366)
- Font weight: **700** (bold)
- H1: 32px
- H2: 24px
- H3: 18px

### Body

- Font size: 14px
- Line height: 1.5
- Color: Oxford Navy Dark (#001429)

## Layout

### Spacing

```typescript
spacing: {
  xs: '3px',
  sm: '6px',
  md: '12px',
  lg: '18px',
  xl: '24px',
  xxl: '36px',
}
```

### Border Radius

- Cards: **8px**
- Buttons: **8px**
- Inputs: **8px**

### Shadows

```css
/* Card Shadow */
box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
```

## Components

### Navigation Bar

- Background: Oxford Navy Dark (#001429)
- Height: 64px
- Text color: White
- Sticky positioned at top

### Cards

```tsx
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>Content goes here</CardContent>
</Card>;
```

**Styling:**

- Background: White (#ffffff)
- Border: 1px solid #e5e7eb
- Border radius: 8px
- Shadow: 0 2px 8px rgba(0, 0, 0, 0.08)

### Buttons

```tsx
import { Button } from '@/components/ui/button'

<Button variant="default">Primary Action</Button>
<Button variant="secondary">Secondary Action</Button>
<Button variant="outline">Outline Button</Button>
<Button variant="ghost">Ghost Button</Button>
<Button variant="destructive">Delete</Button>
```

**Variants:**

- `default`: Smart Blue background with white text
- `secondary`: Oxford Navy background with white text
- `outline`: White background with Smart Blue border
- `ghost`: Transparent with Smart Blue text
- `destructive`: Berry Lipstick background with white text

### Inputs

```tsx
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

<div>
  <Label htmlFor="email">Email</Label>
  <Input id="email" type="email" placeholder="Enter email" />
</div>;
```

**Styling:**

- Border: 1px solid #e5e7eb
- Background: White (#ffffff)
- Border radius: 8px
- Focus: Blue ring (0 0 0 3px rgba(0, 102, 204, 0.1))

### Select/Dropdown

```tsx
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

<Select>
  <SelectTrigger>
    <SelectValue placeholder="Select option" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="option1">Option 1</SelectItem>
    <SelectItem value="option2">Option 2</SelectItem>
  </SelectContent>
</Select>;
```

### Alerts

```tsx
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

<Alert variant="default">
  <AlertTitle>Info</AlertTitle>
  <AlertDescription>This is an informational message.</AlertDescription>
</Alert>

<Alert variant="destructive">
  <AlertTitle>Error</AlertTitle>
  <AlertDescription>Something went wrong.</AlertDescription>
</Alert>
```

### Badges

```tsx
import { Badge } from '@/components/ui/badge'

<Badge>Default</Badge>
<Badge variant="secondary">Secondary</Badge>
<Badge variant="outline">Outline</Badge>
<Badge variant="destructive">Error</Badge>
```

### Tabs

```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

<Tabs defaultValue="tab1">
  <TabsList>
    <TabsTrigger value="tab1">Tab 1</TabsTrigger>
    <TabsTrigger value="tab2">Tab 2</TabsTrigger>
  </TabsList>
  <TabsContent value="tab1">Tab 1 content</TabsContent>
  <TabsContent value="tab2">Tab 2 content</TabsContent>
</Tabs>;
```

### Dialogs/Modals

```tsx
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

<Dialog>
  <DialogTrigger asChild>
    <Button>Open Dialog</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Dialog Title</DialogTitle>
      <DialogDescription>Dialog description here.</DialogDescription>
    </DialogHeader>
    <div>Dialog content</div>
  </DialogContent>
</Dialog>;
```

### Checkbox

```tsx
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

<div className="flex items-center space-x-2">
  <Checkbox id="terms" />
  <Label htmlFor="terms">Accept terms and conditions</Label>
</div>;
```

### Separator

```tsx
import { Separator } from '@/components/ui/separator'

<Separator />
<Separator orientation="vertical" />
```

### Tooltip

```tsx
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

<TooltipProvider>
  <Tooltip>
    <TooltipTrigger>Hover me</TooltipTrigger>
    <TooltipContent>
      <p>Tooltip content</p>
    </TooltipContent>
  </Tooltip>
</TooltipProvider>;
```

## BHB Custom Components

For more specialized ACE-branded components, use the BHB component library:

```tsx
import { Card } from "@/components/bhb/Card";
import { Button } from "@/components/bhb/Button";
import { Input } from "@/components/bhb/Input";
```

These components use the design system colors and layout directly.

## Migration from Polaris

### Component Mapping

| Polaris Component | ACE Replacement                           |
| ----------------- | ----------------------------------------- |
| `Page`            | `<div>` with proper padding (32px)        |
| `Card`            | `@/components/ui/card`                    |
| `Button`          | `@/components/ui/button`                  |
| `TextField`       | `@/components/ui/input`                   |
| `Select`          | `@/components/ui/select`                  |
| `Checkbox`        | `@/components/ui/checkbox`                |
| `Banner`          | `@/components/ui/alert`                   |
| `Badge`           | `@/components/ui/badge`                   |
| `Tabs`            | `@/components/ui/tabs`                    |
| `Modal`           | `@/components/ui/dialog`                  |
| `Tooltip`         | `@/components/ui/tooltip`                 |
| `Spinner`         | Lucide `Loader2` icon with `animate-spin` |
| `Stack`           | Flex layout with Tailwind                 |
| `Layout`          | Flex/Grid layout with Tailwind            |

### Example Migration

**Before (Polaris):**

```tsx
import { Page, Card, Button, TextField } from "@shopify/polaris";

<Page title="Create Product">
  <Card>
    <TextField label="Product Name" value={name} onChange={setName} />
    <Button primary>Save</Button>
  </Card>
</Page>;
```

**After (ACE):**

```tsx
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

<div>
  <h1>Create Product</h1>
  <Card>
    <CardContent className="space-y-4 pt-6">
      <div>
        <Label htmlFor="name">Product Name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <Button>Save</Button>
    </CardContent>
  </Card>
</div>;
```

## Best Practices

1. **Always use ACE color palette** - Never hardcode colors outside the palette
2. **Use spacing tokens** - Reference the spacing scale for consistent padding/margins
3. **Maintain 8px border radius** - All rounded corners should be 8px
4. **Apply proper shadows** - Cards use `0 2px 8px rgba(0, 0, 0, 0.08)`
5. **Use semantic colors** - Success/Warning/Error colors for appropriate states
6. **Follow typography hierarchy** - H1 for page titles, H2 for sections, H3 for subsections
7. **Ensure accessibility** - Proper labels, focus states, and contrast ratios

## File Structure

```
src/
├── lib/
│   └── design-system/
│       ├── colors.ts       # Color palette
│       ├── layout.ts       # Spacing, shadows, radius
│       └── typography.ts   # Font definitions
├── components/
│   ├── ui/                 # shadcn/ui base components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   └── ...
│   └── bhb/                # ACE custom components
│       ├── Card.tsx
│       ├── Button.tsx
│       └── Input.tsx
└── app/
    └── globals.css         # Global styles & CSS variables
```

## CSS Variables

The design system uses CSS variables for theming:

```css
:root {
  --background: 28 20% 98%; /* #fafaf9 */
  --foreground: 210 100% 8%; /* #001429 */
  --card: 0 0% 100%; /* #ffffff */
  --primary: 210 100% 40%; /* #0066cc */
  --secondary: 210 100% 20%; /* #003366 */
  --accent: 48 100% 50%; /* #ffcc00 */
  --destructive: 340 100% 40%; /* #cc0066 */
  --border: 220 13% 91%; /* #e5e7eb */
  --radius: 0.5rem; /* 8px */
}
```

These can be referenced in Tailwind classes like `bg-background`, `text-foreground`, `border-border`, etc.
