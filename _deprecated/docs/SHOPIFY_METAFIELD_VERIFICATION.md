# How Store Owners Can Verify Metafields in Shopify Backend

## Method 1: Pin Metafields in Shopify Admin (Easiest)

### For Product Metafields:
1. Go to the product in Shopify admin
2. In the **Metafields** section, click **"View all"**
3. You'll see a list of ALL metafields on the product
4. Look for these Google Shopping metafields:
   - `google.google_product_category`
   - `google.gender`
   - `google.age_group`
   - `google.color`
   - `google.size`
   - `google.material`
   - `google.pattern`
   - `google.condition`
   - `google.size_type`
   - `google.product_highlights`
5. Click the **pin icon** next to each one you want visible
6. Now these will show on the product page

### For Variant Metafields:
1. Click on a specific variant (e.g., "Lime Green / S")
2. Look for the Metafields section on the variant page
3. Click "View all" if available
4. Look for variant-specific metafields like:
   - `google.google_color`
   - `google.google_size`
   - `google.google_material`
   - etc.

## Method 2: Use Shopify's Bulk Editor

1. Go to **Products** in Shopify admin
2. Select the products you want to check
3. Click **"Edit products"** to open bulk editor
4. Click **"Add fields"**
5. Search for "metafield" and add the Google metafields
6. You'll see all values in a spreadsheet-like view

## Method 3: Use Shopify's Search & Discovery App

1. Install Shopify's free **Search & Discovery** app
2. Go to the app and click on **"Filters"**
3. You can see and manage all metafields from there
4. This gives a good overview of all product metafields

## Method 4: Use a Metafield Management App

Several apps make metafield management easier:
- **Metafields Guru** (popular choice)
- **Search & Discovery** (free by Shopify)
- **Metafields Manager**
- **Custom Fields**

These apps provide user-friendly interfaces to:
- View all metafields
- Edit metafield values
- Bulk manage metafields
- Export metafield data

## Method 5: Export Products to CSV

1. Go to **Products** > **Export**
2. Export products as CSV
3. Open in Excel/Google Sheets
4. Metafields will be included as columns
5. Column headers will be like: `Metafield: google.color [single_line_text_field]`

## Method 6: Use Shopify GraphQL Explorer

For technical users:
1. Go to your Shopify admin
2. Navigate to **Apps** > **Develop apps** (if enabled)
3. Use the GraphQL explorer with this query:

```graphql
{
  product(id: "gid://shopify/Product/YOUR_PRODUCT_ID") {
    title
    metafields(first: 50) {
      edges {
        node {
          namespace
          key
          value
          type
        }
      }
    }
    variants(first: 100) {
      edges {
        node {
          title
          metafields(first: 20) {
            edges {
              node {
                namespace
                key
                value
              }
            }
          }
        }
      }
    }
  }
}
```

## What Store Owners Should Look For

When verifying metafields, check that:

1. **Product has these metafields:**
   - `google_product_category` - The Google category
   - `gender` - Target gender
   - `age_group` - Target age group
   - `material` - Product material
   - `condition` - Should be "new"
   - Other relevant Google Shopping fields

2. **Each variant has:**
   - `google_color` - The specific color for that variant
   - `google_size` - The size for that variant
   - Other inherited fields from the product

## Quick Tip for Store Owners

The easiest way is to:
1. Click "View all" in the Metafields section
2. Pin the Google metafields you care about
3. They'll now always be visible on the product page

This way, you can quickly verify metafields are correct without using external tools or apps.