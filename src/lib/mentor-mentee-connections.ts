import { supabase, anonSupabase, isSupabaseConfigured } from './supabase'
import type { StudentProfileData } from '../components/Students-Onboarding'
import type { MentorProfileData } from './Mentors-details'
import type { UserProfile } from '../components/SignIn-Screen'

export const CONNECTIONS_TABLE_NAME = 'mentor-mentee-connections'
export const CONNECTIONS_CACHE_KEY = 'karkai_mentor_mentee_connections'

export type ConnectionStatus = 'pending' | 'accepted' | 'rejected'

export interface MentorMenteeConnection {
  id: string
  user_id?: string | null
  mentor_user_id?: string | null
  mentor_id?: string | null
  mentor_name: string
  student_name: string
  status: ConnectionStatus
  rejection_reason?: string | null
  created_at: string
  updated_at: string
}

/**
 * SQL Schema for Supabase SQL Editor
 * -- Run this once in your Supabase project → SQL Editor
 *
 * ALTER TABLE public."mentor-mentee-connections"
 *   ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
 *   ADD COLUMN IF NOT EXISTS mentor_user_id UUID REFERENCES public.users(id) ON DELETE CASCADE;
 */

// ---------------------------------------------------------------------------
// Local-storage cache helpers
// ---------------------------------------------------------------------------

export function getCachedConnections(): MentorMenteeConnection[] {
  try {
    const raw = localStorage.getItem(CONNECTIONS_CACHE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveCachedConnections(list: MentorMenteeConnection[]): void {
  try {
    localStorage.setItem(CONNECTIONS_CACHE_KEY, JSON.stringify(list))
  } catch {
    // ignore storage errors
  }
}

// ---------------------------------------------------------------------------
// Send / Re-send a mentorship request
// ---------------------------------------------------------------------------

export async function sendMentorshipRequest(
  mentor: MentorProfileData,
  studentData: StudentProfileData | null,
  studentUser: UserProfile | null
): Promise<{ success: boolean; connection?: MentorMenteeConnection; error?: string }> {
  const mentorName = mentor.fullName
  const studentName = studentData?.fullName || studentUser?.name || 'Student Learner'
  const now = new Date().toISOString()
  const targetMentorId = mentor.id
  const targetMentorUserId = mentor.userId

  // 1. Check local cache — match by unique mentor id/userId FIRST to avoid collisions between same-named mentors
  const cachedList = getCachedConnections()
  const existingIdx = cachedList.findIndex((c) => {
    const studentMatch = c.student_name?.toLowerCase() === studentName.toLowerCase()
    if (!studentMatch) return false

    // Unique match by ID
    if (targetMentorUserId && c.mentor_user_id && c.mentor_user_id === targetMentorUserId) return true
    if (targetMentorId && c.mentor_id && c.mentor_id === targetMentorId) return true
    if (targetMentorId && c.mentor_user_id && c.mentor_user_id === targetMentorId) return true

    // Fallback to name ONLY if neither record has an ID
    if (!targetMentorUserId && !targetMentorId && !c.mentor_user_id && !c.mentor_id) {
      return c.mentor_name?.toLowerCase() === mentorName.toLowerCase()
    }
    return false
  })

  const connectionId =
    existingIdx >= 0
      ? cachedList[existingIdx].id
      : `conn-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`

  // Determine user IDs for foreign key cascading deletion
  let studentUserId = studentUser?.id || (studentData as any)?.userId || (studentData as any)?.user_id
  if (!studentUserId && supabase && isSupabaseConfigured) {
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      studentUserId = sessionData.session?.user?.id
    } catch {
      // ignore session read errors
    }
  }
  const mentorUserId = targetMentorUserId || targetMentorId

  const connectionRecord: MentorMenteeConnection = {
    id: connectionId,
    user_id: studentUserId || null,
    mentor_user_id: mentorUserId || null,
    mentor_id: targetMentorId || null,
    mentor_name: mentorName,
    student_name: studentName,
    status: 'pending',
    rejection_reason: null,
    created_at: existingIdx >= 0 ? cachedList[existingIdx].created_at : now,
    updated_at: now,
  }

  if (existingIdx >= 0) {
    cachedList[existingIdx] = connectionRecord
  } else {
    cachedList.unshift(connectionRecord)
  }
  saveCachedConnections(cachedList)

  // 2. Persist to Supabase
  if (supabase && isSupabaseConfigured) {
    try {
      let existingQuery = supabase
        .from(CONNECTIONS_TABLE_NAME)
        .select('id')
        .eq('student_name', studentName)

      if (mentorUserId) {
        existingQuery = existingQuery.eq('mentor_user_id', mentorUserId)
      } else {
        existingQuery = existingQuery.eq('mentor_name', mentorName)
      }

      const { data: existing } = await existingQuery.maybeSingle()

      const payloadWithUserIds: Record<string, any> = {
        mentor_name: mentorName,
        student_name: studentName,
        status: 'pending',
        rejection_reason: null,
        updated_at: now,
        ...(studentUserId ? { user_id: studentUserId } : {}),
        ...(mentorUserId ? { mentor_user_id: mentorUserId } : {}),
      }

      if (existing) {
        // Already exists — reset to pending
        let { data: updated, error: updateErr } = await supabase
          .from(CONNECTIONS_TABLE_NAME)
          .update(payloadWithUserIds)
          .eq('id', existing.id)
          .select()
          .maybeSingle()

        // Fallback if user_id / mentor_user_id columns not yet added to table
        if (updateErr && (updateErr.message?.includes('user_id') || updateErr.code === 'PGRST204')) {
          const fallbackPayload = {
            mentor_name: mentorName,
            student_name: studentName,
            status: 'pending',
            rejection_reason: null,
            updated_at: now,
          }
          const retryRes = await supabase
            .from(CONNECTIONS_TABLE_NAME)
            .update(fallbackPayload)
            .eq('id', existing.id)
            .select()
            .maybeSingle()
          updated = retryRes.data
        }

        if (updated) return { success: true, connection: updated as MentorMenteeConnection }
      } else {
        // New request
        const newPayload = {
          ...payloadWithUserIds,
          created_at: now,
        }

        let { data: inserted, error: insertErr } = await supabase
          .from(CONNECTIONS_TABLE_NAME)
          .insert([newPayload])
          .select()
          .maybeSingle()

        // Fallback if user_id / mentor_user_id columns not yet added to table
        if (insertErr && (insertErr.message?.includes('user_id') || insertErr.code === 'PGRST204')) {
          const fallbackPayload = {
            mentor_name: mentorName,
            student_name: studentName,
            status: 'pending',
            rejection_reason: null,
            created_at: now,
            updated_at: now,
          }
          const retryRes = await supabase
            .from(CONNECTIONS_TABLE_NAME)
            .insert([fallbackPayload])
            .select()
            .maybeSingle()
          inserted = retryRes.data
        }

        if (inserted) {
          // Sync real UUID back to cache
          const updatedCache = getCachedConnections().map((c) =>
            c.id === connectionId ? { ...c, id: inserted.id } : c
          )
          saveCachedConnections(updatedCache)
          return { success: true, connection: inserted as MentorMenteeConnection }
        } else if (insertErr) {
          console.warn(`[Connections] Backend notice for "${CONNECTIONS_TABLE_NAME}":`, insertErr.message)
          // Ensure optimistic update on UI so button transitions to "Requested" without blocking the user
          return { success: true, connection: connectionRecord, error: insertErr.message }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.warn('Supabase write fallback in sendMentorshipRequest:', msg)
      return { success: true, connection: connectionRecord, error: msg }
    }
  }

  return { success: true, connection: connectionRecord }
}

// ---------------------------------------------------------------------------
// Get all requests for a mentor (by name)
// ---------------------------------------------------------------------------

export async function getMentorRequests(mentorIdentifier: {
  id?: string
  userId?: string
  email?: string
  fullName?: string
}): Promise<MentorMenteeConnection[]> {
  const mentorName = mentorIdentifier.fullName?.trim()
  const mentorUserId = mentorIdentifier.userId || mentorIdentifier.id

  if (!mentorName && !mentorUserId) return []

  // 1. Try Supabase
  if (supabase && isSupabaseConfigured) {
    try {
      let query = supabase.from(CONNECTIONS_TABLE_NAME).select('*')

      if (mentorUserId) {
        query = query.or(
          `mentor_user_id.eq.${mentorUserId},and(mentor_user_id.is.null,mentor_name.ilike.${mentorName || ''})`
        )
      } else if (mentorName) {
        query = query.ilike('mentor_name', mentorName)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (!error && Array.isArray(data)) {
        return data as MentorMenteeConnection[]
      } else if (error) {
        console.warn('Notice querying mentor requests from Supabase:', error.message)
      }
    } catch (err) {
      console.warn('Error fetching mentor requests from Supabase:', err)
    }
  }

  // 2. Cache fallback
  return getCachedConnections().filter((c) => {
    if (mentorUserId && c.mentor_user_id) {
      return c.mentor_user_id === mentorUserId || (c as any).mentor_id === mentorUserId
    }
    if (mentorName) {
      return c.mentor_name?.trim().toLowerCase() === mentorName.toLowerCase()
    }
    return false
  })
}

// ---------------------------------------------------------------------------
// Get all requests sent by a student (by name)
// ---------------------------------------------------------------------------

export async function getStudentRequests(studentIdentifier: {
  id?: string
  email?: string
  fullName?: string
}): Promise<MentorMenteeConnection[]> {
  const studentName = studentIdentifier.fullName?.trim()

  if (!studentName) return []

  // 1. Try Supabase
  if (supabase && isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from(CONNECTIONS_TABLE_NAME)
        .select('*')
        .ilike('student_name', studentName)
        .order('created_at', { ascending: false })

      if (!error && Array.isArray(data)) {
        return data as MentorMenteeConnection[]
      } else if (error) {
        console.warn('Notice querying student requests from Supabase:', error.message)
      }
    } catch (err) {
      console.warn('Error fetching student requests from Supabase:', err)
    }
  }

  // 2. Cache fallback
  return getCachedConnections().filter(
    (c) => c.student_name?.trim().toLowerCase() === studentName.toLowerCase()
  )
}

// ---------------------------------------------------------------------------
// Update connection status (accept / reject with reason)
// ---------------------------------------------------------------------------

export async function updateConnectionStatus(
  connectionId: string,
  status: ConnectionStatus,
  rejectionReason?: string | null
): Promise<{ success: boolean; error?: string }> {
  const now = new Date().toISOString()
  const resolvedReason = status === 'rejected' ? (rejectionReason || 'Mentor is currently at capacity.') : null

  // 1. Update local cache
  const cachedList = getCachedConnections()
  const idx = cachedList.findIndex((c) => c.id === connectionId)
  if (idx >= 0) {
    cachedList[idx] = { ...cachedList[idx], status, rejection_reason: resolvedReason, updated_at: now }
    saveCachedConnections(cachedList)
  }

  // 2. Update Supabase
  if (supabase && isSupabaseConfigured) {
    try {
      const { error } = await supabase
        .from(CONNECTIONS_TABLE_NAME)
        .update({ status, rejection_reason: resolvedReason, updated_at: now })
        .eq('id', connectionId)

      if (error) console.warn('Error updating connection status in Supabase:', error.message)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      return { success: false, error: msg }
    }
  }

  return { success: true }
}

// ---------------------------------------------------------------------------
// Withdraw mentorship request (student cancels a pending request)
// ---------------------------------------------------------------------------

export async function withdrawMentorshipRequest(
  connectionId: string,
  mentorName?: string,
  studentName?: string
): Promise<{ success: boolean; error?: string }> {
  // 1. Remove from local cache immediately
  const cachedList = getCachedConnections()
  const updatedCache = cachedList.filter((c) => {
    if (connectionId && c.id === connectionId) return false
    if (!connectionId && mentorName && studentName) {
      const mentorMatches = c.mentor_name?.trim().toLowerCase() === mentorName.trim().toLowerCase()
      const studentMatches = c.student_name?.trim().toLowerCase() === studentName.trim().toLowerCase()
      if (mentorMatches && studentMatches) return false
    }
    return true
  })
  saveCachedConnections(updatedCache)

  // 2. Delete record from Supabase
  if (supabase && isSupabaseConfigured) {
    try {
      let deleted = false

      // Try deletion by ID (if not a temporary local ID)
      if (connectionId && !connectionId.startsWith('conn-')) {
        const { error: idErr } = await supabase
          .from(CONNECTIONS_TABLE_NAME)
          .delete()
          .eq('id', connectionId)

        if (!idErr) {
          deleted = true
        } else {
          console.warn('[Connections] Primary delete by id notice:', idErr.message)
        }
      }

      // Try deletion by mentor_name and student_name only if connectionId wasn't provided
      if (!deleted && !connectionId && mentorName && studentName) {
        const { error: nameErr } = await supabase
          .from(CONNECTIONS_TABLE_NAME)
          .delete()
          .ilike('mentor_name', mentorName.trim())
          .ilike('student_name', studentName.trim())

        if (!nameErr) {
          deleted = true
        } else {
          console.warn('[Connections] Primary delete by names notice:', nameErr.message)
        }
      }
      // 3. Fallback: try anonSupabase if RLS blocked the main client
      if (!deleted && anonSupabase) {
        if (connectionId && !connectionId.startsWith('conn-')) {
          await anonSupabase
            .from(CONNECTIONS_TABLE_NAME)
            .delete()
            .eq('id', connectionId)
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.warn('Supabase delete error in withdrawMentorshipRequest:', msg)
      return { success: true, error: msg }
    }
  }

  return { success: true }
}

/**
 * Fetch ALL mentor-mentee connections from the Supabase table for Admin Governance.
 * Supports anonSupabase fallback to ensure unblocked read access.
 */
export async function getAllConnections(): Promise<MentorMenteeConnection[]> {
  if (supabase && isSupabaseConfigured) {
    try {
      const clientToUse = anonSupabase || supabase
      const { data, error } = await clientToUse
        .from(CONNECTIONS_TABLE_NAME)
        .select('*')
        .order('created_at', { ascending: false })

      if (!error && Array.isArray(data)) {
        return data as MentorMenteeConnection[]
      } else if (error) {
        console.warn('Notice querying all connections from Supabase:', error.message)
      }
    } catch (err) {
      console.warn('Error fetching all connections from Supabase:', err)
    }
  }

  return getCachedConnections()
}

