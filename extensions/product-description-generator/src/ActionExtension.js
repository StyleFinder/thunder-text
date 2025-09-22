import { extension } from "@shopify/ui-extensions/admin";

// The target used here must match the target used in the extension's toml file
const TARGET = 'admin.product-details.action.render';

const CACHE_BUSTER = Date.now();
const COMMIT_HASH = '7163232';
const FORCE_REBUILD = 'CACHE_BREAK_v7_' + Math.random().toString(36).substring(7);

export default extension(TARGET, (root, { i18n, close, data }) => {
  console.log(`🔥🔥🔥 DIRECT OVERLAY MODE - NO UI - ClientOnlyActionExtension.js LOADED 🔥🔥🔥`);
  console.log(`🚀🚀🚀 THUNDER TEXT OVERLAY v7.0 - COMMIT: ${COMMIT_HASH} - CACHE BUSTER: ${CACHE_BUSTER} 🚀🚀🚀`);
  console.log(`💥💥💥 FORCE REBUILD: ${FORCE_REBUILD} 💥💥💥`);
  console.log('Extension loaded with data:', data);
  console.log('🏷️ Version tracking - Commit:', COMMIT_HASH, 'Deployed:', new Date().toISOString());

  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const meta = document.createElement('meta');
    meta.httpEquiv = 'Cache-Control';
    meta.content = 'no-cache, no-store, must-revalidate';
    document.head?.appendChild(meta);
  }

  try {
    let shopDomain = '';
    if (typeof window !== 'undefined') {
      shopDomain = window.location.hostname.replace('.myshopify.com', '');
    }

    const params = new URLSearchParams({
      source: 'admin_extension',
      shop: `${shopDomain}.myshopify.com`,
      cache_bust: CACHE_BUSTER.toString()
    });

    if (data && data.selected && data.selected.length > 0) {
      const product = data.selected[0];
      console.log('📦 Product data available:', Object.keys(product));

      if (product.id) params.set('productId', product.id);
      if (product.title) params.set('productTitle', product.title);
      if (product.productType) params.set('productType', product.productType);
      if (product.vendor) params.set('vendor', product.vendor);

      let accessToken = null;
      if (typeof window !== 'undefined') {
        accessToken = window.shopifyApp?.accessToken || window.sessionToken;
      }
      if (accessToken) params.set('accessToken', accessToken);
    }

    const targetUrl = `/overlay-test.html?${params.toString()}`;
    const fullUrl = `https://thunder-text-nine.vercel.app${targetUrl}`;

    console.log('🚀 Opening Thunder Text overlay:', fullUrl);

    const popup = window.open(fullUrl, '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes');

    if (popup && !popup.closed) {
      console.log('✅ Successfully opened overlay window via window.open');
      setTimeout(() => {
        close();
      }, 500);
    } else {
      alert('Popup blocked! Please allow popups and try again.\n\nManual URL:\n' + fullUrl);
      close();
    }

  } catch (error) {
    console.error('❌ Error opening Thunder Text overlay:', error);
  }
});