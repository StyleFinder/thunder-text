# Thunder Text UI Redesign Plan

## Overview

Comprehensive plan to redesign all 49 pages in Thunder Text following the "Luminous Depth" design system established in the Welcome page redesign.

---

## Design System Reference

### Established Patterns (from Welcome Page)
- **Left Panel**: Dark navy gradient (`#001429` → `#002952` → `#003d7a`)
- **Main Content**: Clean white/gray-50 background
- **Typography**: Inter font, `text-gray-900` for headings, `text-gray-500/600` for body
- **Cards**: White background, subtle borders (`border-gray-200`), rounded-xl
- **Primary Actions**: Blue gradient buttons (`#0066cc` → `#0099ff`)
- **Accents**: Amber badges, gradient text highlights
- **Icons**: Lucide React with blue gradient backgrounds

### Key CSS Classes
```css
/* Backgrounds */
bg-gray-50, bg-white

/* Text */
text-gray-900 (headings), text-gray-600 (body), text-gray-500 (muted)

/* Borders */
border-gray-200, rounded-xl, rounded-lg

/* Spacing */
p-6, p-8, gap-6, mb-8
```

---

## Phase 1: Authentication & Onboarding (Priority: HIGH)

First impressions matter - these pages are user's entry points.

### Pages (7)
| Page | Path | Current State | Effort |
|------|------|---------------|--------|
| Welcome | `/welcome` | DONE | - |
| Login | `/auth/login` | Basic Card + BHB components | Medium |
| Signup | `/auth/signup` | Basic Card | Medium |
| Forgot Password | `/auth/forgot-password` | Basic | Low |
| Reset Password | `/auth/reset-password` | Basic | Low |
| Confirm Action | `/auth/confirm-action` | Basic | Low |
| Auth Error | `/auth/error` | Basic | Low |
| Install | `/install` | Redirect page | Low |

### Design Approach
- Apply split-screen layout from Welcome page
- Left panel: Brand messaging, trust indicators
- Right panel: Form content
- Consistent gradient backgrounds and card styling

---

## Phase 2: Main Dashboard & Navigation (Priority: HIGH)

Core user experience after login.

### Pages (3)
| Page | Path | Current State | Effort |
|------|------|---------------|--------|
| Home/Landing | `/` | Marketing page | High |
| Dashboard | `/dashboard` | Card grid with stats | High |
| Embedded | `/embedded` | Shopify embedded view | Medium |

### Design Approach
- Dashboard: Modern stat cards, quick action tiles, activity feed
- Feature cards with hover effects and icons
- Consistent navigation header

---

## Phase 3: Core Product Features (Priority: HIGH)

Main value-generating pages.

### 3A: Product Description Tools (3 pages)
| Page | Path | Current State | Effort |
|------|------|---------------|--------|
| Create PD | `/create-pd` | Upload + form UI | High |
| Products | `/products` | Product listing | Medium |
| Enhance | `/enhance` | Enhancement tool | Medium |

### 3B: Ad Creation Engine (5 pages)
| Page | Path | Current State | Effort |
|------|------|---------------|--------|
| AIE Main | `/aie` | Complex form UI | High |
| AIE Library | `/aie/library` | Gallery view | Medium |
| Facebook Ads | `/facebook-ads` | Integration UI | Medium |
| Ads Library | `/ads-library` | Gallery | Medium |
| Ad Vault | `/ad-vault` | Archive view | Low |

### Design Approach
- Clean step-by-step wizards for creation flows
- Image upload areas with drag-drop styling
- Result previews with device mockups
- Gallery layouts for libraries

---

## Phase 4: Content Center (Priority: MEDIUM)

Content management hub.

### Pages (7)
| Page | Path | Current State | Effort |
|------|------|---------------|--------|
| Content Center Home | `/content-center` | Dashboard cards | Medium |
| Generate | `/content-center/generate` | Form wizard | High |
| Library | `/content-center/library` | Content list | Medium |
| Library Detail | `/content-center/library/[id]` | Single view | Low |
| Samples | `/content-center/samples` | Gallery | Low |
| Voice | `/content-center/voice` | Settings | Medium |
| Onboarding | `/content-center/onboarding` | Wizard flow | Medium |

### Design Approach
- Consistent card layouts for content items
- Filtering/sorting UI
- Rich text preview components

---

## Phase 5: Brand Voice & Profile (Priority: MEDIUM)

Configuration and settings pages.

### 5A: Brand Voice (5 pages)
| Page | Path | Current State | Effort |
|------|------|---------------|--------|
| Brand Voice Home | `/brand-voice` | Overview | Medium |
| Edit | `/brand-voice/edit` | Form | Medium |
| Quick Start | `/brand-voice/edit/quick-start` | Wizard | Medium |
| Profile | `/brand-voice/profile` | Display | Low |
| Settings | `/brand-voice/settings` | Config | Low |

### 5B: Business Profile (1 page)
| Page | Path | Current State | Effort |
|------|------|---------------|--------|
| Business Profile | `/business-profile` | Multi-step form | Medium |

### Design Approach
- Form sections with clear headers
- Progress indicators for multi-step flows
- Preview panels showing real-time changes

---

## Phase 6: BHB Coach (Priority: MEDIUM)

AI coaching feature.

### Pages (3)
| Page | Path | Current State | Effort |
|------|------|---------------|--------|
| BHB Home | `/bhb` | Chat interface | High |
| Hot Takes | `/bhb/hot-takes` | Feed view | Medium |
| Store View | `/bhb/store/[shop_id]` | Store-specific | Low |

### Design Approach
- Chat UI with modern message bubbles
- Card-based content for hot takes
- Clean analytics display

---

## Phase 7: Settings (Priority: MEDIUM)

Configuration pages.

### Pages (3)
| Page | Path | Current State | Effort |
|------|------|---------------|--------|
| Settings Home | `/settings` | Tab layout | Medium |
| Connections | `/settings/connections` | Integration cards | Medium |
| Prompts | `/settings/prompts` | Form/list | Low |

### Design Approach
- Tab-based or sidebar navigation
- Connection cards with status indicators
- Form sections with clear groupings

---

## Phase 8: Admin & Coach Portals (Priority: LOW)

Internal/admin pages.

### 8A: Admin Portal (3 pages)
| Page | Path | Current State | Effort |
|------|------|---------------|--------|
| Admin Login | `/admin/login` | Basic | Low |
| Admin Coaches | `/admin/coaches` | List/table | Medium |
| Admin Settings | `/admin/settings` | Config | Low |

### 8B: Coach Portal (2 pages)
| Page | Path | Current State | Effort |
|------|------|---------------|--------|
| Coach Login | `/coach/login` | Basic | Low |
| Set Password | `/coach/set-password` | Form | Low |

### Design Approach
- Simpler, functional design
- Data tables for management views
- Standard form layouts

---

## Phase 9: Utility Pages (Priority: LOW)

Static and support pages.

### Pages (5)
| Page | Path | Current State | Effort |
|------|------|---------------|--------|
| Privacy | `/privacy` | Text content | Low |
| Help | `/help` | Documentation | Low |
| Best Practices | `/best-practices` | Guide content | Low |
| Trends | `/trends` | Analytics | Medium |
| Embed | `/embed` | Embed code | Low |

### Design Approach
- Clean typography for long-form content
- Consistent documentation styling
- Analytics dashboards for trends

---

## Recommended Execution Order

### Sprint 1: Auth Flow (1-2 days)
1. `/auth/login` - Apply welcome page split-screen
2. `/auth/signup` - Match login styling
3. Remaining auth pages (batch)

### Sprint 2: Dashboard (2-3 days)
1. `/dashboard` - Full redesign with stat cards
2. `/` - Landing/home page
3. Navigation components

### Sprint 3: Core Features - Part 1 (3-4 days)
1. `/create-pd` - Product description creator
2. `/aie` - Ad Intelligence Engine
3. `/products` - Product listing

### Sprint 4: Core Features - Part 2 (2-3 days)
1. `/aie/library` - Ad library
2. `/ads-library` - Ad gallery
3. `/facebook-ads` - Facebook integration

### Sprint 5: Content Center (3-4 days)
1. `/content-center` - Dashboard
2. `/content-center/generate` - Generator
3. `/content-center/library` - Library
4. Remaining content pages (batch)

### Sprint 6: Brand & Settings (2-3 days)
1. `/brand-voice/*` - All brand voice pages
2. `/business-profile`
3. `/settings/*` - All settings pages

### Sprint 7: Remaining Pages (2-3 days)
1. BHB Coach pages
2. Admin/Coach portals
3. Utility pages

---

## Shared Components to Create

Build these reusable components first:

1. **PageLayout** - Standard page wrapper with nav
2. **SplitScreenLayout** - For auth pages
3. **StatCard** - Dashboard statistics
4. **FeatureCard** - Feature highlights with icons
5. **GradientButton** - Primary action buttons
6. **ImageUploadArea** - Drag-drop upload zone
7. **StepIndicator** - Multi-step progress
8. **ContentCard** - Library item cards
9. **FormSection** - Grouped form fields
10. **DataTable** - Admin data tables

---

## Total Effort Estimate

| Phase | Pages | Effort |
|-------|-------|--------|
| Phase 1 | 7 | 1-2 days |
| Phase 2 | 3 | 2-3 days |
| Phase 3 | 8 | 4-5 days |
| Phase 4 | 7 | 3-4 days |
| Phase 5 | 6 | 2-3 days |
| Phase 6 | 3 | 2-3 days |
| Phase 7 | 3 | 1-2 days |
| Phase 8 | 5 | 1-2 days |
| Phase 9 | 5 | 1-2 days |
| **Total** | **47** | **17-26 days** |

---

## Next Steps

1. Review and approve this plan
2. Create shared component library
3. Begin Phase 1: Auth pages
4. Iterate based on feedback

---

*Plan created: December 5, 2025*
*Welcome page redesign: COMPLETE*
