import { supabase, isSupabaseConfigured } from './supabase'
import {
  getStudentDetails,
  mapStudentPayloadToProfileData,
  getCachedStudentProfile,
} from './Students-details'
import type { StudentProfileData } from '../components/Students-Onboarding'
import {
  getMentorDetails,
  mapMentorPayloadToProfileData,
  getCachedMentorProfile,
  type MentorProfileData,
} from './Mentors-details'


export type UserRole = 'student' | 'mentor'

export interface UserProfileInput {
  id?: string
  name: string
  role: UserRole
  email?: string
}

export interface UserRecord {
  id: string
  name: string
  role: UserRole
  email: string | null
  created_at?: string
  updated_at?: string
}

/**
 * Save or update user name and role in the 'users' Supabase table.
 * If id is not provided, it automatically retrieves the authenticated user's ID.
 */
export async function saveUser(profile: UserProfileInput): Promise<UserRecord | null> {
  if (!supabase || !isSupabaseConfigured) {
    console.warn('Supabase is not configured. User profile not saved to backend.')
    return null
  }

  // Obtain current user ID from session if not explicitly provided
  let userId = profile.id
  let userEmail = profile.email

  if (!userId) {
    const { data: sessionData } = await supabase.auth.getSession()
    const authUser = sessionData.session?.user
    if (!authUser) {
      console.warn('Cannot save user profile: No active user session found.')
      return null
    }
    userId = authUser.id
    if (!userEmail) userEmail = authUser.email
  }

  const payload = {
    id: userId,
    name: profile.name,
    role: profile.role,
    email: userEmail || null,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('users')
    .upsert(payload, { onConflict: 'id' })
    .select()
    .single()

  if (error) {
    console.error('Error saving user to "users" table:', error)
    throw error
  }

  return data as UserRecord
}

/**
 * Fetch a user profile from the 'users' table by ID or email.
 * If neither is passed, fetches the currently logged-in user's profile.
 */
export async function getUser(userId?: string, userEmail?: string): Promise<UserRecord | null> {
  if (!supabase || !isSupabaseConfigured) return null

  let targetId = userId
  let targetEmail = userEmail
  if (!targetId && !targetEmail) {
    const { data: sessionData } = await supabase.auth.getSession()
    targetId = sessionData.session?.user?.id
    targetEmail = sessionData.session?.user?.email
  }

  // 1. Try finding by user ID
  if (targetId) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', targetId)
        .maybeSingle()

      if (!error && data) {
        return data as UserRecord
      }
    } catch (err) {
      console.warn('Error querying "users" by id:', err)
    }
  }

  // 2. Try finding by email
  if (targetEmail) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', targetEmail)
        .maybeSingle()

      if (!error && data) {
        return data as UserRecord
      }
    } catch (err) {
      console.warn('Error querying "users" by email:', err)
    }
  }

  return null
}

/**
 * Update the user's role in the 'users' table
 */
export async function updateUserRole(role: UserRole, userId?: string): Promise<UserRecord | null> {
  if (!supabase || !isSupabaseConfigured) return null

  let targetId = userId
  if (!targetId) {
    const { data: sessionData } = await supabase.auth.getSession()
    targetId = sessionData.session?.user?.id
  }

  if (!targetId) {
    throw new Error('No user ID found to update role.')
  }

  const { data, error } = await supabase
    .from('users')
    .update({
      role,
      updated_at: new Date().toISOString(),
    })
    .eq('id', targetId)
    .select()
    .single()

  if (error) {
    console.error('Error updating role in "users" table:', error)
    throw error
  }

  return data as UserRecord
}

/**
 * Check if the user already has a saved role in the 'users' table
 */
export async function getUserRole(userId?: string, userEmail?: string): Promise<UserRole | null> {
  const profile = await getUser(userId, userEmail)
  return profile?.role ?? null
}

export interface ResolvedUserDestination {
  destination: 'student-dashboard' | 'student-onboarding' | 'mentor-onboarding' | 'mentor-dashboard' | 'role-selection' | 'app'
  role: UserRole | null
  studentData: StudentProfileData | null
  mentorData?: MentorProfileData | null
  isExistingUser: boolean
}

/**
 * Determine the exact destination view for a user based on existing Supabase records:
 * 1. Checks 'Student-details' table in Supabase.
 * 2. Checks 'Mentor-details' table in Supabase.
 * 3. Checks 'users' table in Supabase.
 * 4. Checks localStorage fallback cache.
 * If the user is an existing student, they are directed straight into 'student-dashboard'.
 * If the user is an existing mentor, they are directed straight into their mentor view.
 */
export async function resolveUserStatus(
  userId?: string,
  userEmail?: string,
  userName?: string
): Promise<ResolvedUserDestination> {
  // 1. Check if student details already exist in 'Student-details' table
  try {
    const studentPayload = await getStudentDetails(userId, userEmail)
    if (studentPayload) {
      const studentProfile = mapStudentPayloadToProfileData(studentPayload)
      // Ensure 'users' table also has their role saved
      if (userId) {
        saveUser({
          id: userId,
          name: studentProfile.fullName || userName || 'Student',
          role: 'student',
          email: userEmail,
        }).catch(() => {})
      }
      return {
        destination: 'student-dashboard',
        role: 'student',
        studentData: studentProfile,
        mentorData: null,
        isExistingUser: true,
      }
    }
  } catch (err) {
    console.warn('Notice checking student details in Supabase:', err)
  }

  // 2. Check if mentor details already exist in 'Mentor-details' table
  try {
    const mentorPayload = await getMentorDetails(userId, userEmail)
    if (mentorPayload) {
      const mentorProfile = mapMentorPayloadToProfileData(mentorPayload)
      if (userId) {
        saveUser({
          id: userId,
          name: mentorProfile.fullName || userName || 'Mentor',
          role: 'mentor',
          email: userEmail,
        }).catch(() => {})
      }
      return {
        destination: 'mentor-dashboard',
        role: 'mentor',
        studentData: null,
        mentorData: mentorProfile,
        isExistingUser: true,
      }
    }
  } catch (err) {
    console.warn('Notice checking mentor details in Supabase:', err)
  }

  // 3. Check if user has an existing record in 'users' table
  try {
    const userRecord = await getUser(userId, userEmail)
    if (userRecord?.role) {
      if (userRecord.role === 'student') {
        // Role is student, but student details not filled yet
        return {
          destination: 'student-onboarding',
          role: 'student',
          studentData: null,
          mentorData: null,
          isExistingUser: true,
        }
      } else if (userRecord.role === 'mentor') {
        // Role is mentor; check if mentor local cache exists
        const cachedMentor = getCachedMentorProfile(userId || userEmail)
        if (cachedMentor) {
          return {
            destination: 'mentor-dashboard',
            role: 'mentor',
            studentData: null,
            mentorData: cachedMentor,
            isExistingUser: true,
          }
        }
        return {
          destination: 'mentor-onboarding',
          role: 'mentor',
          studentData: null,
          mentorData: null,
          isExistingUser: true,
        }
      }
    }
  } catch (err) {
    console.warn('Notice checking user role in Supabase:', err)
  }

  // 4. Fallback check local storage for student
  const cachedStudentProfile = getCachedStudentProfile(userId || userEmail)
  if (cachedStudentProfile) {
    return {
      destination: 'student-dashboard',
      role: 'student',
      studentData: cachedStudentProfile,
      mentorData: null,
      isExistingUser: true,
    }
  }

  // 5. Fallback check local storage for mentor
  const cachedMentorProfile = getCachedMentorProfile(userId || userEmail)
  if (cachedMentorProfile) {
    return {
      destination: 'mentor-dashboard',
      role: 'mentor',
      studentData: null,
      mentorData: cachedMentorProfile,
      isExistingUser: true,
    }
  }

  // 6. Truly new user: needs to choose their role
  return {
    destination: 'role-selection',
    role: null,
    studentData: null,
    mentorData: null,
    isExistingUser: false,
  }
}

