import { extension } from "@shopify/ui-extensions/admin";

// The target used here must match the target used in the extension's toml file (./shopify.extension.toml)
const TARGET = 'admin.product-details.action.render';

// Thunder Text product description generator - Overlay Workflow Version
const CACHE_BUSTER = Date.now(); // Current timestamp for cache busting
const COMMIT_HASH = '6f58097'; // Latest commit hash for version tracking
export default extension(TARGET, (root, { i18n, close, data }) => {
  console.log(`🚀🚀🚀 THUNDER TEXT OVERLAY v5.0 - COMMIT: ${COMMIT_HASH} - CACHE BUSTER: ${CACHE_BUSTER} 🚀🚀🚀`);
  console.log('Extension loaded with data:', data);
  console.log('🏷️ Version tracking - Commit:', COMMIT_HASH, 'Deployed:', new Date().toISOString());
  
  // Force cache invalidation by setting no-cache headers when possible
  if (typeof document !== 'undefined') {
    const meta = document.createElement('meta');
    meta.httpEquiv = 'Cache-Control';
    meta.content = 'no-cache, no-store, must-revalidate';
    document.head?.appendChild(meta);
  }
  
  // Immediately open Thunder Text overlay - no UI needed
  handleOpenThunderText();

  function handleOpenThunderText() {
    console.log('🎯 Button clicked! Starting Thunder Text overlay workflow...');
    
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
          console.log('⚠️ No product selected or data unavailable - continuing with basic workflow');
          // Don't return - continue with basic workflow
        }
      } catch (dataError) {
        console.log('⚠️ Could not extract product data:', dataError, '- continuing with basic workflow');
        // Don't return - continue with basic workflow
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

});