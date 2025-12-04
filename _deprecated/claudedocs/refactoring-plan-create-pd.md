# Refactoring Plan: create-pd/page.tsx

**Current Size:** 1,926 LOC
**Target Size:** ~300 LOC (orchestration only)
**Estimated Effort:** 3-4 days
**Priority:** 🟡 Important

---

## Current Structure Analysis

The `create-pd/page.tsx` file is a monolithic component that handles:
1. **State Management** (~30 useState hooks)
2. **File Upload & Processing** (image upload, color detection)
3. **Product Data Pre-population** (from Shopify)
4. **Form Management** (product details, sizing, features)
5. **Template Selection** (category templates)
6. **Content Generation** (API calls to AI)
7. **Product Creation** (Shopify product creation)
8. **UI Rendering** (form fields, preview, modals)

---

## Refactoring Strategy

### Phase 1: Extract Custom Hooks (State Management)
**Goal:** Move state logic out of component

#### 1.1 Create `hooks/useProductForm.ts`
```typescript
export function useProductForm() {
  const [productType, setProductType] = useState('')
  const [availableSizing, setAvailableSizing] = useState('')
  const [fabricMaterial, setFabricMaterial] = useState('')
  const [occasionUse, setOccasionUse] = useState('')
  // ... all form fields

  const resetForm = () => { /* ... */ }
  const validateForm = () => { /* ... */ }

  return {
    formData: { productType, availableSizing, ... },
    setters: { setProductType, setAvailableSizing, ... },
    resetForm,
    validateForm
  }
}
```

#### 1.2 Create `hooks/useImageUpload.ts`
```typescript
export function useImageUpload() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [primaryPhotos, setPrimaryPhotos] = useState<UploadedFile[]>([])
  const [detectedVariants, setDetectedVariants] = useState<ColorVariant[]>([])

  const handleFileUpload = (files: FileList) => { /* ... */ }
  const detectColors = async () => { /* ... */ }
  const removeImage = (index: number) => { /* ... */ }

  return {
    uploadedFiles,
    primaryPhotos,
    detectedVariants,
    handleFileUpload,
    detectColors,
    removeImage
  }
}
```

#### 1.3 Create `hooks/useProductGeneration.ts`
```typescript
export function useProductGeneration() {
  const [generating, setGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [generatedContent, setGeneratedContent] = useState(null)

  const generateContent = async (data: FormData) => { /* ... */ }
  const createProduct = async (content: GeneratedContent) => { /* ... */ }

  return {
    generating,
    progress,
    generatedContent,
    generateContent,
    createProduct
  }
}
```

---

### Phase 2: Extract Components (UI)

#### 2.1 Create `components/create-pd/ImageUploadSection.tsx` (~150 LOC)
```typescript
interface ImageUploadSectionProps {
  uploadedFiles: UploadedFile[]
  primaryPhotos: UploadedFile[]
  detectedVariants: ColorVariant[]
  onFileUpload: (files: FileList) => void
  onDetectColors: () => void
  onRemoveImage: (index: number) => void
  colorDetectionLoading: boolean
}

export function ImageUploadSection(props: ImageUploadSectionProps) {
  // Render image upload UI, color detection, variant preview
}
```

#### 2.2 Create `components/create-pd/ProductDetailsForm.tsx` (~200 LOC)
```typescript
interface ProductDetailsFormProps {
  productType: string
  availableSizing: string
  fabricMaterial: string
  occasionUse: string
  keyFeatures: string
  additionalNotes: string
  onProductTypeChange: (type: string) => void
  onSizingChange: (sizing: string) => void
  // ... other handlers
}

export function ProductDetailsForm(props: ProductDetailsFormProps) {
  // Render product type selector, sizing, material fields
}
```

#### 2.3 Create `components/create-pd/TemplateSelector.tsx` (~100 LOC)
```typescript
interface TemplateSelectorProps {
  selectedTemplate: ProductCategory
  onTemplateChange: (category: ProductCategory) => void
  templatePreview?: Template | null
}

export function TemplateSelector(props: TemplateSelectorProps) {
  // Render category template selector with preview
}
```

#### 2.4 Create `components/create-pd/GenerationControls.tsx` (~80 LOC)
```typescript
interface GenerationControlsProps {
  generating: boolean
  progress: number
  onGenerate: () => void
  disabled: boolean
}

export function GenerationControls(props: GenerationControlsProps) {
  // Render generate button, progress bar, status
}
```

#### 2.5 Create `components/create-pd/ContentPreviewModal.tsx` (~150 LOC)
```typescript
interface ContentPreviewModalProps {
  open: boolean
  content: GeneratedContent | null
  creating: boolean
  onClose: () => void
  onCreate: () => void
  onEdit: (field: string, value: string) => void
}

export function ContentPreviewModal(props: ContentPreviewModalProps) {
  // Render modal with generated content preview and edit capabilities
}
```

---

### Phase 3: Extract Business Logic (Services)

#### 3.1 Create `lib/create-pd/color-detection.ts`
```typescript
export async function detectImageColors(images: File[]): Promise<ColorVariant[]> {
  // Color detection API logic
}

export function groupImagesByColor(
  detections: ColorDetectionResult[]
): ColorVariant[] {
  // Grouping logic
}
```

#### 3.2 Create `lib/create-pd/product-generator.ts`
```typescript
export async function generateProductContent(
  formData: ProductFormData,
  images: File[],
  shop: string
): Promise<GeneratedContent> {
  // API call to generation endpoint
}

export async function createShopifyProduct(
  content: GeneratedContent,
  shop: string
): Promise<ProductCreationResult> {
  // Shopify product creation API
}
```

#### 3.3 Create `lib/create-pd/data-formatter.ts`
```typescript
export function formatSizingData(sizing: string): string {
  // Sizing data formatting
}

export function formatKeyFeatures(features: string): string[] {
  // Key features parsing
}

export function formatColorVariants(variants: ColorVariant[]): VariantData[] {
  // Variant formatting for API
}
```

---

### Phase 4: Create Type Definitions

#### 4.1 Create `types/create-pd.ts`
```typescript
export interface UploadedFile {
  file: File
  preview: string
}

export interface ColorVariant {
  colorName: string
  standardizedColor: string
  confidence: number
  imageIndices: number[]
  primaryImageIndex: number
  originalDetections: string[]
  userOverride?: string
}

export interface ProductFormData {
  productType: string
  availableSizing: string
  fabricMaterial: string
  occasionUse: string
  targetAudience: string
  keyFeatures: string
  additionalNotes: string
}

export interface GeneratedContent {
  title: string
  description: string
  tags: string[]
  variants: ProductVariant[]
  // ... other fields
}

export interface PrePopulatedProductData {
  productId: string
  title: string
  productType: string
  // ... other fields
}
```

---

## Final File Structure

```
src/app/create-pd/
├── page.tsx                         (~300 LOC - orchestration only)
├── components/
│   ├── ImageUploadSection.tsx      (~150 LOC)
│   ├── ProductDetailsForm.tsx      (~200 LOC)
│   ├── TemplateSelector.tsx        (~100 LOC)
│   ├── GenerationControls.tsx      (~80 LOC)
│   ├── ContentPreviewModal.tsx     (~150 LOC)
│   ├── SuccessDialog.tsx           (~50 LOC)
│   └── ErrorAlert.tsx              (~30 LOC)
├── hooks/
│   ├── useProductForm.ts           (~150 LOC)
│   ├── useImageUpload.ts           (~180 LOC)
│   ├── useProductGeneration.ts     (~100 LOC)
│   └── usePrePopulation.ts         (~80 LOC)
└── types/
    └── index.ts                     (~100 LOC)

src/lib/create-pd/
├── color-detection.ts               (~100 LOC)
├── product-generator.ts             (~150 LOC)
├── data-formatter.ts                (~80 LOC)
└── shopify-integration.ts           (~120 LOC)
```

**Total:** ~1,920 LOC (distributed across 18 files)
**Largest file:** ~300 LOC (80% reduction)

---

## Refactored page.tsx Structure

```typescript
'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useProductForm } from './hooks/useProductForm'
import { useImageUpload } from './hooks/useImageUpload'
import { useProductGeneration } from './hooks/useProductGeneration'
import { usePrePopulation } from './hooks/usePrePopulation'
import { ImageUploadSection } from './components/ImageUploadSection'
import { ProductDetailsForm } from './components/ProductDetailsForm'
import { TemplateSelector } from './components/TemplateSelector'
import { GenerationControls } from './components/GenerationControls'
import { ContentPreviewModal } from './components/ContentPreviewModal'

export const dynamic = 'force-dynamic'

function CreateProductContent() {
  const searchParams = useSearchParams()
  const shop = searchParams?.get('shop')

  // Custom hooks (state management)
  const form = useProductForm()
  const images = useImageUpload()
  const generation = useProductGeneration()
  const prePopulation = usePrePopulation(shop, searchParams)

  // Orchestrate generation flow
  const handleGenerate = async () => {
    const content = await generation.generateContent({
      ...form.formData,
      images: images.uploadedFiles,
      shop
    })
    setShowModal(true)
  }

  const handleCreateProduct = async () => {
    await generation.createProduct(generation.generatedContent)
  }

  return (
    <div className="container mx-auto p-6">
      <h1>Create Product Description</h1>

      <ImageUploadSection
        {...images}
        onDetectColors={images.detectColors}
      />

      <ProductDetailsForm
        {...form.formData}
        {...form.setters}
      />

      <TemplateSelector
        selectedTemplate={form.formData.selectedTemplate}
        onTemplateChange={form.setters.setSelectedTemplate}
      />

      <GenerationControls
        generating={generation.generating}
        progress={generation.progress}
        onGenerate={handleGenerate}
        disabled={!form.validateForm()}
      />

      <ContentPreviewModal
        open={showModal}
        content={generation.generatedContent}
        creating={generation.creating}
        onClose={() => setShowModal(false)}
        onCreate={handleCreateProduct}
      />
    </div>
  )
}

export default function CreateProductPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CreateProductContent />
    </Suspense>
  )
}
```

---

## Implementation Steps

### Week 1: Hooks & Types
- [ ] Day 1: Create type definitions (`types/index.ts`)
- [ ] Day 2: Extract `useProductForm` hook
- [ ] Day 3: Extract `useImageUpload` hook
- [ ] Day 4: Extract `useProductGeneration` hook
- [ ] Day 5: Extract `usePrePopulation` hook

### Week 2: Components
- [ ] Day 1: Create `ImageUploadSection` component
- [ ] Day 2: Create `ProductDetailsForm` component
- [ ] Day 3: Create `TemplateSelector` + `GenerationControls`
- [ ] Day 4: Create `ContentPreviewModal` component
- [ ] Day 5: Create `SuccessDialog` + `ErrorAlert`

### Week 3: Services & Integration
- [ ] Day 1: Extract color detection logic
- [ ] Day 2: Extract product generator logic
- [ ] Day 3: Extract data formatters
- [ ] Day 4: Refactor main page.tsx to use extracted code
- [ ] Day 5: Testing & bug fixes

### Week 4: Polish & Optimization
- [ ] Day 1-2: Add JSDoc documentation
- [ ] Day 3: Performance optimization
- [ ] Day 4: Accessibility improvements
- [ ] Day 5: Final QA and deployment

---

## Benefits

1. **Maintainability:** Each file has single responsibility
2. **Testability:** Hooks and services can be unit tested
3. **Reusability:** Components can be used in other pages
4. **Readability:** Main page is now ~300 LOC and easy to understand
5. **Performance:** Components can be lazy-loaded
6. **Team Collaboration:** Multiple developers can work on different files

---

## Testing Strategy

### Unit Tests
```typescript
// hooks/__tests__/useProductForm.test.ts
describe('useProductForm', () => {
  it('should validate form data', () => {
    const { result } = renderHook(() => useProductForm())
    expect(result.current.validateForm()).toBe(false)
  })
})

// lib/__tests__/color-detection.test.ts
describe('detectImageColors', () => {
  it('should detect colors from images', async () => {
    const colors = await detectImageColors(mockImages)
    expect(colors).toHaveLength(3)
  })
})
```

### Integration Tests
```typescript
// __tests__/create-pd-flow.test.tsx
describe('Create Product Flow', () => {
  it('should complete full generation flow', async () => {
    render(<CreateProductPage />)
    // Upload images
    // Fill form
    // Generate content
    // Create product
    expect(screen.getByText('Product created!')).toBeInTheDocument()
  })
})
```

---

## Risk Mitigation

1. **Create feature branch:** `feature/refactor-create-pd`
2. **Implement incrementally:** Don't break existing functionality
3. **Add tests first:** Ensure current behavior is captured
4. **Parallel development:** Keep old file until refactor complete
5. **Gradual rollout:** Use feature flag for new version

---

## Success Criteria

- [x] Main page.tsx < 300 LOC
- [x] No file > 300 LOC
- [ ] 80%+ test coverage
- [ ] No functionality regression
- [ ] Performance maintained or improved
- [ ] All ESLint rules pass
- [ ] TypeScript strict mode enabled

---

## Notes

- This refactoring should be done **after** P0 TODO items are resolved
- Estimated total effort: **3-4 weeks** (full-time)
- Can be done in parallel with other refactoring work
- Similar pattern can be applied to other large components:
  - `aie/page.tsx` (1,659 LOC)
  - `settings/prompts/page.tsx` (1,592 LOC)
