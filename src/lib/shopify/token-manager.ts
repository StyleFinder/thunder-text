import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client with proper key handling
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!

// Use service key if available (server-side), otherwise use anon key
// Service key is needed for bypassing RLS policies
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Log which key we're using (without exposing the actual key)
if (typeof window === 'undefined') {
  console.log('🔑 Token Manager initialized with:', {
    url: supabaseUrl,
    keyType: process.env.SUPABASE_SERVICE_KEY ? 'service' : 'anon',
    keyLength: supabaseKey?.length || 0
  })
}

const supabase = createClient(supabaseUrl, supabaseKey)

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
 * Retrieve a shop's access token from the database
 */
export async function getShopToken(
  shopDomain: string
): Promise<{ success: boolean; accessToken?: string; error?: string }> {
  try {
    console.log('🔑 Retrieving access token for shop:', shopDomain)
    console.log('📍 Supabase URL:', supabaseUrl)

    // Ensure we have the full shop domain
    const fullShopDomain = shopDomain.includes('.myshopify.com')
      ? shopDomain
      : `${shopDomain}.myshopify.com`

    console.log('🔍 Querying shops table for:', fullShopDomain)

    // Query the shops table directly
    const { data, error } = await supabase
      .from('shops')
      .select('access_token')
      .eq('shop_domain', fullShopDomain)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('❌ Database error retrieving token:', error)
      console.error('📝 Error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      })

      // Check if it's an RLS policy error
      if (error.code === '42501') {
        console.error('🔒 RLS Policy Error: The anon key cannot read from shops table')
        console.error('💡 Solution: Add RLS policy or use service key')
      }

      return { success: false, error: error.message }
    }

    if (!data || !data.access_token) {
      console.log('⚠️ No token found for shop:', fullShopDomain)
      console.log('💡 Hint: Make sure the app is installed through Shopify OAuth flow')
      console.log('📝 Query attempted for:', fullShopDomain)
      return { success: false, error: `No token found for shop: ${fullShopDomain}` }
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
 * Save a shop's access token (alias for storeShopToken)
 * Used by the Token Exchange flow
 */
export async function saveShopToken(
  data: {
    shop_domain: string
    access_token: string
    scope?: string
  }
): Promise<{ success: boolean; error?: string; shopId?: string }> {
  return storeShopToken(data.shop_domain, data.access_token, data.scope)
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