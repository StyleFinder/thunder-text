# Category Management System Setup Guide

## Overview

The custom product categories system allows store owners to:
1. Create and manage their own product categories
2. Import existing product types from their Shopify store  
3. Use these categories in the product description generation dropdown

## Database Setup Required

**IMPORTANT**: You need to run the database migration before using this feature.

### Step 1: Apply Database Migration

1. **Open Supabase SQL Editor**: 
   - Go to: https://app.supabase.com/project/***REMOVED***/sql/new

2. **Run Migration**:
   - Copy the contents of `custom_categories_migration.sql`
   - Paste into the SQL editor
   - Click "Run" button

3. **Verify Success**:
   - Go to: https://app.supabase.com/project/***REMOVED***/editor
   - You should see a new `custom_categories` table

### Step 2: Test the Feature

1. Start the development server: `npm run dev`
2. Navigate to Settings page
3. You should see the new "Product Categories" section

## Features Implemented

### Settings Page Enhancements

**New Category Management Section**:
- **Add Category**: Create custom product categories with names and descriptions
- **Import from Shopify**: Fetch existing product types from Shopify store and import as categories
- **Edit Categories**: Modify existing category names and descriptions  
- **Delete Categories**: Remove categories (with confirmation)
- **Category List**: View all custom categories in a clean table format

**UI Components**:
- Modal dialogs for create/edit operations
- Import modal with checkbox selection of Shopify product types
- Toast notifications for success/error feedback
- Loading states and error handling
- Responsive design matching Shopify admin patterns

### Create Page Integration

**Dynamic Category Dropdown**:
- Automatically loads custom categories from database
- Falls back to default categories if none exist
- Real-time updates when categories are modified in settings

### API Endpoints Created

**Custom Categories CRUD** (`/api/categories`):
- `GET`: Fetch store's custom categories
- `POST`: Create new category
- `PUT`: Update existing category  
- `DELETE`: Remove category

**Shopify Product Types** (`/api/shopify/product-types`):
- `GET`: Fetch unique product types from existing Shopify products
- Analyzes up to 250 products to extract all unique types
- Returns sorted list of product types for import

## Database Schema

### custom_categories Table

```sql
CREATE TABLE custom_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(store_id, name)
);
```

**Features**:
- Row Level Security (RLS) enabled
- Multi-tenant isolation by store_id
- Automatic timestamps with update trigger
- Unique constraint prevents duplicate category names per store

## Usage Workflow

### For Store Owners

1. **Access Settings**: Navigate to Settings → Product Categories section

2. **Import Existing Types** (Recommended first step):
   - Click "Import from Shopify" 
   - Select product types from existing products
   - Click "Import X Categories"

3. **Create Custom Categories**:
   - Click "Add Category"
   - Enter name and optional description
   - Click "Create Category"

4. **Manage Categories**:
   - Edit: Click pencil icon to modify
   - Delete: Click trash icon to remove

5. **Use in Product Creation**:
   - Go to Create Product page
   - Category dropdown now shows custom categories
   - Select category for AI generation context

### For Developers

**Extending the System**:
- Categories are fetched via `/api/categories` endpoint
- Frontend components are in `src/app/settings/page.tsx`
- Category dropdown integration in `src/app/create/page.tsx`

**Adding Features**:
- Default category setting (partially implemented)
- Category templates with different AI prompts
- Category-specific generation parameters
- Export/import categories between stores

## Security Features

- **Row Level Security**: Users can only access their own store's categories
- **Input Validation**: Category names required, duplicates prevented
- **Error Handling**: Graceful fallbacks and user-friendly error messages
- **Authentication**: All API endpoints require valid session

## Performance Considerations

- **Caching**: Custom categories loaded once per page visit
- **Pagination**: Shopify product types fetched in batches (250 limit)
- **Indexing**: Database indexes on store_id and name for fast queries
- **Fallbacks**: Default categories used if API fails

## Future Enhancements

1. **Category Templates**: Pre-defined categories for different industries
2. **Smart Suggestions**: AI-powered category recommendations based on images
3. **Bulk Operations**: Import/export categories, bulk edit
4. **Category Analytics**: Usage stats, most popular categories
5. **Advanced Filtering**: Search, sort, filter categories in settings

## Troubleshooting

### Common Issues

**Migration fails**:
- Check database permissions
- Ensure `stores` table exists
- Verify Supabase connection

**Categories not loading**:
- Check browser console for API errors
- Verify authentication parameters
- Test `/api/categories` endpoint directly

**Import from Shopify fails**:
- Verify Shopify integration is working
- Check if store has products with product types
- Test `/api/shopify/product-types` endpoint

**Dropdown shows default categories**:
- Check if custom categories exist in database
- Verify API response includes categories
- Check React state in browser dev tools

### Debug Steps

1. **Check Database**: Verify `custom_categories` table exists and has data
2. **Test APIs**: Use browser dev tools to check API responses
3. **Check Console**: Look for JavaScript errors or failed requests
4. **Verify Auth**: Ensure shop and authenticated parameters are present

## Technical Details

### Component Architecture

```
SettingsPage
├── CategoryManagement (new section)
│   ├── CategoryList (table display)
│   ├── CreateModal (add/edit form)
│   ├── ImportModal (Shopify types selection)
│   └── ToastNotification (feedback)
└── ExistingSettings (preserved)

CreatePage  
├── CategoryDropdown (enhanced)
└── ExistingForm (preserved)
```

### Data Flow

```
1. User visits Settings → fetchCustomCategories()
2. User clicks "Import from Shopify" → fetchShopifyTypes()
3. User selects types → handleImportShopifyTypes()
4. Categories saved → fetchCustomCategories() (refresh)
5. User visits Create → fetchCustomCategories()  
6. Dropdown populated with custom categories
```

This system provides a complete category management solution that integrates seamlessly with the existing Thunder Text workflow while maintaining Shopify design patterns and user experience standards.