# Polaris to Modern UI Migration Guide

## Overview

This document maps Shopify Polaris components to modern shadcn/ui components using the ACE color system.

## Color System

The new UI uses the ACE custom color palette:

- **Oxford Navy**: Deep authoritative blue for headings and primary text
- **Smart Blue**: Vibrant blue for primary actions and buttons
- **Dodger Blue**: Bright blue for info and highlights
- **Berry Lipstick**: Bold pink/red for accents and destructive actions
- **Bright Amber**: Gold for warnings and success metrics

## Component Mapping

### Layout Components

| Polaris Component | Modern Replacement                          | Notes                    |
| ----------------- | ------------------------------------------- | ------------------------ |
| `Page`            | `<div className="container mx-auto p-6">`   | Use Tailwind container   |
| `Layout`          | `<div className="grid grid-cols-1 gap-6">`  | Flexbox/Grid layout      |
| `Layout.Section`  | `<section className="space-y-4">`           | Semantic section         |
| `Box`             | `<div>`                                     | Simple div with Tailwind |
| `InlineStack`     | `<div className="flex gap-4 items-center">` | Flexbox row              |
| `BlockStack`      | `<div className="flex flex-col gap-4">`     | Flexbox column           |

### Form Components

| Polaris Component | Modern Replacement                | Import Path              |
| ----------------- | --------------------------------- | ------------------------ |
| `TextField`       | `<Input />`                       | `@/components/ui/input`  |
| `Select`          | `<Select />`                      | `@/components/ui/select` |
| `Form`            | `<form>`                          | Native HTML              |
| `FormLayout`      | `<div className="space-y-4">`     | Tailwind spacing         |
| `Checkbox`        | `<Checkbox />` (needs creation)   | New component            |
| `RadioButton`     | `<RadioGroup />` (needs creation) | New component            |

### Display Components

| Polaris Component | Modern Replacement | Import Path                       |
| ----------------- | ------------------ | --------------------------------- |
| `Card`            | `<Card />`         | `@/components/ui/card`            |
| `Banner`          | `<Alert />`        | `@/components/ui/alert`           |
| `Badge`           | `<Badge />`        | `@/components/ui/badge`           |
| `Text`            | `<p>`, `<span>`    | Native HTML with Tailwind         |
| `Spinner`         | `<Spinner />`      | `@/components/ui/loading/spinner` |
| `ProgressBar`     | `<Progress />`     | `@/components/ui/progress`        |
| `Thumbnail`       | `<img>`            | Native with Tailwind              |

### Action Components

| Polaris Component    | Modern Replacement                   | Import Path              |
| -------------------- | ------------------------------------ | ------------------------ |
| `Button`             | `<Button />`                         | `@/components/ui/button` |
| `Link` (PolarisLink) | `<Link>`                             | Next.js Link             |
| `Modal`              | `<Dialog />`                         | `@/components/ui/dialog` |
| `DropZone`           | Custom `<DropZone />` (needs update) | New component            |

## Migration Examples

### Before (Polaris):

```tsx
import { Page, Layout, Card, Text, Button } from "@shopify/polaris";

<Page title="Dashboard">
  <Layout>
    <Layout.Section>
      <Card>
        <Text variant="headingMd">Welcome</Text>
        <Button primary>Get Started</Button>
      </Card>
    </Layout.Section>
  </Layout>
</Page>;
```

### After (Modern):

```tsx
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

<div className="container mx-auto p-6">
  <div className="grid grid-cols-1 gap-6">
    <section>
      <Card>
        <CardHeader>
          <CardTitle>Welcome</CardTitle>
        </CardHeader>
        <CardContent>
          <Button>Get Started</Button>
        </CardContent>
      </Card>
    </section>
  </div>
</div>;
```

## Text Styling Classes

Replace Polaris text variants with Tailwind classes:

| Polaris Variant | Tailwind Replacement                    |
| --------------- | --------------------------------------- |
| `headingXl`     | `text-3xl font-bold text-oxford-900`    |
| `headingLg`     | `text-2xl font-bold text-oxford-900`    |
| `headingMd`     | `text-xl font-semibold text-oxford-800` |
| `headingSm`     | `text-lg font-semibold text-oxford-800` |
| `bodyLg`        | `text-base text-foreground`             |
| `bodyMd`        | `text-sm text-foreground`               |
| `bodySm`        | `text-xs text-muted-foreground`         |

## Button Variants

| Polaris Props | Modern Equivalent                |
| ------------- | -------------------------------- |
| `primary`     | `variant="default"` (Smart Blue) |
| `destructive` | `variant="destructive"` (Berry)  |
| `plain`       | `variant="ghost"`                |
| `outline`     | `variant="outline"`              |
| `disabled`    | `disabled` prop                  |

## Status Colors

| Status            | Color                             | Usage                        |
| ----------------- | --------------------------------- | ---------------------------- |
| Primary Action    | `bg-smart-500 hover:bg-smart-600` | Buttons, CTAs                |
| Success           | `bg-amber-500`                    | Success states               |
| Warning           | `bg-amber-500`                    | Warning alerts               |
| Error/Destructive | `bg-berry-500`                    | Delete, destructive actions  |
| Info              | `bg-dodger-500`                   | Information displays         |
| Muted             | `bg-oxford-50`                    | Backgrounds, disabled states |

## Next Steps

1. Review each file using Polaris components
2. Replace imports with modern equivalents
3. Update JSX to use new components and Tailwind classes
4. Test visual consistency
5. Remove @shopify/polaris from package.json
