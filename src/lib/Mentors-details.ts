
import { supabase, isSupabaseConfigured } from './supabase'

export const MENTOR_TABLE_NAME = 'Mentor-details'
export const MENTOR_BUCKET_NAME = 'Mentors-assets'
export const MENTOR_STORAGE_CACHE_KEY = 'karkai_mentor_profile'

export type MentorVerificationStatus = 'pending' | 'approved' | 'rejected'

export interface MentorProfileData {
  id?: string
  userId?: string
  email?: string

  // Step 1: Your Information
  fullName: string
  phoneNumber: string
  countryCode: string
  workingAs: string // Designation / Role
  workingIn: string // Company / Organization
  city: string
  region: string // State / Province

  // Step 2: Skills & Bio
  technicalSkills: string[]
  softSkills: string[]
  bio: string

  // Step 3: Documents
  linkedinUrl: string
  idCardPhotoUrl: string
  idCardFileName?: string
  resumeUrl: string
  resumeFileName?: string
  resumeFileSize?: string

  // System & Verification Metadata
  completedAt?: string
  isVerified: boolean // TRUE when approved, FALSE when pending or rejected
  verificationStatus: MentorVerificationStatus // 'pending' | 'approved' | 'rejected'
  rejectionReason?: string | null
  reviewedAt?: string | null
}

export interface MentorDetailsPayload {
  id?: string
  user_id?: string
  full_name: string
  phone_number: string
  country_code: string
  working_as: string
  working_in: string
  city: string
  region: string

  technical_skills: string[]
  soft_skills: string[]
  bio: string

  linkedin_url: string
  id_card_url?: string | null
  id_card_file_name?: string | null
  resume_url?: string | null
  resume_file_name?: string | null

  is_verified?: boolean
  verification_status?: MentorVerificationStatus
  rejection_reason?: string | null
  reviewed_at?: string | null

  raw_data?: Record<string, any>
  created_at?: string
  updated_at?: string
}


/**
 * Convert base64 Data URL to Blob for Supabase storage uploads
 */
export function dataUrlToBlob(dataUrl: string): { blob: Blob; mimeType: string } {
  const parts = dataUrl.split(',')
  const mimeMatch = parts[0].match(/:(.*?);/)
  const mimeType = mimeMatch ? mimeMatch[1] : 'application/octet-stream'
  const bstr = atob(parts[1])
  let n = bstr.length
  const u8arr = new Uint8Array(n)
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }
  return { blob: new Blob([u8arr], { type: mimeType }), mimeType }
}

/**
 * Upload mentor asset (ID card photo or Resume) to Supabase Storage
 */
export async function uploadMentorAsset(
  fileOrDataUrl: string | File | Blob,
  fileName: string,
  folder: 'resumes' | 'id-cards' = 'resumes'
): Promise<string | null> {
  if (!supabase || !isSupabaseConfigured) {
    console.warn(`Supabase not configured. Asset "${fileName}" saved as local reference.`)
    return typeof fileOrDataUrl === 'string' ? fileOrDataUrl : null
  }

  try {
    let fileBlob: Blob
    let contentType = 'application/octet-stream'

    if (fileOrDataUrl instanceof Blob) {
      fileBlob = fileOrDataUrl
      contentType = fileOrDataUrl.type || contentType
    } else if (typeof fileOrDataUrl === 'string' && fileOrDataUrl.startsWith('data:')) {
      const parsed = dataUrlToBlob(fileOrDataUrl)
      fileBlob = parsed.blob
      contentType = parsed.mimeType
    } else if (typeof fileOrDataUrl === 'string') {
      return fileOrDataUrl
    } else {
      return null
    }

    const { data: sessionData } = await supabase.auth.getSession()
    const userId = sessionData.session?.user?.id || 'anonymous'
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
    const filePath = `${folder}/${userId}-${Date.now()}-${safeName}`

    // Try mentor bucket, fallback to students bucket if not yet created
    let targetBucket = MENTOR_BUCKET_NAME
    const { error } = await supabase.storage
      .from(targetBucket)
      .upload(filePath, fileBlob, {
        contentType,
        upsert: true,
      })

    if (error) {
      console.warn(`Could not upload to "${targetBucket}", trying fallback bucket:`, error.message)
      const fallbackResult = await supabase.storage
        .from('Students-assets')
        .upload(filePath, fileBlob, {
          contentType,
          upsert: true,
        })

      if (fallbackResult.error) {
        console.warn('Storage upload error (using data reference):', fallbackResult.error.message)
        return typeof fileOrDataUrl === 'string' ? fileOrDataUrl : null
      }
      targetBucket = 'Students-assets'
    }

    const { data: publicUrlData } = supabase.storage
      .from(targetBucket)
      .getPublicUrl(filePath)

    return publicUrlData.publicUrl || filePath
  } catch (err) {
    console.warn('Failed to upload mentor asset to storage:', err)
    return typeof fileOrDataUrl === 'string' ? fileOrDataUrl : null
  }
}

/**
 * Cache mentor profile in localStorage for instant offline/PWA recall
 */
export function cacheMentorProfile(profile: MentorProfileData, userIdentifier?: string): void {
  try {
    localStorage.setItem(MENTOR_STORAGE_CACHE_KEY, JSON.stringify(profile))
    if (userIdentifier) {
      localStorage.setItem(`${MENTOR_STORAGE_CACHE_KEY}_${userIdentifier}`, JSON.stringify(profile))
    }
  } catch (err) {
    console.warn('Could not cache mentor profile to localStorage:', err)
  }
}

/**
 * Retrieve cached mentor profile from localStorage
 */
export function getCachedMentorProfile(userIdentifier?: string): MentorProfileData | null {
  try {
    if (userIdentifier) {
      const scoped = localStorage.getItem(`${MENTOR_STORAGE_CACHE_KEY}_${userIdentifier}`)
      if (scoped) return JSON.parse(scoped) as MentorProfileData
    }
    const generic = localStorage.getItem(MENTOR_STORAGE_CACHE_KEY)
    if (generic) return JSON.parse(generic) as MentorProfileData
  } catch (err) {
    console.warn('Error reading cached mentor profile:', err)
  }
  return null
}

/**
 * Clear cached mentor profile
 */
export function clearCachedMentorProfile(userIdentifier?: string): void {
  try {
    localStorage.removeItem(MENTOR_STORAGE_CACHE_KEY)
    if (userIdentifier) {
      localStorage.removeItem(`${MENTOR_STORAGE_CACHE_KEY}_${userIdentifier}`)
    }
  } catch (err) {
    console.warn('Error clearing mentor profile cache:', err)
  }
}

/**
 * Helper to check if a string is a valid UUID
 */
function isValidUuid(val?: string | null): boolean {
  if (!val) return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim())
}

/**
 * Save mentor details to Supabase backend and update users role
 */
export async function saveMentorDetails(
  data: MentorProfileData,
  userId?: string,
  userEmail?: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  // Always update local cache first for robust offline PWA experience
  cacheMentorProfile(data, userId || userEmail)

  if (!supabase || !isSupabaseConfigured) {
    return { success: true, data }
  }

  try {
    let targetUserId = userId
    if (!targetUserId) {
      const { data: sessionData } = await supabase.auth.getSession()
      targetUserId = sessionData.session?.user?.id
    }

    const isVerified = data.isVerified ?? false
    const verificationStatus = data.verificationStatus || (isVerified ? 'approved' : 'pending')
    const rejectionReason = data.rejectionReason || null
    const validUserId = isValidUuid(targetUserId) ? targetUserId : undefined

    // 1. Ensure 'users' role is updated to 'mentor' BEFORE inserting into 'Mentor-details'
    // (This satisfies the foreign key constraint: Mentor-details_user_id_fkey)
    if (validUserId) {
      try {
        await supabase
          .from('users')
          .upsert(
            {
              id: validUserId,
              name: data.fullName,
              role: 'mentor',
              email: userEmail || data.email || null,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'id' }
          )
      } catch (err) {
        console.warn('Notice updating user record in users table:', err)
      }
    }

    // 2. Sanitize raw snapshot to avoid duplicating gigantic base64 strings in jsonb
    const sanitizedRaw = {
      ...data,
      idCardPhotoUrl: data.idCardPhotoUrl?.startsWith('data:') ? '[stored-in-db-column]' : data.idCardPhotoUrl,
      resumeUrl: data.resumeUrl?.startsWith('data:') ? '[stored-in-db-column]' : data.resumeUrl,
      isVerified,
      verificationStatus,
      rejectionReason,
      email: userEmail || data.email || null,
      completed_at: new Date().toISOString(),
    }

    // 3. Fallback for non-null constraint columns: id_card_url & resume_url
    const safeIdCardUrl = data.idCardPhotoUrl || 'pending-document-upload'
    const safeResumeUrl = data.resumeUrl || 'pending-document-upload'

    // 4. Construct base database payload matching known columns
    const basePayload: Record<string, any> = {
      ...(validUserId ? { user_id: validUserId } : {}),
      full_name: data.fullName.trim(),
      phone_number: data.phoneNumber.trim(),
      country_code: data.countryCode || '+91',
      working_as: data.workingAs.trim(),
      working_in: data.workingIn.trim(),
      city: data.city.trim(),
      region: data.region.trim(),
      technical_skills: data.technicalSkills || [],
      soft_skills: data.softSkills || [],
      bio: data.bio || '',
      linkedin_url: data.linkedinUrl || '',
      id_card_url: safeIdCardUrl,
      id_card_file_name: data.idCardFileName || null,
      resume_url: safeResumeUrl,
      resume_file_name: data.resumeFileName || null,
      is_verified: isVerified,
      raw_data: sanitizedRaw,
      updated_at: new Date().toISOString(),
    }

    // Keep all mentors cache updated
    upsertMentorToAllCache({
      ...data,
      userId: targetUserId,
      email: userEmail || data.email,
      isVerified,
      verificationStatus,
      rejectionReason,
    })

    // 5. Attempt saving to 'Mentor-details'
    let insertedRow: any = null
    let saveError: any = null

    // Attempt 1: Try upsert with user_id if valid
    if (validUserId) {
      const res = await supabase
        .from(MENTOR_TABLE_NAME)
        .upsert(basePayload, { onConflict: 'user_id' })
        .select()
        .maybeSingle()
      
      if (!res.error && res.data) {
        insertedRow = res.data
      } else {
        saveError = res.error
        console.warn(`Upsert to "${MENTOR_TABLE_NAME}" with user_id failed:`, res.error?.message)
      }
    }

    // Attempt 2: If upsert failed or no user_id, try direct insert
    if (!insertedRow) {
      const res = await supabase
        .from(MENTOR_TABLE_NAME)
        .insert([basePayload])
        .select()
        .maybeSingle()

      if (!res.error && res.data) {
        insertedRow = res.data
        saveError = null
      } else {
        saveError = res.error
        console.warn(`Insert to "${MENTOR_TABLE_NAME}" failed:`, res.error?.message)
      }
    }

    // Attempt 3: If failed due to foreign key constraint (user_id not in users), try without user_id
    if (!insertedRow && saveError && (saveError.code === '23503' || saveError.message?.includes('foreign key'))) {
      console.warn('Retrying insert to "Mentor-details" without user_id foreign key constraint...')
      const fallbackPayload = { ...basePayload }
      delete fallbackPayload.user_id

      const res = await supabase
        .from(MENTOR_TABLE_NAME)
        .insert([fallbackPayload])
        .select()
        .maybeSingle()

      if (!res.error && res.data) {
        insertedRow = res.data
        saveError = null
      } else {
        saveError = res.error
      }
    }

    if (saveError && !insertedRow) {
      console.error(`Final error saving to "${MENTOR_TABLE_NAME}":`, saveError)
      return { success: false, error: saveError.message || 'Database error saving mentor profile', data: basePayload }
    }

    return { success: true, data: insertedRow || basePayload }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error saving mentor profile'
    console.error('Error saving mentor profile:', msg)
    return { success: false, error: msg }
  }
}

/**
 * Fetch mentor details from Supabase backend
 */
export async function getMentorDetails(
  userId?: string,
  userEmail?: string
): Promise<MentorDetailsPayload | null> {
  if (!supabase || !isSupabaseConfigured) {
    return null
  }

  try {
    let targetId = userId
    if (!targetId) {
      const { data: sessionData } = await supabase.auth.getSession()
      targetId = sessionData.session?.user?.id
    }

    if (!targetId && userEmail) {
      const { data: userRec } = await supabase
        .from('users')
        .select('id')
        .eq('email', userEmail)
        .maybeSingle()
      if (userRec?.id) targetId = userRec.id
    }

    // 1. Try finding by user_id
    if (targetId && isValidUuid(targetId)) {
      const { data, error } = await supabase
        .from(MENTOR_TABLE_NAME)
        .select('*')
        .eq('user_id', targetId)
        .maybeSingle()

      if (!error && data) return data as MentorDetailsPayload
    }

    // 2. Try finding by email in raw_data if not found by user_id
    if (userEmail) {
      const { data, error } = await supabase
        .from(MENTOR_TABLE_NAME)
        .select('*')
        .contains('raw_data', { email: userEmail })
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (!error && data) return data as MentorDetailsPayload
    }
  } catch (err) {
    console.warn('Error reading mentor details:', err)
  }

  return null
}

/**
 * Maps a database payload back into a typed MentorProfileData object
 */
export function mapMentorPayloadToProfileData(payload: MentorDetailsPayload): MentorProfileData {
  const raw = payload.raw_data || {}
  const isVerified =
    payload.is_verified !== undefined
      ? Boolean(payload.is_verified)
      : raw.isVerified !== undefined
        ? Boolean(raw.isVerified)
        : false

  const verificationStatus: MentorVerificationStatus =
    payload.verification_status ||
    raw.verificationStatus ||
    (isVerified ? 'approved' : 'pending')

  const rejectionReason = payload.rejection_reason || raw.rejectionReason || null

  return {
    id: payload.id || raw.id,
    userId: payload.user_id || raw.userId,
    fullName: payload.full_name || raw.fullName || '',
    phoneNumber: payload.phone_number || raw.phoneNumber || '',
    countryCode: payload.country_code || raw.countryCode || '+91',
    workingAs: payload.working_as || raw.workingAs || '',
    workingIn: payload.working_in || raw.workingIn || '',
    city: payload.city || raw.city || '',
    region: payload.region || raw.region || '',
    technicalSkills: payload.technical_skills || raw.technicalSkills || [],
    softSkills: payload.soft_skills || raw.softSkills || [],
    bio: payload.bio || raw.bio || '',
    linkedinUrl: payload.linkedin_url || raw.linkedinUrl || '',
    idCardPhotoUrl: payload.id_card_url || raw.idCardPhotoUrl || '',
    idCardFileName: payload.id_card_file_name || raw.idCardFileName || '',
    resumeUrl: payload.resume_url || raw.resumeUrl || '',
    resumeFileName: payload.resume_file_name || raw.resumeFileName || '',
    resumeFileSize: raw.resumeFileSize,
    completedAt: payload.created_at || raw.completedAt,
    isVerified,
    verificationStatus,
    rejectionReason,
    reviewedAt: payload.reviewed_at || raw.reviewedAt || null,
  }
}

export const ALL_MENTORS_CACHE_KEY = 'karkai_all_mentors_list'

/**
 * Helper to upsert a mentor in the all mentors cache
 */
function upsertMentorToAllCache(mentor: MentorProfileData): void {
  try {
    const raw = localStorage.getItem(ALL_MENTORS_CACHE_KEY)
    let list: MentorProfileData[] = raw ? JSON.parse(raw) : []
    const index = list.findIndex(
      (m) =>
        (mentor.userId && m.userId === mentor.userId) ||
        (mentor.email && m.email === mentor.email) ||
        m.fullName === mentor.fullName
    )
    if (index >= 0) {
      list[index] = { ...list[index], ...mentor }
    } else {
      list.unshift(mentor)
    }
    localStorage.setItem(ALL_MENTORS_CACHE_KEY, JSON.stringify(list))
  } catch (e) {
    console.warn('Error updating all mentors cache:', e)
  }
}

/**
 * Fetch all mentor profiles for the Admin Console
 * STRICTLY queries the backend table 'Mentor-details' alone.
 */
export async function getAllMentors(): Promise<MentorProfileData[]> {
  const resultList: MentorProfileData[] = []

  // 1. Fetch solely from Supabase backend table 'Mentor-details'
  if (supabase && isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from(MENTOR_TABLE_NAME)
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error(`Error querying "${MENTOR_TABLE_NAME}" table:`, error.message)
      } else if (Array.isArray(data)) {
        data.forEach((row) => {
          resultList.push(mapMentorPayloadToProfileData(row as MentorDetailsPayload))
        })
        return resultList
      }
    } catch (e) {
      console.error(`Failed to query "${MENTOR_TABLE_NAME}" from Supabase:`, e)
    }
  }

  // 2. Offline fallback ONLY when Supabase connection is unavailable
  const currentCached = getCachedMentorProfile()
  if (currentCached) {
    resultList.push(currentCached)
  }

  return resultList
}

/**
 * Fetch ONLY verified mentor profiles for the Student Dashboard.
 * STRICTLY queries the backend table 'Mentor-details' where is_verified is TRUE.
 */
export async function getVerifiedMentors(): Promise<MentorProfileData[]> {
  const resultList: MentorProfileData[] = []

  // 1. Fetch from Supabase backend table 'Mentor-details' where is_verified = true
  if (supabase && isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from(MENTOR_TABLE_NAME)
        .select('*')
        .eq('is_verified', true)
        .order('created_at', { ascending: false })

      if (error) {
        console.error(`Error querying verified mentors from "${MENTOR_TABLE_NAME}":`, error.message)
      } else if (Array.isArray(data)) {
        data.forEach((row) => {
          const profile = mapMentorPayloadToProfileData(row as MentorDetailsPayload)
          if (profile.isVerified) {
            resultList.push(profile)
          }
        })
        return resultList
      }
    } catch (e) {
      console.error(`Failed to query verified mentors from "${MENTOR_TABLE_NAME}":`, e)
    }
  }

  // 2. Offline fallback ONLY for profiles explicitly marked isVerified === true
  const cachedAll = localStorage.getItem(ALL_MENTORS_CACHE_KEY)
  if (cachedAll) {
    try {
      const parsed: MentorProfileData[] = JSON.parse(cachedAll)
      parsed.forEach((m) => {
        if (m.isVerified && !resultList.some((r) => r.fullName === m.fullName || (r.userId && r.userId === m.userId))) {
          resultList.push(m)
        }
      })
    } catch (err) {
      console.warn('Error reading cached verified mentors:', err)
    }
  }

  const activeMentor = getCachedMentorProfile()
  if (
    activeMentor &&
    activeMentor.isVerified &&
    !resultList.some((r) => r.fullName === activeMentor.fullName || (r.userId && r.userId === activeMentor.userId))
  ) {
    resultList.push(activeMentor)
  }

  // STRICT guarantee: Only return profiles where isVerified === true
  return resultList.filter((m) => Boolean(m.isVerified))
}

/**
 * Update mentor verification status (Approve or Reject with reason)
 * Rewrites the 'is_verified' column in the backend table 'Mentor-details'.
 */
export async function updateMentorVerification(
  identifier: string, // id, userId, or fullName
  isVerified: boolean,
  status: MentorVerificationStatus,
  rejectionReason?: string | null
): Promise<boolean> {
  const now = new Date().toISOString()

  // 1. Rewrite 'is_verified' in Supabase 'Mentor-details' table
  if (supabase && isSupabaseConfigured) {
    try {
      // Find matching mentor row in 'Mentor-details'
      let targetRowId: string | null = null
      let existingRawData: Record<string, any> = {}

      let matchQuery = supabase.from(MENTOR_TABLE_NAME).select('*')
      if (isValidUuid(identifier)) {
        matchQuery = matchQuery.or(`id.eq.${identifier},user_id.eq.${identifier}`)
      } else {
        matchQuery = matchQuery.eq('full_name', identifier)
      }
      const { data: matchedRows } = await matchQuery.limit(1)

      if (matchedRows && matchedRows.length > 0) {
        targetRowId = matchedRows[0].id
        existingRawData = matchedRows[0].raw_data || {}
      }

      const updatedRaw = {
        ...existingRawData,
        isVerified,
        verificationStatus: status,
        rejectionReason: rejectionReason || null,
        reviewedAt: now,
      }

      // Rewrite is_verified column and raw_data in Mentor-details
      let updateQuery = supabase
        .from(MENTOR_TABLE_NAME)
        .update({
          is_verified: isVerified,
          raw_data: updatedRaw,
          updated_at: now,
        })

      if (targetRowId) {
        updateQuery = updateQuery.eq('id', targetRowId)
      } else if (identifier.includes('-') && identifier.length >= 30) {
        updateQuery = updateQuery.or(`id.eq.${identifier},user_id.eq.${identifier}`)
      } else {
        updateQuery = updateQuery.eq('full_name', identifier)
      }

      const { data: updatedRows, error: updateErr } = await updateQuery.select()
      if (updateErr) {
        console.error('Error rewriting is_verified in Mentor-details table:', updateErr.message)
      } else {
        console.log(`Successfully rewrote is_verified=${isVerified} in Mentor-details table:`, updatedRows)
      }
    } catch (err) {
      console.error('Error updating Supabase verification record in Mentor-details:', err)
    }
  }

  // 2. Keep local profile caches in sync for active logged-in mentor
  try {
    const raw = localStorage.getItem(ALL_MENTORS_CACHE_KEY)
    let list: MentorProfileData[] = raw ? JSON.parse(raw) : []

    list = list.map((m) => {
      if (m.userId === identifier || m.id === identifier || m.fullName === identifier || m.email === identifier) {
        return {
          ...m,
          isVerified,
          verificationStatus: status,
          rejectionReason: rejectionReason || null,
          reviewedAt: now,
        }
      }
      return m
    })
    localStorage.setItem(ALL_MENTORS_CACHE_KEY, JSON.stringify(list))

    const activeMentor = getCachedMentorProfile()
    if (
      activeMentor &&
      (activeMentor.fullName === identifier ||
        activeMentor.userId === identifier ||
        activeMentor.id === identifier)
    ) {
      const updatedActive: MentorProfileData = {
        ...activeMentor,
        isVerified,
        verificationStatus: status,
        rejectionReason: rejectionReason || null,
        reviewedAt: now,
      }
      cacheMentorProfile(updatedActive, activeMentor.userId || activeMentor.email)
    }
  } catch (err) {
    console.warn('Error updating local cache for mentor verification:', err)
  }

  return true
}


