import { supabase, isSupabaseConfigured } from './supabase'

export interface WelcomeEmailParams {
  email: string
  name: string
  role: 'student' | 'mentor'
  appUrl?: string
}

/**
 * Sends an onboarding welcome email to a student or mentor via the
 * 'send-welcome-email' Supabase Edge Function (powered by Gmail SMTP).
 * Fails safely without disrupting the onboarding UI flow.
 */
export async function sendWelcomeEmail(params: WelcomeEmailParams): Promise<{ success: boolean; error?: string }> {
  if (!params.email) {
    console.warn('sendWelcomeEmail: No email address provided, skipping welcome email.')
    return { success: false, error: 'No email address provided' }
  }

  if (!supabase || !isSupabaseConfigured) {
    console.warn('Supabase is not configured; skipping welcome email.')
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    const appUrl = params.appUrl || (typeof window !== 'undefined' ? window.location.origin : 'https://karkai.vercel.app')
    const { error } = await supabase.functions.invoke('send-welcome-email', {
      body: {
        email: params.email,
        name: params.name,
        role: params.role,
        appUrl,
      },
    })

    if (error) {
      console.warn('Notice: Could not send welcome email via Supabase Edge Function:', error.message)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err: any) {
    console.warn('Notice: Exception invoking send-welcome-email Edge Function:', err)
    return { success: false, error: err?.message || 'Unknown error' }
  }
}
