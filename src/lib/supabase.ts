import { createClient, type Session, type User } from '@supabase/supabase-js'

export const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL ||
  ''

export const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  ''

// Check whether real credentials have been supplied
export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl !== 'https://your-project-id.supabase.co' &&
  supabaseAnonKey !== 'your-supabase-anon-key'
)

// Primary Supabase client instance (persists user session)
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : null

// Unauthenticated Supabase client instance (does not attach user session JWT, auth.uid() is null for public/anon policies)
export const anonSupabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    })
  : null

/**
 * Initiates Google OAuth Sign-In with Supabase
 */
export async function signInWithGoogle() {
  if (!supabase || !isSupabaseConfigured) {
    throw new Error(
      'Supabase is not configured yet. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local'
    )
  }

  // Redirect back to the current window origin
  const redirectTo = `${window.location.origin}/`

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      queryParams: {
        access_type: 'offline',
        prompt: 'select_account',
      },
    },
  })

  if (error) {
    throw error
  }

  return data
}

/**
 * Sign out of Supabase session
 */
export async function signOut() {
  if (!supabase || !isSupabaseConfigured) return
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

/**
 * Get current session
 */
export async function getSession(): Promise<Session | null> {
  if (!supabase || !isSupabaseConfigured) return null
  const { data } = await supabase.auth.getSession()
  return data.session
}

/**
 * Listen to auth state changes (e.g. callback from Google OAuth redirect)
 */
export function onAuthStateChange(callback: (session: Session | null, user: User | null) => void) {
  if (!supabase || !isSupabaseConfigured) {
    return { data: { subscription: { unsubscribe: () => {} } } }
  }

  return supabase.auth.onAuthStateChange((_event, session) => {
    callback(session, session?.user ?? null)
  })
}
