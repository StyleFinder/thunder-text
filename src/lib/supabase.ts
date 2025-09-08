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

// Database schema types
export interface Store {
  id: string
  shop_domain: string
  access_token: string
  plan: string
  settings: Record<string, any>
  usage_limits: number
  current_usage: number
  created_at: string
  updated_at: string
}

export interface Product {
  id: string
  store_id: string
  shopify_product_id: string
  generated_data: Record<string, any>
  status: 'pending' | 'completed' | 'error'
  created_at: string
  updated_at: string
}

export interface GenerationJob {
  id: string
  store_id: string
  product_ids: string[]
  status: 'pending' | 'processing' | 'completed' | 'error'
  results: Record<string, any>
  ai_cost: number
  created_at: string
  updated_at: string
}