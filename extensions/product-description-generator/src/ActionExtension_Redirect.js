import { 
  extension, 
  AdminAction, 
  BlockStack, 
  Button, 
  Text, 
  TextArea,
  Banner,
  InlineStack,
  Box
} from "@shopify/ui-extensions/admin";

// The target used here must match the target used in the extension's toml file (./shopify.extension.toml)
const TARGET = 'admin.product-details.action.render';

// Thunder Text product description generator - Redirect Mode
export default extension(TARGET, (root, { i18n, close, data }) => {
  let productData = null;
  let isLoading = true;
  let errorMessage = '';

  console.log('🚀🚀🚀 THUNDER TEXT v6.4 - REDIRECT MODE 🚀🚀🚀');

  // Load product data for redirect
  loadProductData().then(() => {
    isLoading = false;
    buildUI();
  }).catch((error) => {
    console.error('Failed to load product data:', error);
    errorMessage = 'Failed to load product data';
    isLoading = false;
    buildUI();
  });

  async function loadProductData() {
    try {
      const productId = data.selected[0].id;
      const query = {
        query: `
          query GetProduct($id: ID!) {
            product(id: $id) {
              id
              title
              descriptionHtml
              images(first: 10) {
                edges {
                  node {
                    id
                    url
                    altText
                    width
                    height
                  }
                }
              }
              variants(first: 5) {
                edges {
                  node {
                    id
                    title
                    price
                    weight
                    weightUnit
                  }
                }
              }
              tags
              productType
              vendor
            }
          }
        `,
        variables: { id: productId }
      };

      const response = await fetch('shopify:admin/api/graphql.json', {
        method: 'POST',
        body: JSON.stringify(query)
      });

      if (!response.ok) {
        throw new Error('Failed to fetch product data');
      }

      const result = await response.json();
      productData = {
        id: result.data.product.id,
        title: result.data.product.title,
        description: result.data.product.descriptionHtml,
        images: result.data.product.images.edges.map(edge => edge.node),
        variants: result.data.product.variants.edges.map(edge => edge.node),
        tags: result.data.product.tags,
        productType: result.data.product.productType,
        vendor: result.data.product.vendor
      };
    } catch (error) {
      console.error('Failed to load product data:', error);
      throw error;
    }
  }

  function redirectToThunderText() {
    if (!productData) {
      console.error('No product data available for redirect');
      return;
    }

    // Prepare product data for URL transfer
    const productParams = new URLSearchParams({
      // Product identification
      productId: productData.id,
      productTitle: productData.title,
      productType: productData.productType || '',
      vendor: productData.vendor || '',
      
      // Product images (pass first few image URLs)
      images: JSON.stringify(productData.images.slice(0, 5).map(img => ({
        url: img.url,
        alt: img.altText || '',
        width: img.width,
        height: img.height
      }))),
      
      // Product details
      description: productData.description || '',
      tags: JSON.stringify(productData.tags || []),
      
      // Variant info (if available)
      variants: JSON.stringify(productData.variants.slice(0, 3).map(variant => ({
        id: variant.id,
        title: variant.title,
        price: variant.price,
        weight: variant.weight,
        weightUnit: variant.weightUnit
      })) || []),
      
      // Redirect source
      source: 'admin_extension'
    });

    // Build the Thunder Text app URL
    const baseUrl = 'http://localhost:3050'; // Your Thunder Text app URL
    const redirectUrl = `${baseUrl}/create?${productParams.toString()}`;
    
    console.log('🚀 Redirecting to Thunder Text with product data:', redirectUrl);
    
    // Open Thunder Text app in a new tab
    window.open(redirectUrl, '_blank');
    
    // Close the admin action modal
    close();
  }

  function buildUI() {
    console.log('🔥 Thunder Text Extension: Building Redirect UI 🔥');
    
    // Clear any existing content
    while (root.firstChild) {
      root.removeChild(root.firstChild);
    }
    
    const content = root.createComponent(BlockStack, { gap: 'base' });

    // Error handling
    if (errorMessage) {
      content.append(
        root.createComponent(Banner, { tone: 'critical' },
          root.createText(errorMessage)
        )
      );
      
      content.append(
        root.createComponent(Button, {
          onPress: close
        }, 'Close')
      );
      
      root.append(
        root.createComponent(AdminAction, {
          title: '🚀 THUNDER TEXT - OPEN FULL APP'
        }, content)
      );
      return;
    }

    // Loading state
    if (isLoading) {
      content.append(root.createComponent(Text, {
        variant: 'headingMd'
      }, '⏳ Loading product data...'));
      
      root.append(
        root.createComponent(AdminAction, {
          title: '🚀 THUNDER TEXT - OPEN FULL APP'
        }, content)
      );
      return;
    }

    // Main redirect interface
    if (productData) {
      // Product preview
      content.append(
        root.createComponent(Banner, { tone: 'info' },
          root.createText(`Generate description for: ${productData.title}`)
        )
      );
      
      // Description of what will happen
      content.append(root.createComponent(Text, {
        variant: 'bodyMd',
        tone: 'subdued'
      }, 'This will open Thunder Text with your product information automatically filled in. You can then generate and customize your product description with our full editor.'));
      
      // Product data that will be transferred
      const dataPreview = [
        `✓ Product: ${productData.title}`,
        `✓ Type: ${productData.productType || 'Not specified'}`,
        `✓ Vendor: ${productData.vendor || 'Not specified'}`,
        `✓ Images: ${productData.images.length} available`,
        `✓ Tags: ${productData.tags.length} tags`,
        `✓ Variants: ${productData.variants.length} variants`
      ].join('\n');
      
      content.append(root.createComponent(TextArea, {
        label: 'Product data that will be transferred:',
        value: dataPreview,
        rows: 7,
        readonly: true
      }));
    }

    // Action buttons
    const actions = root.createComponent(InlineStack, { gap: 'base' });
    
    if (productData) {
      actions.append(
        root.createComponent(Button, {
          variant: 'primary',
          onPress: redirectToThunderText
        }, '🚀 Open Thunder Text Generator')
      );
    }
    
    actions.append(
      root.createComponent(Button, {
        onPress: close
      }, 'Cancel')
    );
    
    content.append(actions);

    root.append(
      root.createComponent(AdminAction, {
        title: '🚀 THUNDER TEXT - OPEN FULL APP'
      }, content)
    );
    
    console.log('Thunder Text Extension: Redirect UI completed');
  }
});