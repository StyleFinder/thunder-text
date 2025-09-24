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

    const { data, error } = await supabase
      .rpc('upsert_shop_token', {
        p_shop_domain: fullShopDomain,
        p_access_token: accessToken,
        p_scope: scope || null
      })

    if (error) {
      console.error('❌ Error storing token:', error)
      return { success: false, error: error.message }
    }

    console.log('✅ Token stored successfully for shop:', fullShopDomain)
    return { success: true, shopId: data }

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
  try {
    console.log('🔑 Retrieving access token for shop:', shopDomain)

    // Ensure we have the full shop domain
    const fullShopDomain = shopDomain.includes('.myshopify.com')
      ? shopDomain
      : `${shopDomain}.myshopify.com`

    const { data, error } = await supabase
      .rpc('get_shop_access_token', {
        p_shop_domain: fullShopDomain
      })

    if (error) {
      console.error('❌ Error retrieving token:', error)
      return { success: false, error: error.message }
    }

    if (!data) {
      console.log('⚠️ No token found for shop:', fullShopDomain)
      return { success: false, error: 'No token found for this shop' }
    }

    console.log('✅ Token retrieved successfully for shop:', fullShopDomain)
    return { success: true, accessToken: data }

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