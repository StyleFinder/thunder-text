# How to View Product and Variant Metafields

## 1. In Your App (Product Description Generator)

The metafield display cards are shown in YOUR APP's product detail pages, not in Shopify admin.

### To view metafields in your app:

1. **Open your app** in Shopify admin
2. Navigate to **Dashboard** or **History**  
3. Click on any product that was created with the app
4. You'll see:
   - **Google Shopping Fields** card - showing product metafields
   - **Variant Metafields** card - showing all variant metafields in a table

### Direct URL format:
```
https://thunder-text.onrender.com/product/{product-id}?shop=coach-ellie-test-store.myshopify.com&embedded=1
```

Example for your product:
```
https://thunder-text.onrender.com/product/09f87608-725c-4f7d-bf5f-f6544ba25572?shop=coach-ellie-test-store.myshopify.com&embedded=1
```

## 2. In Shopify Admin

Metafields in Shopify admin need to be configured to be visible:

### For Product Metafields:
1. Go to the product in Shopify admin
2. Scroll to the **Metafields** section
3. Click **"View all"**
4. Find metafields with namespace `google`
5. Click the pin icon to make them visible on the product page

### For Variant Metafields:
1. Click on a specific variant (e.g., "Lime Green / S")
2. Scroll down to see variant-specific metafields
3. Look for metafields with namespace `google`

## 3. Using the Verification Script

Run the verification script to see all metafields via API:

```bash
# Set your Shopify access token
export SHOPIFY_ACCESS_TOKEN="your-access-token-here"

# Run the script with your product ID
node scripts/verify-metafields.js 9895622279444
```

This will show:
- All product metafields with namespace "google"
- All variant metafields for each variant
- Instructions on how to view them in Shopify admin

## 4. Using Shopify GraphQL Admin

You can also query metafields using GraphQL:

```graphql
{
  product(id: "gid://shopify/Product/9895622279444") {
    title
    metafields(namespace: "google", first: 20) {
      edges {
        node {
          key
          value
          type
        }
      }
    }
    variants(first: 10) {
      edges {
        node {
          title
          metafields(namespace: "google", first: 10) {
            edges {
              node {
                key
                value
                type
              }
            }
          }
        }
      }
    }
  }
}
```

## Common Issues

### "No product metafields pinned"
This is normal! Metafields exist but aren't pinned for display. Click "View all" to see and pin them.

### Can't see variant metafields
Variant metafields are only visible when viewing individual variants, not on the main product page.

### Metafields not showing in app
Make sure you're looking at the app's product detail page, not the Shopify admin product page.