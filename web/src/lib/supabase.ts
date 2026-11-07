import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// These are the same browser-safe Supabase project values used by Student Android.
// Service-role credentials are never sent to the browser or committed here.
const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? 'https://mlcbixsyizsuxxfjwrym.supabase.co'
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? 'sb_publishable_DDvBmb3o1x_VfArVUg-mzw_nbsR7rRA'

export const supabase: SupabaseClient = createClient(url, anonKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
})

export const isSupabaseConfigured = true
