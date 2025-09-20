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

// Thunder Text product description generator - Official Navigation
export default extension(TARGET, (root, { i18n, close, data }) => {
  console.log('🚀🚀🚀 THUNDER TEXT v13.0 - DEPLOYED AT 8:51PM SEPT 20TH 🚀🚀🚀');
  console.log('Extension loaded with data:', data);
  
  // Build UI with proper Shopify navigation
  buildUI();


  function buildUI() {
    console.log('🎨 Building UI with official navigation');
    
    const content = root.createComponent(BlockStack, { gap: 'base' });

    // Title
    content.append(
      root.createComponent(Text, {
        variant: 'headingMd'
      }, '⚡ Thunder Text Generator')
    );

    // Description
    content.append(
      root.createComponent(Text, {
        variant: 'bodyMd'
      }, 'Generate AI-powered product descriptions using this product\'s information.')
    );

    // Main action button - using official Shopify Link component with app: protocol
    let targetUrl = '/create';
    if (data && data.selected && data.selected.length > 0) {
      const product = data.selected[0];
      const params = new URLSearchParams({
        productId: product.id || '',
        productTitle: product.title || '',
        productType: product.productType || '',
        vendor: product.vendor || '',
        source: 'admin_extension',
        shop: shopify.environment.shop || 'zunosai-staging-test-store',
        authenticated: 'true'
      });
      targetUrl = `/create?${params.toString()}`;
      console.log('📦 Product data prepared for Link:', params.toString());
    }
    
    content.append(
      root.createComponent(Link, {
        url: `app:${targetUrl}`
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