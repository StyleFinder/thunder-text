import { SessionStorage } from '@shopify/shopify-app-session-storage'
import type { Session } from '@shopify/shopify-app-remix'
import { createClient } from '@supabase/supabase-js'

/**
 * Supabase session storage adapter for Shopify authentication
 * This stores Shopify sessions in our Supabase database
 */
export class SupabaseSessionStorage implements SessionStorage {
  private supabase: any

  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      console.warn('⚠️ Supabase credentials not found, using in-memory storage')
      // Fall back to in-memory storage if Supabase is not configured
      this.sessions = new Map()
      return
    }

    this.supabase = createClient(supabaseUrl, supabaseServiceKey)
  }

  // In-memory fallback storage
  private sessions?: Map<string, Session>

  async storeSession(session: Session): Promise<boolean> {
    try {
      // Use in-memory storage if Supabase is not available
      if (this.sessions) {
        this.sessions.set(session.id, session)
        return true
      }

      // Store in Supabase
      const { error } = await this.supabase
        .from('shopify_sessions')
        .upsert({
          id: session.id,
          shop: session.shop,
          state: session.state,
          is_online: session.isOnline,
          scope: session.scope,
          expires: session.expires?.toISOString(),
          access_token: session.accessToken,
          online_access_info: session.onlineAccessInfo,
          updated_at: new Date().toISOString(),
        })

      if (error) {
        console.error('❌ Failed to store session:', error)
        return false
      }

      console.log('✅ Session stored successfully:', session.id)

      // Also store the access token in our shops table for compatibility
      if (session.accessToken && session.shop) {
        await this.supabase
          .from('shops')
          .upsert({
            shop_domain: session.shop,
            access_token: session.accessToken,
            scope: session.scope,
            updated_at: new Date().toISOString(),
          })
      }

      return true
    } catch (error) {
      console.error('❌ Error storing session:', error)
      return false
    }
  }

  async loadSession(id: string): Promise<Session | undefined> {
    try {
      // Use in-memory storage if Supabase is not available
      if (this.sessions) {
        return this.sessions.get(id)
      }

      // Load from Supabase
      const { data, error } = await this.supabase
        .from('shopify_sessions')
        .select('*')
        .eq('id', id)
        .single()

      if (error || !data) {
        console.log('⚠️ Session not found:', id)
        return undefined
      }

      // Convert database record to Session object
      const session: Session = {
        id: data.id,
        shop: data.shop,
        state: data.state,
        isOnline: data.is_online,
        scope: data.scope,
        expires: data.expires ? new Date(data.expires) : undefined,
        accessToken: data.access_token,
        onlineAccessInfo: data.online_access_info,
      }

      return session
    } catch (error) {
      console.error('❌ Error loading session:', error)
      return undefined
    }
  }

  async deleteSession(id: string): Promise<boolean> {
    try {
      // Use in-memory storage if Supabase is not available
      if (this.sessions) {
        this.sessions.delete(id)
        return true
      }

      // Delete from Supabase
      const { error } = await this.supabase
        .from('shopify_sessions')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('❌ Failed to delete session:', error)
        return false
      }

      console.log('✅ Session deleted:', id)
      return true
    } catch (error) {
      console.error('❌ Error deleting session:', error)
      return false
    }
  }

  async deleteSessions(ids: string[]): Promise<boolean> {
    try {
      // Use in-memory storage if Supabase is not available
      if (this.sessions) {
        ids.forEach(id => this.sessions!.delete(id))
        return true
      }

      // Delete from Supabase
      const { error } = await this.supabase
        .from('shopify_sessions')
        .delete()
        .in('id', ids)

      if (error) {
        console.error('❌ Failed to delete sessions:', error)
        return false
      }

      console.log('✅ Sessions deleted:', ids.length)
      return true
    } catch (error) {
      console.error('❌ Error deleting sessions:', error)
      return false
    }
  }

  async findSessionsByShop(shop: string): Promise<Session[]> {
    try {
      // Use in-memory storage if Supabase is not available
      if (this.sessions) {
        return Array.from(this.sessions.values()).filter(s => s.shop === shop)
      }

      // Find in Supabase
      const { data, error } = await this.supabase
        .from('shopify_sessions')
        .select('*')
        .eq('shop', shop)

      if (error) {
        console.error('❌ Failed to find sessions:', error)
        return []
      }

      // Convert database records to Session objects
      return (data || []).map((record: any) => ({
        id: record.id,
        shop: record.shop,
        state: record.state,
        isOnline: record.is_online,
        scope: record.scope,
        expires: record.expires ? new Date(record.expires) : undefined,
        accessToken: record.access_token,
        onlineAccessInfo: record.online_access_info,
      }))
    } catch (error) {
      console.error('❌ Error finding sessions:', error)
      return []
    }
  }
}