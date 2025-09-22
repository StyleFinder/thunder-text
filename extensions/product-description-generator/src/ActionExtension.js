import { extension } from "@shopify/ui-extensions/admin";

// The target used here must match the target used in the extension's toml file (./shopify.extension.toml)
const TARGET = 'admin.product-details.action.render';

// Thunder Text product description generator - FORCE REBUILD v7.0 - CACHE BREAK
const CACHE_BUSTER = Date.now(); // Current timestamp for cache busting  
const COMMIT_HASH = '3478388'; // Latest commit: BYPASS REACT - Use simple HTML overlay
const FORCE_REBUILD = 'CACHE_BREAK_v7_' + Math.random().toString(36).substring(7);
export default extension(TARGET, (root, { i18n, close, data }) => {
  console.log(`🔥🔥🔥 DIRECT OVERLAY MODE - NO UI - ActionExtension.js LOADED 🔥🔥🔥`);
  console.log(`🚀🚀🚀 THUNDER TEXT OVERLAY v7.0 - COMMIT: ${COMMIT_HASH} - CACHE BUSTER: ${CACHE_BUSTER} 🚀🚀🚀`);
  console.log(`💥💥💥 FORCE REBUILD: ${FORCE_REBUILD} 💥💥💥`);
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
      
      // TEMPORARY: Use simple HTML file to bypass React loading issues
      const targetUrl = `/overlay-test.html?${params.toString()}`;
      const fullUrl = `https://thunder-text-nine.vercel.app${targetUrl}`;
      
      console.log('🚀 Opening Thunder Text overlay:', fullUrl);
      console.log('🔍 DEBUG: About to call window.open with URL:', fullUrl);
      
      // Try multiple methods to open the overlay
      try {
        // Method 1: Standard window.open
        const newWindow = window.open(fullUrl, '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes');
        
        if (newWindow && newWindow !== null && !newWindow.closed) {
          console.log('✅ Successfully opened overlay window via window.open');
          setTimeout(() => {
            console.log('🔄 Closing admin extension');
            close();
          }, 500);
        } else {
          console.log('⚠️ Method 1 failed - popup blocked or failed, trying alternatives');
          
          // Method 2: Try top window
          if (window.top && window.top !== window) {
            console.log('🔄 Trying window.top.open');
            const topWindow = window.top.open(fullUrl, '_blank');
            if (topWindow) {
              console.log('✅ Opened via window.top');
              close();
              return;
            }
          }
          
          // Method 3: Try parent window
          if (window.parent && window.parent !== window) {
            console.log('🔄 Trying window.parent.open');
            const parentWindow = window.parent.open(fullUrl, '_blank');
            if (parentWindow) {
              console.log('✅ Opened via window.parent');
              close();
              return;
            }
          }
          
          // Method 4: Last resort - navigate current window
          console.log('🔄 Last resort: navigating current window');
          window.location.href = fullUrl;
        }
      } catch (openError) {
        console.error('❌ Error in window.open calls:', openError);
        console.log('🔄 Final fallback: direct navigation');
        window.location.href = fullUrl;
      }
      
    } catch (error) {
      console.error('❌ Error opening Thunder Text overlay:', error);
    }
  }

});