import { 
  extension,
  AdminAction,
  BlockStack,
  Button,
  Text,
  Banner
} from "@shopify/ui-extensions/admin";

// The target used here must match the target used in the extension's toml file (./shopify.extension.toml)
const TARGET = 'admin.product-details.action.render';

// Thunder Text product description generator - Simple Robust Version
const CACHE_BUSTER = Date.now(); // Current timestamp for cache busting
export default extension(TARGET, (root, { i18n, close, data }) => {
  console.log(`🚀🚀🚀 THUNDER TEXT SIMPLE v4.0 - FRESH DEPLOY - CACHE BUSTER: ${CACHE_BUSTER} 🚀🚀🚀`);
  console.log('Extension loaded with data:', data);
  
  // Force cache invalidation by setting no-cache headers when possible
  if (typeof document !== 'undefined') {
    const meta = document.createElement('meta');
    meta.httpEquiv = 'Cache-Control';
    meta.content = 'no-cache, no-store, must-revalidate';
    document.head?.appendChild(meta);
  }
  
  // Build UI immediately - no async operations
  buildUI();

  function buildUI() {
    console.log('🎨 Building simple UI');
    
    const content = root.createComponent(BlockStack, { gap: 'base' });

    // Title with cache buster info
    content.append(
      root.createComponent(Text, {
        variant: 'headingMd'
      }, `⚡ Thunder Text Generator v4.0 🆕 FRESH [${CACHE_BUSTER.toString().slice(-6)}]`)
    );

    // Description
    content.append(
      root.createComponent(Text, {
        variant: 'bodyMd'
      }, 'Generate AI-powered product descriptions using this product\'s information.')
    );

    // Show what we know about the current context
    let productInfo = 'Ready to generate descriptions';
    try {
      if (data && data.selected && data.selected.length > 0) {
        const product = data.selected[0];
        productInfo = `Product detected: ${product.title || product.id || 'Unknown product'}`;
      }
    } catch (error) {
      console.log('Error accessing product data:', error);
      productInfo = 'Product context available';
    }

    content.append(
      root.createComponent(Banner, { tone: 'info' },
        root.createText(productInfo)
      )
    );

    // Main action button
    content.append(
      root.createComponent(Button, {
        variant: 'primary',
        onPress: () => {
          console.log('🚀 Opening Thunder Text...');
          openThunderText();
        }
      }, '🚀 Open Thunder Text App')
    );

    // Cancel button
    content.append(
      root.createComponent(Button, {
        onPress: close
      }, 'Cancel')
    );

    root.append(
      root.createComponent(AdminAction, {
        title: 'Thunder Text - Product Description Generator'
      }, content)
    );
    
    console.log('✅ Simple UI built successfully');
  }

  function openThunderText() {
    try {
      // Get current URL to extract product ID
      const currentUrl = window.location.href;
      console.log('Current URL:', currentUrl);
      
      // Extract product ID from URL if possible
      const productIdMatch = currentUrl.match(/products\/(\d+)/);
      const productId = productIdMatch ? productIdMatch[1] : '';
      
      // Build basic parameters with cache buster
      const params = new URLSearchParams({
        source: 'admin_extension',
        authenticated: 'true',
        cache_bust: CACHE_BUSTER.toString()
      });
      
      // Add product ID if we found one
      if (productId) {
        params.set('productId', `gid://shopify/Product/${productId}`);
        console.log('🔍 Found product ID:', productId);
      }
      
      // Try to get additional data from the extension data
      try {
        if (data && data.selected && data.selected.length > 0) {
          const product = data.selected[0];
          console.log('📦 Product data available:', Object.keys(product));
          
          if (product.id) params.set('productId', product.id);
          if (product.title) params.set('productTitle', product.title);
          if (product.productType) params.set('productType', product.productType);
          if (product.vendor) params.set('vendor', product.vendor);
        }
      } catch (dataError) {
        console.log('⚠️ Could not extract extension data:', dataError);
      }
      
      // Build the Thunder Text app URL
      const baseUrl = 'https://thunder-text-nine.vercel.app';
      const redirectUrl = `${baseUrl}/create?${params.toString()}`;
      
      console.log('🚀 Opening Thunder Text:', redirectUrl);
      
      // Open Thunder Text app in a new tab
      const newWindow = window.open(redirectUrl, '_blank', 'noopener,noreferrer');
      
      if (newWindow) {
        console.log('✅ Successfully opened Thunder Text');
        // Close the admin action after a short delay
        setTimeout(() => {
          close();
        }, 500);
      } else {
        console.log('⚠️ Could not open new window - popup might be blocked');
        // Try alternative method
        if (window.parent) {
          window.parent.open(redirectUrl, '_blank');
        }
        close();
      }
      
    } catch (error) {
      console.error('❌ Error opening Thunder Text:', error);
      // Still try to close the modal
      close();
    }
  }
});