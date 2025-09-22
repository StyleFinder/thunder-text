import { 
  extension,
  AdminAction,
  BlockStack,
  Button,
  Text,
  Link
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
  
  // Build UI with proper Shopify navigation
  buildUI();

  function handleOpenThunderText() {
    console.log('🎯 Starting Thunder Text overlay workflow...');
    
    try {
      // Get shop domain and access token from current admin context
      const shopDomain = window.location.hostname.replace('.myshopify.com', '');
      
      // Build parameters for the new overlay workflow
      const params = new URLSearchParams({
        source: 'admin_extension',
        shop: `${shopDomain}.myshopify.com`,
        cache_bust: CACHE_BUSTER.toString()
      });
      
      // Extract product data from extension context
      try {
        if (data && data.selected && data.selected.length > 0) {
          const product = data.selected[0];
          console.log('📦 Product data available:', Object.keys(product));
          
          // Pass product ID and basic data to the overlay
          if (product.id) params.set('productId', product.id);
          if (product.title) params.set('productTitle', product.title);
          if (product.productType) params.set('productType', product.productType);
          if (product.vendor) params.set('vendor', product.vendor);
          
          // Try to get access token from session (if available)
          const accessToken = window.shopifyApp?.accessToken || window.sessionToken;
          if (accessToken) params.set('accessToken', accessToken);
        } else {
          console.log('⚠️ No product selected or data unavailable');
          return;
        }
      } catch (dataError) {
        console.log('⚠️ Could not extract product data:', dataError);
        return;
      }
      
      // Use the new overlay workflow URL
      const targetUrl = `/product-overlay?${params.toString()}`;
      const fullUrl = `https://thunder-text-nine.vercel.app${targetUrl}`;
      
      console.log('🚀 Opening Thunder Text overlay:', fullUrl);
      
      // Open in new tab/window for overlay experience
      const newWindow = window.open(fullUrl, '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes');
      
      if (newWindow) {
        console.log('✅ Successfully opened overlay window');
        // Close the admin action after a short delay
        setTimeout(() => {
          close();
        }, 500);
      } else {
        console.log('⚠️ Popup blocked, trying alternative method');
        
        // Fallback: Try parent window navigation
        if (window.parent) {
          window.parent.open(fullUrl, '_blank');
          close();
        } else {
          console.error('❌ Failed to open Thunder Text overlay - popup blocked');
        }
      }
      
    } catch (error) {
      console.error('❌ Error opening Thunder Text overlay:', error);
    }
  }

  function buildUI() {
    console.log('🎨 Building UI with official navigation');
    
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
      }, 'Generate AI-powered product descriptions with customizable settings and instant preview.')
    );

    // Main action button - using Button with custom navigation
    content.append(
      root.createComponent(Button, {
        variant: 'primary',
        onPress: () => {
          console.log('🚀 Thunder Text overlay button clicked!');
          handleOpenThunderText();
        }
      }, '✨ Generate Product Description')
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
    
    console.log('✅ UI built successfully with official navigation');
  }
});