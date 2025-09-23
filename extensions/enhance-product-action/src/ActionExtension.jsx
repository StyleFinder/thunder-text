import React from 'react';
import { reactExtension } from '@shopify/ui-extensions-react/admin';

export default reactExtension('admin.product-details.action.render', () => <App />);

function App() {
  const data = React.useContext(reactExtension.context);
  
  // Get product ID from the extension context
  const productId = data?.resource?.id;
  const shopDomain = data?.shop?.domain;

  const handleEnhanceClick = () => {
    if (!productId || !shopDomain) {
      console.error('Missing product ID or shop domain');
      return;
    }

    // Build the URL to the enhancement workspace
    const baseUrl = process.env.NODE_ENV === 'development' 
      ? 'http://localhost:3000' 
      : 'https://thunder-text-nine.vercel.app';
      
    const enhanceUrl = `${baseUrl}/enhance?shop=${shopDomain}&authenticated=true&productId=${productId.replace('gid://shopify/Product/', '')}&source=admin`;

    // Open in the same window to stay within Shopify admin
    window.open(enhanceUrl, '_self');
  };

  return (
    <Button
      primary
      onClick={handleEnhanceClick}
      disabled={!productId}
    >
      🤖 Enhance Description
    </Button>
  );
}

// Basic Button component since we don't have access to Polaris in extensions
function Button({ children, onClick, primary, disabled }) {
  const style = {
    backgroundColor: primary ? '#008060' : '#f6f6f7',
    color: primary ? 'white' : '#202223',
    border: 'none',
    borderRadius: '3px',
    padding: '8px 12px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
    fontFamily: '-apple-system, BlinkMacSystemFont, San Francisco, Segoe UI, Roboto, Helvetica Neue, sans-serif'
  };

  return (
    <button 
      style={style} 
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}