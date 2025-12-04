# Shared UI Components

Common UI components used across ThunderText and ACE applications

## Overview

This package contains reusable React components, hooks, and utilities shared between the ThunderText and ACE apps. It promotes code reuse and maintains consistent design across the platform.

## Installation

This package is automatically available within the monorepo workspace:

```typescript
import { cn } from "@thunder-text/shared-ui";
import { Button } from "@thunder-text/shared-ui/components/button";
```

## Structure

```
packages/shared-ui/
├── src/
│   ├── components/       # Shared React components
│   ├── hooks/            # Shared React hooks
│   ├── lib/              # Utility functions
│   └── styles/           # Shared styles
├── package.json
├── tsconfig.json
└── README.md
```

## Utilities

### `cn()` - Class Name Merger

Combines and deduplicates Tailwind CSS classes:

```typescript
import { cn } from '@thunder-text/shared-ui'

<div className={cn('px-4 py-2', isActive && 'bg-blue-500', className)} />
```

## Components

Shared components will be added as they are extracted from the main applications.

### Planned Components

- Button
- Card
- Dialog
- Dropdown
- Input
- Select
- Tooltip
- Loading states
- Error boundaries

## Hooks

Shared hooks will be added as they are extracted from the main applications.

### Planned Hooks

- `useDebounce` - Debounce values
- `useLocalStorage` - Persistent state
- `useMediaQuery` - Responsive helpers
- `useClickOutside` - Click outside detection

## Design System

### Colors

Both apps share a base color palette with app-specific primary colors:

- **ThunderText**: Blue primary (`hsl(221.2 83.2% 53.3%)`)
- **ACE**: Purple primary (`hsl(271.5 81.3% 55.9%)`)

### Typography

- Font: Inter
- Heading scales: 4xl, 3xl, 2xl, xl, lg
- Body text: base, sm, xs

### Spacing

Following Tailwind's spacing scale (4px base unit)

## Development

### Adding a New Component

1. Create component file in `src/components/`
2. Export from `src/components/index.ts`
3. Document props and usage
4. Add to README

Example:

```typescript
// src/components/button.tsx
export interface ButtonProps {
  variant?: 'primary' | 'secondary'
  size?: 'sm' | 'md' | 'lg'
  children: React.ReactNode
}

export function Button({ variant = 'primary', size = 'md', children }: ButtonProps) {
  return <button className={cn(/* classes */)}>{children}</button>
}
```

```typescript
// src/components/index.ts
export { Button } from "./button";
```

### Adding a New Hook

1. Create hook file in `src/hooks/`
2. Export from `src/hooks/index.ts`
3. Document parameters and return value

Example:

```typescript
// src/hooks/use-debounce.ts
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}
```

## Dependencies

### Peer Dependencies

- React >= 19.0.0
- React DOM >= 19.0.0

### UI Libraries

- Radix UI primitives
- Tailwind CSS
- Shopify Polaris (shared components)
- Lucide React (icons)

## Usage in Apps

### ThunderText App

```typescript
import { cn } from '@thunder-text/shared-ui'
import { Button } from '@thunder-text/shared-ui/components/button'

export function MyComponent() {
  return (
    <div className={cn('p-4')}>
      <Button variant="primary">Generate Description</Button>
    </div>
  )
}
```

### ACE App

```typescript
import { cn } from '@thunder-text/shared-ui'
import { Button } from '@thunder-text/shared-ui/components/button'

export function MyComponent() {
  return (
    <div className={cn('p-4')}>
      <Button variant="primary">Generate Ad</Button>
    </div>
  )
}
```

## Best Practices

1. **Component Independence**: Components should work standalone
2. **TypeScript**: Always use TypeScript for type safety
3. **Accessibility**: Follow WCAG 2.1 AA standards
4. **Documentation**: Document all props and usage
5. **Testing**: Add tests for complex components
6. **Performance**: Use React.memo for expensive components

## Contributing

When adding shared components:

1. Ensure the component is truly shared (used by both apps)
2. Keep components generic and configurable
3. Avoid app-specific logic
4. Document thoroughly
5. Add proper TypeScript types

## License

UNLICENSED - Proprietary software
