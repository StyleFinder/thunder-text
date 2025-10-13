import { createClient } from '@supabase/supabase-js'
import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

// Client-side Supabase client
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)

// Server-side Supabase client with service key
export const supabaseAdmin = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_KEY || 'placeholder-service-key',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// Database schema types for Thunder Text (Shopify app)
// Note: Thunder Text uses 'shops' table for Shopify OAuth tokens
// Do not confuse with 'stores' table from Zeus AI Dashboard

export interface Shop {
  id: string
  shop_domain: string
  access_token: string
  scope: string
  is_active: boolean
  installed_at: string
  last_used_at: string
  metadata: Record<string, any>
  created_at: string
  updated_at: string
}

export interface DescriptionGeneration {
  id: string
  shop_id: string
  product_id: string
  generated_content: Record<string, any>
  status: 'pending' | 'completed' | 'error'
  created_at: string
  updated_at: string
}