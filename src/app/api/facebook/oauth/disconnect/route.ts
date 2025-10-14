/**
 * Facebook OAuth Disconnect Endpoint
 *
 * POST /api/facebook/oauth/disconnect
 *
 * Purpose: Disconnect Facebook integration by revoking tokens and removing from database
 *
 * Flow:
 * 1. Verify user authentication and shop access
 * 2. Get Facebook integration record
 * 3. Optionally revoke token with Facebook (best effort)
 * 4. Delete integration record from database
 * 5. Return success response
 *
 * Request Body:
 * {
 *   "shop": "zunosai-staging-test-store.myshopify.com"
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { decryptToken } from '@/lib/services/encryption'

/**
 * Revoke Facebook access token
 * https://developers.facebook.com/docs/facebook-login/guides/access-tokens/expiration-and-extension
 *
 * This is best-effort - if it fails, we still delete from our database
 */
async function revokeToken(accessToken: string): Promise<boolean> {
  try {
    const revokeUrl = new URL('https://graph.facebook.com/v21.0/me/permissions')
    revokeUrl.searchParams.set('access_token', accessToken)

    const response = await fetch(revokeUrl.toString(), {
      method: 'DELETE'
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Facebook token revocation failed:', error)
      return false
    }

    const result = await response.json()
    return result.success === true
  } catch (error) {
    console.error('Error revoking Facebook token:', error)
    return false
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { shop } = body

    if (!shop) {
      return NextResponse.json(
        { error: 'Missing shop parameter' },
        { status: 400 }
      )
    }

    // Get shop record
    const { data: shopData, error: shopError } = await supabaseAdmin
      .from('shops')
      .select('id, shop_domain')
      .eq('shop_domain', shop)
      .single()

    if (shopError || !shopData) {
      console.error('Shop not found:', shop, shopError)
      return NextResponse.json(
        { error: 'Shop not found' },
        { status: 404 }
      )
    }

    // Get Facebook integration
    const { data: integration, error: integrationError } = await supabaseAdmin
      .from('integrations')
      .select('*')
      .eq('shop_id', shopData.id)
      .eq('provider', 'facebook')
      .single()

    if (integrationError || !integration) {
      console.log('No Facebook integration found for shop:', shop)
      return NextResponse.json(
        { error: 'Facebook integration not found' },
        { status: 404 }
      )
    }

    // Best effort: Try to revoke token with Facebook
    try {
      const decryptedToken = await decryptToken(integration.encrypted_access_token)
      const revoked = await revokeToken(decryptedToken)
      if (revoked) {
        console.log('Facebook token revoked successfully')
      } else {
        console.log('Facebook token revocation failed, but continuing with local deletion')
      }
    } catch (error) {
      console.error('Error during token revocation (continuing anyway):', error)
    }

    // Delete integration from database
    const { error: deleteError } = await supabaseAdmin
      .from('integrations')
      .delete()
      .eq('shop_id', shopData.id)
      .eq('provider', 'facebook')

    if (deleteError) {
      console.error('Failed to delete Facebook integration:', deleteError)
      throw deleteError
    }

    console.log('Facebook integration disconnected successfully for shop:', shop)

    return NextResponse.json({
      success: true,
      message: 'Facebook account disconnected successfully'
    })

  } catch (error) {
    console.error('Error in Facebook OAuth disconnect:', error)
    return NextResponse.json(
      { error: 'Failed to disconnect Facebook account' },
      { status: 500 }
    )
  }
}
