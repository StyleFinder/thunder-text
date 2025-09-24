import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export interface ShopTokenData {
  shop_domain: string
  access_token: string
  scope?: string
  is_active: boolean
  installed_at: string
  updated_at: string
  last_used_at?: string
}

/**
 * Store or update a shop's access token
 */
export async function storeShopToken(
  shopDomain: string,
  accessToken: string,
  scope?: string
): Promise<{ success: boolean; error?: string; shopId?: string }> {
  try {
    console.log('📝 Storing access token for shop:', shopDomain)

    // Ensure we have the full shop domain
    const fullShopDomain = shopDomain.includes('.myshopify.com')
      ? shopDomain
      : `${shopDomain}.myshopify.com`

    // Upsert directly to the shops table
    const { data, error } = await supabase
      .from('shops')
      .upsert({
        shop_domain: fullShopDomain,
        access_token: accessToken,
        scope: scope || null,
        is_active: true
      }, {
        onConflict: 'shop_domain'
      })
      .select('id')
      .single()

    if (error) {
      console.error('❌ Error storing token:', error)
      return { success: false, error: error.message }
    }

    console.log('✅ Token stored successfully for shop:', fullShopDomain)
    return { success: true, shopId: data?.id }

  } catch (error) {
    console.error('❌ Unexpected error storing token:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to store token'
    }
  }
}

/**
 * Retrieve a shop's access token
 */
export async function getShopToken(
  shopDomain: string
): Promise<{ success: boolean; accessToken?: string; error?: string }> {
  // TEMPORARY: Use a base64 encoded token from environment
  const encodedToken = process.env.NEXT_PUBLIC_SHOPIFY_TOKEN_B64

  if (encodedToken) {
    try {
      const decodedToken = Buffer.from(encodedToken, 'base64').toString('utf-8')
      console.log('✅ Using decoded token for shop:', shopDomain)
      return {
        success: true,
        accessToken: decodedToken
      }
    } catch (error) {
      console.error('❌ Failed to decode token:', error)
    }
  }

  // First check if we have an environment variable token (Vercel deployment)
  const envToken = process.env.SHOPIFY_ACCESS_TOKEN
  if (envToken && envToken !== '' && envToken !== 'placeholder-token') {
    console.log('✅ Using environment variable token for shop:', shopDomain)
    return {
      success: true,
      accessToken: envToken
    }
  }

  try {
    console.log('🔑 Retrieving access token for shop:', shopDomain)
    console.log('📍 Supabase URL:', supabaseUrl)

    // Ensure we have the full shop domain
    const fullShopDomain = shopDomain.includes('.myshopify.com')
      ? shopDomain
      : `${shopDomain}.myshopify.com`

    // Query the shops table directly
    const { data, error } = await supabase
      .from('shops')
      .select('access_token')
      .eq('shop_domain', fullShopDomain)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('❌ Error retrieving token:', error)
      return { success: false, error: error.message }
    }

    if (!data || !data.access_token) {
      console.log('⚠️ No token found for shop:', fullShopDomain)
      return { success: false, error: 'No token found for this shop' }
    }

    console.log('✅ Token retrieved successfully for shop:', fullShopDomain)
    return { success: true, accessToken: data.access_token }

  } catch (error) {
    console.error('❌ Unexpected error retrieving token:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to retrieve token'
    }
  }
}

/**
 * Check if a shop has a valid token
 */
export async function hasValidToken(shopDomain: string): Promise<boolean> {
  const result = await getShopToken(shopDomain)
  return result.success && !!result.accessToken
}

/**
 * Get shop details including token
 */
export async function getShopDetails(
  shopDomain: string
): Promise<{ success: boolean; shop?: ShopTokenData; error?: string }> {
  try {
    const fullShopDomain = shopDomain.includes('.myshopify.com')
      ? shopDomain
      : `${shopDomain}.myshopify.com`

    const { data, error } = await supabase
      .from('shops')
      .select('*')
      .eq('shop_domain', fullShopDomain)
      .eq('is_active', true)
      .single()

    if (error) {
      console.error('❌ Error getting shop details:', error)
      return { success: false, error: error.message }
    }

    if (!data) {
      return { success: false, error: 'Shop not found' }
    }

    return { success: true, shop: data }

  } catch (error) {
    console.error('❌ Unexpected error getting shop details:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get shop details'
    }
  }
}

/**
 * Deactivate a shop's token (soft delete)
 */
export async function deactivateShopToken(
  shopDomain: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const fullShopDomain = shopDomain.includes('.myshopify.com')
      ? shopDomain
      : `${shopDomain}.myshopify.com`

    const { error } = await supabase
      .from('shops')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('shop_domain', fullShopDomain)

    if (error) {
      console.error('❌ Error deactivating token:', error)
      return { success: false, error: error.message }
    }

    console.log('✅ Token deactivated for shop:', fullShopDomain)
    return { success: true }

  } catch (error) {
    console.error('❌ Unexpected error deactivating token:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to deactivate token'
    }
  }
}