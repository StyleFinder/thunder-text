import { extension } from "@shopify/ui-extensions/admin";
import { useEffect, useState } from 'react';

// The target used here must match the target used in the extension's toml file (./shopify.extension.toml)
const TARGET = 'admin.product-details.action.render';

// Thunder Text product description generator - FORCE REBUILD v7.0 - CACHE BREAK
const CACHE_BUSTER = Date.now(); // Current timestamp for cache busting  
const COMMIT_HASH = '7163232'; // Latest commit: ULTIMATE DEBUG - Comprehensive popup debugging and protection
const FORCE_REBUILD = 'CACHE_BREAK_v7_' + Math.random().toString(36).substring(7);

// Hydration protection logic
let isHydrated = false;
if (typeof window !== 'undefined') {
  isHydrated = true;
}
export default extension(TARGET, (root, { i18n, close, data }) => {
  console.log(`🔥🔥🔥 DIRECT OVERLAY MODE - NO UI - ActionExtension.js LOADED 🔥🔥🔥`);
  console.log(`🚀🚀🚀 THUNDER TEXT OVERLAY v7.0 - COMMIT: ${COMMIT_HASH} - CACHE BUSTER: ${CACHE_BUSTER} 🚀🚀🚀`);
  console.log(`💥💥💥 FORCE REBUILD: ${FORCE_REBUILD} 💥💥💥`);
  console.log('Extension loaded with data:', data);
  console.log('🏷️ Version tracking - Commit:', COMMIT_HASH, 'Deployed:', new Date().toISOString());
  
  // Force cache invalidation by setting no-cache headers when possible
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const meta = document.createElement('meta');
    meta.httpEquiv = 'Cache-Control';
    meta.content = 'no-cache, no-store, must-revalidate';
    document.head?.appendChild(meta);
  }
  
  // Immediately open Thunder Text overlay - no UI needed, with hydration protection
  if (isHydrated) {
    handleOpenThunderText();
  } else {
    console.log('🛑 Not hydrated yet — skipping overlay trigger.');
  }

  function handleOpenThunderText() {
    console.log('🎯 Button clicked! Starting Thunder Text overlay workflow...');
    
    try {
      // Get shop domain and access token from current admin context
      let shopDomain = '';
      if (typeof window !== 'undefined') {
        shopDomain = window.location.hostname.replace('.myshopify.com', '');
      }
      
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
          let accessToken = null;
          if (typeof window !== 'undefined') {
            accessToken = window.shopifyApp?.accessToken || window.sessionToken;
          }
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
        if (typeof window === 'undefined') {
          console.error('window is undefined — cannot open popup');
          return;
        }
        // Method 1: Standard window.open
        const newWindow = window.open(fullUrl, '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes');
        
        console.log('🔍 DEBUG: window.open returned:', newWindow);
        console.log('🔍 DEBUG: newWindow type:', typeof newWindow);
        console.log('🔍 DEBUG: newWindow === null:', newWindow === null);
        
        if (newWindow && newWindow !== null && !newWindow.closed) {
          console.log('✅ Successfully opened overlay window via window.open');
          console.log('🔍 DEBUG: Popup opened successfully, closing extension in 500ms');
          setTimeout(() => {
            console.log('🔄 Closing admin extension');
            close();
          }, 500);
        } else {
          console.log('⚠️ Method 1 failed - popup blocked or failed, trying alternatives');
          console.log('🔍 DEBUG: newWindow details:', {
            exists: !!newWindow,
            isNull: newWindow === null,
            isClosed: newWindow ? newWindow.closed : 'N/A'
          });
          
          // Method 2: Try top window
          if (typeof window !== 'undefined' && window.top && window.top !== window) {
            console.log('🔄 Trying window.top.open');
            try {
              const topWindow = window.top.open(fullUrl, '_blank');
              console.log('🔍 DEBUG: window.top.open returned:', topWindow);
              if (topWindow && !topWindow.closed) {
                console.log('✅ Opened via window.top');
                close();
                return;
              } else {
                console.log('⚠️ window.top.open failed');
              }
            } catch (topError) {
              console.log('❌ Error with window.top.open:', topError);
            }
          }
          
          // Method 3: Try parent window
          if (typeof window !== 'undefined' && window.parent && window.parent !== window) {
            console.log('🔄 Trying window.parent.open');
            try {
              const parentWindow = window.parent.open(fullUrl, '_blank');
              console.log('🔍 DEBUG: window.parent.open returned:', parentWindow);
              if (parentWindow && !parentWindow.closed) {
                console.log('✅ Opened via window.parent');
                close();
                return;
              } else {
                console.log('⚠️ window.parent.open failed');
              }
            } catch (parentError) {
              console.log('❌ Error with window.parent.open:', parentError);
            }
          }
          
          // Method 4: Show user instructions instead of navigation
          console.log('🚨 ALL POPUP METHODS FAILED - POPUP BLOCKER DETECTED');
          console.log('📋 INSTRUCTION: Please disable popup blocker and try again');
          console.log('🔗 MANUAL URL:', fullUrl);
          
          // Don't navigate current window - just show error
          alert('Popup blocked! Please:\n1. Allow popups for this site\n2. Try clicking the button again\n\nOr manually open:\n' + fullUrl);
          close();
        }
      } catch (openError) {
        console.error('❌ Error in window.open calls:', openError);
        console.log('🚫 NOT navigating - popup blocker protection active');
        console.log('🔗 Manual URL for user:', fullUrl);
        alert('Extension error! Please manually open:\n' + fullUrl);
        close();
      }
      
    } catch (error) {
      console.error('❌ Error opening Thunder Text overlay:', error);
    }
  }

});