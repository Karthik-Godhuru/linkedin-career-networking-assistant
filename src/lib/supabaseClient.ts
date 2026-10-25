import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * Checks whether Supabase environment variables have been properly supplied.
 */
export function isSupabaseConfigured(): boolean {
  if (!supabaseUrl || !supabaseAnonKey) {
    return false
  }

  // Check for unresolved template placeholders
  if (
    supabaseUrl.includes('placeholder-project') ||
    supabaseUrl.includes('your-project-ref') ||
    supabaseAnonKey.includes('placeholder-anon-key') ||
    supabaseAnonKey.includes('your-anon-key-here')
  ) {
    return false
  }

  try {
    new URL(supabaseUrl)
    return true
  } catch {
    return false
  }
}

// Fallback dummy URL to allow client instantiation in development before env is populated
const validUrl = isSupabaseConfigured() ? supabaseUrl : 'https://placeholder.supabase.co'
const validKey = isSupabaseConfigured() ? supabaseAnonKey : 'placeholder-anon-key'

export const supabase = createClient<Database>(validUrl, validKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
