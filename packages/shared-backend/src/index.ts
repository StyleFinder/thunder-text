/**
 * Thunder Text Shared Backend
 * Shared services and utilities for ThunderText and ACE apps
 */

// Database Clients
export { supabase, supabaseAdmin } from './lib/supabase'
export { pool, getTenantClient, queryWithTenant } from './lib/postgres'
export type { TenantAwareClient } from './lib/postgres'

// AI Services
// Note: These modules have dependencies that will be resolved in next step
// export * from './lib/openai-client'
// export * from './lib/openai'

// Business Services
// Note: These have dependencies that will be resolved in next step
// export * from './lib/services/business-profile-generator'
// export * from './lib/services/facebook-api'
