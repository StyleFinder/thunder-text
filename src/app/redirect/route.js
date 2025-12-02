import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Extract all the product data from query parameters
    const productData = {
      productId: searchParams.get('productId') || '',
      productTitle: searchParams.get('productTitle') || '',
      productType: searchParams.get('productType') || '',
      vendor: searchParams.get('vendor') || '',
      source: searchParams.get('source') || 'admin_extension',
      shop: searchParams.get('shop') || 'zunosai-staging-test-store'
    };

    console.log('🔄 Admin Extension Redirect:', productData);

    // Build the redirect URL to the create page with all the data
    const createUrl = new URL('/create-pd', request.url);
    
    // Add all product data as query parameters
    Object.entries(productData).forEach(([key, value]) => {
      if (value) {
        createUrl.searchParams.set(key, value);
      }
    });

    // Add authentication parameters for development
    createUrl.searchParams.set('shop', productData.shop);
    createUrl.searchParams.set('authenticated', 'true');

    console.log('➡️ Redirecting to:', createUrl.toString());

    // Return a 302 redirect to the create page
    return NextResponse.redirect(createUrl.toString());

  } catch (error) {
    console.error('❌ Redirect error:', error);
    
    // Fallback: redirect to home page
    const homeUrl = new URL('/', request.url);
    return NextResponse.redirect(homeUrl.toString());
  }
}