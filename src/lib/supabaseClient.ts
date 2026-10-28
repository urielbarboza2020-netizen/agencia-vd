import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isSupabaseConfigured = Boolean(url && anonKey)

export const supabase: SupabaseClient = isSupabaseConfigured
  ? createClient(url as string, anonKey as string)
  : (new Proxy(
      {},
      {
        get() {
          throw new Error('Supabase no está configurado: faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY')
        },
      },
    ) as SupabaseClient)
