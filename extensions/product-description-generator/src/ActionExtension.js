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
    console.log('🎯 Starting Thunder Text navigation...');
    
    try {
      // Build basic parameters with cache buster
      const params = new URLSearchParams({
        source: 'admin_extension',
        authenticated: 'true',
        cache_bust: CACHE_BUSTER.toString()
      });
      
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
      
      let targetUrl = `/create?${params.toString()}`;
      
      // Try different navigation methods
      const fullUrl = `https://thunder-text-nine.vercel.app${targetUrl}`;
      
      console.log('🚀 Opening Thunder Text:', fullUrl);
      
      // Method 1: Try window.open (most reliable)
      const newWindow = window.open(fullUrl, '_blank', 'noopener,noreferrer');
      
      if (newWindow) {
        console.log('✅ Successfully opened new window');
        // Close the admin action after a short delay
        setTimeout(() => {
          close();
        }, 500);
      } else {
        console.log('⚠️ Popup blocked, trying alternative method');
        
        // Method 2: Try parent window location
        if (window.parent) {
          window.parent.open(fullUrl, '_blank');
          close();
        } else {
          console.error('❌ Failed to open Thunder Text - popup blocked');
        }
      }
      
    } catch (error) {
      console.error('❌ Error opening Thunder Text:', error);
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
      }, 'Generate AI-powered product descriptions using this product\'s information.')
    );

    // Main action button - using Button with custom navigation
    content.append(
      root.createComponent(Button, {
        variant: 'primary',
        onPress: () => {
          console.log('🚀 Thunder Text button clicked!');
          handleOpenThunderText();
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
    
    console.log('✅ UI built successfully with official navigation');
  }
});