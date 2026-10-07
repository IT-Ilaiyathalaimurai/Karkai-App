import { supabase, anonSupabase, supabaseUrl, supabaseAnonKey, isSupabaseConfigured } from './supabase'
import type { StudentProfileData } from '../components/Students-Onboarding'

export const STUDENT_TABLE_NAME = 'Student-details'
export const STUDENT_BUCKET_NAME = 'Students-assets'

export interface StudentDetailsPayload {
  id?: string
  user_id?: string
  full_name: string
  mobile_number: string
  country_code: string
  date_of_birth: string
  age: number
  is_minor: boolean
  wing: 'school' | 'senior'
  gender: string
  city: string
  district: string
  state?: string | null

  // School Student Wing: Parent Consent
  parent_name?: string | null
  parent_relationship?: string | null
  parent_mobile?: string | null
  parent_consent_given?: boolean | null

  // Senior Student Wing: Schooling (10th & 12th)
  tenth_school_name?: string | null
  tenth_marks?: string | null
  tenth_percentage?: string | null
  twelfth_school_name?: string | null
  twelfth_marks?: string | null
  twelfth_percentage?: string | null

  // Schooling / Academic: Medium of Study (Tamil Medium or English Medium)
  medium_of_study?: string | null

  // Academic / School Details
  institution_name: string
  degree: string
  custom_degree?: string | null
  branch: string
  current_year: string
  current_cgpa?: string | null

  // Skills & Activities
  skills?: string[]
  soft_skills?: string[]
  learning_interests?: string[]
  extracurricular_activities?: string[]

  // Professional Links (Senior Wing)
  linkedin_url?: string | null
  resume_url?: string | null
  resume_file_name?: string | null

  raw_data?: Record<string, any>
  created_at?: string
  updated_at?: string
}

/**
 * Converts a base64 Data URL to a Blob for uploading to Supabase Storage.
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
 * Upload an asset (e.g. Resume) to the 'Students-assets' Supabase Storage bucket.
 */
export async function uploadAssetToStorage(
  fileOrDataUrl: string | File | Blob,
  fileName: string,
  folder: 'resumes' | 'documents' = 'resumes'
): Promise<string | null> {
  if (!supabase || !isSupabaseConfigured) {
    console.warn(`Supabase is not configured. Asset "${fileName}" not uploaded to "${STUDENT_BUCKET_NAME}".`)
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
      // Already an external URL (e.g. https://... or sample svg)
      return fileOrDataUrl
    } else {
      return null
    }

    // Enforce 100KB limit for resumes
    if (folder === 'resumes' && fileBlob.size > 100 * 1024) {
      console.warn(`Notice: Resume "${fileName}" exceeds maximum 100KB size limit (${(fileBlob.size / 1024).toFixed(1)}KB).`)
      return null
    }

    const { data: sessionData } = await supabase.auth.getSession()
    const userId = sessionData.session?.user?.id || 'anonymous'
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
    const filePath = `${folder}/${userId}-${Date.now()}-${safeName}`

    const { data, error } = await supabase.storage
      .from(STUDENT_BUCKET_NAME)
      .upload(filePath, fileBlob, {
        contentType,
        upsert: true,
      })

    if (error) {
      console.warn(`Notice: Could not upload to bucket "${STUDENT_BUCKET_NAME}":`, error.message)
      return typeof fileOrDataUrl === 'string' ? fileOrDataUrl : null
    }

    const { data: publicUrlData } = supabase.storage
      .from(STUDENT_BUCKET_NAME)
      .getPublicUrl(data.path)

    return publicUrlData.publicUrl
  } catch (err) {
    console.warn(`Notice: Asset upload failed to "${STUDENT_BUCKET_NAME}":`, err)
    return typeof fileOrDataUrl === 'string' ? fileOrDataUrl : null
  }
}

/**
 * Save all student onboarding details for both Senior Student Wing and School Student Wing
 * into the Supabase table 'Student-details', uploading assets (resume) to 'Students-assets'.
 * NOTE: ID card is kept client-side only (for DOB verification) and NOT saved to backend.
 */
export async function saveStudentDetails(
  studentData: StudentProfileData,
  explicitUserId?: string,
  explicitEmail?: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  // Always cache locally for immediate access and offline resilience
  cacheStudentProfile(studentData, explicitUserId || explicitEmail)

  if (!supabase || !isSupabaseConfigured) {
    console.warn('Supabase is not configured. Student onboarding details stored locally only.')
    return { success: true, data: studentData }
  }

  try {
    // 1. Resolve current user ID & email from session if available
    let userId = explicitUserId
    let userEmail = explicitEmail
    if (!userId || !userEmail) {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!userId) userId = sessionData.session?.user?.id
      if (!userEmail) userEmail = sessionData.session?.user?.email
    }

    // 2. Upload Resume if available as data URL
    let uploadedResumeUrl = studentData.resumeUrl
    if (studentData.resumeUrl && studentData.resumeUrl.startsWith('data:')) {
      const resumeName = studentData.resumeFileName || 'resume.pdf'
      const uploadRes = await uploadAssetToStorage(studentData.resumeUrl, resumeName, 'resumes')
      if (uploadRes) uploadedResumeUrl = uploadRes
    }

    // 3. Sanitize raw snapshot without large ID card image/data URL
    const { idCardPhotoUrl: _discardPhoto, ...sanitizedRawData } = (studentData as Record<string, any>) || {}
    if (userEmail) {
      sanitizedRawData.email = userEmail
    }

    // 4. Construct comprehensive payload for 'Student-details' table (without ID card fields)
    const payload: StudentDetailsPayload = {
      ...(userId ? { user_id: userId } : {}),
      full_name: studentData.fullName,
      mobile_number: studentData.mobileNumber,
      country_code: studentData.countryCode,
      date_of_birth: studentData.dateOfBirth,
      age: studentData.age,
      is_minor: studentData.isMinor,
      wing: studentData.isMinor ? 'school' : 'senior',
      gender: studentData.gender,
      city: studentData.city,
      district: studentData.district,
      state: studentData.state || null,

      // School Student Wing: Parent Consent
      parent_name: studentData.parentConsent?.parentName || null,
      parent_relationship: studentData.parentConsent?.relationship || null,
      parent_mobile: studentData.parentConsent?.parentMobile || null,
      parent_consent_given: studentData.parentConsent?.consentGiven ?? null,

      // Senior Student Wing: Schooling (10th & 12th)
      tenth_school_name: studentData.tenthSchoolName || null,
      tenth_marks: studentData.tenthMarks || null,
      tenth_percentage: studentData.tenthPercentage || null,
      twelfth_school_name: studentData.twelfthSchoolName || null,
      twelfth_marks: studentData.twelfthMarks || null,
      twelfth_percentage: studentData.twelfthPercentage || null,

      // Medium of Study (Tamil Medium or English Medium)
      medium_of_study: studentData.mediumOfStudy || null,

      // Academic Details (School or College)
      institution_name: studentData.institutionName,
      degree: studentData.degree,
      custom_degree: studentData.customDegree || null,
      branch: studentData.branch,
      current_year: studentData.currentYear,
      current_cgpa: studentData.currentCgpa || null,

      // Skills & Extracurricular
      skills: studentData.skills || [],
      soft_skills: studentData.softSkills || [],
      learning_interests: studentData.learningInterests || [],
      extracurricular_activities: studentData.extracurricularActivities || [],

      // Professional Links (Senior Wing)
      linkedin_url: studentData.linkedinUrl || null,
      resume_url: uploadedResumeUrl || null,
      resume_file_name: studentData.resumeFileName || null,

      // Sanitized raw snapshot backup (ID card excluded)
      raw_data: sanitizedRawData,
      updated_at: new Date().toISOString(),
    }

    // 5. Upsert or Insert into 'Student-details' table
    let query = supabase.from(STUDENT_TABLE_NAME)
    let result

    if (userId) {
      result = await query.upsert(payload, { onConflict: 'user_id' }).select()
    } else {
      result = await query.insert(payload).select()
    }

    if (result.error) {
      console.warn(`Note: Could not save to "${STUDENT_TABLE_NAME}" table:`, result.error.message)
      // Retry plain insert if onConflict failed
      const retryRes = await supabase.from(STUDENT_TABLE_NAME).insert(payload).select()
      if (!retryRes.error) {
        return { success: true, data: retryRes.data?.[0] || payload }
      }
      return { success: false, error: result.error.message, data: payload }
    }

    return { success: true, data: result.data?.[0] || payload }
  } catch (err: any) {
    const errorMsg = err?.message || String(err)
    console.warn(`Error in saveStudentDetails:`, errorMsg)
    return { success: false, error: errorMsg }
  }
}

/**
 * Update and overwrite existing student details in Supabase and local cache.
 */
export async function updateStudentProfile(
  studentData: StudentProfileData,
  explicitUserId?: string,
  explicitEmail?: string
): Promise<{ success: boolean; data?: StudentProfileData; error?: string }> {
  // Always update local cache immediately
  cacheStudentProfile(studentData, explicitUserId || explicitEmail)

  if (!supabase || !isSupabaseConfigured) {
    return { success: true, data: studentData }
  }

  try {
    let userId = explicitUserId
    let userEmail = explicitEmail
    if (!userId || !userEmail) {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!userId) userId = sessionData.session?.user?.id
      if (!userEmail) userEmail = sessionData.session?.user?.email
    }

    // 1. Upload new resume if it's a new data URL
    let uploadedResumeUrl = studentData.resumeUrl
    if (studentData.resumeUrl && studentData.resumeUrl.startsWith('data:')) {
      const resumeName = studentData.resumeFileName || 'resume.pdf'
      const uploadRes = await uploadAssetToStorage(studentData.resumeUrl, resumeName, 'resumes')
      if (uploadRes) uploadedResumeUrl = uploadRes
    }

    const { idCardPhotoUrl: _discardPhoto, ...sanitizedRawData } = (studentData as Record<string, any>) || {}
    if (userEmail) {
      sanitizedRawData.email = userEmail
    }

    const now = new Date().toISOString()
    const payload: Partial<StudentDetailsPayload> = {
      ...(userId ? { user_id: userId } : {}),
      full_name: studentData.fullName.trim(),
      mobile_number: studentData.mobileNumber.trim(),
      country_code: studentData.countryCode || '+91',
      date_of_birth: studentData.dateOfBirth,
      age: studentData.age,
      is_minor: studentData.isMinor,
      wing: studentData.isMinor ? 'school' : 'senior',
      gender: studentData.gender,
      city: studentData.city.trim(),
      district: studentData.district.trim(),
      state: studentData.state || null,

      parent_name: studentData.parentConsent?.parentName || null,
      parent_relationship: studentData.parentConsent?.relationship || null,
      parent_mobile: studentData.parentConsent?.parentMobile || null,
      parent_consent_given: studentData.parentConsent?.consentGiven ?? null,

      tenth_school_name: studentData.tenthSchoolName || null,
      tenth_marks: studentData.tenthMarks || null,
      tenth_percentage: studentData.tenthPercentage || null,
      twelfth_school_name: studentData.twelfthSchoolName || null,
      twelfth_marks: studentData.twelfthMarks || null,
      twelfth_percentage: studentData.twelfthPercentage || null,
      medium_of_study: studentData.mediumOfStudy || null,

      institution_name: studentData.institutionName.trim(),
      degree: studentData.degree,
      custom_degree: studentData.customDegree || null,
      branch: studentData.branch,
      current_year: studentData.currentYear,
      current_cgpa: studentData.currentCgpa || null,

      skills: studentData.skills || [],
      soft_skills: studentData.softSkills || [],
      learning_interests: studentData.learningInterests || [],
      extracurricular_activities: studentData.extracurricularActivities || [],

      linkedin_url: studentData.linkedinUrl || null,
      resume_url: uploadedResumeUrl || null,
      resume_file_name: studentData.resumeFileName || null,

      raw_data: {
        ...sanitizedRawData,
        resumeUrl: uploadedResumeUrl,
        updated_at: now,
      },
      updated_at: now,
    }

    // 2. Overwrite in 'Student-details' table
    let updatedRow: any = null
    const existingId = (studentData as any).id

    if (existingId) {
      const res = await supabase.from(STUDENT_TABLE_NAME).update(payload).eq('id', existingId).select()
      if (!res.error && res.data && res.data.length > 0) {
        updatedRow = res.data[0]
      }
    }

    if (!updatedRow && userId) {
      const res = await supabase.from(STUDENT_TABLE_NAME).update(payload).eq('user_id', userId).select()
      if (!res.error && res.data && res.data.length > 0) {
        updatedRow = res.data[0]
      }
    }

    if (!updatedRow) {
      const res = await supabase.from(STUDENT_TABLE_NAME).update(payload).eq('full_name', studentData.fullName).select()
      if (!res.error && res.data && res.data.length > 0) {
        updatedRow = res.data[0]
      }
    }

    // If no row existed to update, fallback to saveStudentDetails
    if (!updatedRow) {
      const saveRes = await saveStudentDetails({ ...studentData, resumeUrl: uploadedResumeUrl }, userId, userEmail)
      return { success: saveRes.success, data: saveRes.data, error: saveRes.error }
    }

    // Update users table name
    if (userId) {
      await supabase.from('users').update({ name: studentData.fullName, updated_at: now }).eq('id', userId)
    }

    const updatedProfile = mapStudentPayloadToProfileData(updatedRow)
    cacheStudentProfile(updatedProfile, userId || userEmail)
    return { success: true, data: updatedProfile }
  } catch (err: any) {
    const errorMsg = err?.message || String(err)
    console.error('Error in updateStudentProfile:', errorMsg)
    return { success: false, error: errorMsg }
  }
}

/**
 * Convert a Supabase 'Student-details' database row into a complete StudentProfileData object.
 */
export function mapStudentPayloadToProfileData(payload: StudentDetailsPayload): StudentProfileData {
  const raw = payload.raw_data || {}

  const isMinor =
    typeof payload.is_minor === 'boolean'
      ? payload.is_minor
      : payload.wing === 'school' || (payload.age ? payload.age < 18 : false)

  return {
    fullName: payload.full_name || raw.fullName || '',
    mobileNumber: payload.mobile_number || raw.mobileNumber || '',
    countryCode: payload.country_code || raw.countryCode || '+91',
    dateOfBirth: payload.date_of_birth || raw.dateOfBirth || '',
    age: payload.age || raw.age || 0,
    isMinor,
    idCardPhotoUrl: raw.idCardPhotoUrl || '',
    idCardFileName: raw.idCardFileName,
    gender: payload.gender || raw.gender || 'Not specified',
    city: payload.city || raw.city || '',
    district: payload.district || raw.district || '',
    state: payload.state || raw.state || 'Tamil Nadu',

    // School Student Wing: Parent Consent
    parentConsent:
      payload.parent_name || raw.parentConsent
        ? {
            parentName: payload.parent_name || raw.parentConsent?.parentName || '',
            relationship: (payload.parent_relationship ||
              raw.parentConsent?.relationship ||
              'father') as any,
            parentMobile: payload.parent_mobile || raw.parentConsent?.parentMobile || '',
            consentGiven: payload.parent_consent_given ?? raw.parentConsent?.consentGiven ?? true,
          }
        : undefined,

    // Senior Student Wing: Schooling (10th & 12th)
    tenthSchoolName: payload.tenth_school_name || raw.tenthSchoolName,
    tenthMarks: payload.tenth_marks || raw.tenthMarks,
    tenthPercentage: payload.tenth_percentage || raw.tenthPercentage,
    twelfthSchoolName: payload.twelfth_school_name || raw.twelfthSchoolName,
    twelfthMarks: payload.twelfth_marks || raw.twelfthMarks,
    twelfthPercentage: payload.twelfth_percentage || raw.twelfthPercentage,

    // Medium of Study
    mediumOfStudy: payload.medium_of_study || raw.mediumOfStudy || 'Tamil Medium',

    // Academic / School Details
    institutionName: payload.institution_name || raw.institutionName || '',
    degree: payload.degree || raw.degree || '',
    customDegree: payload.custom_degree || raw.customDegree,
    branch: payload.branch || raw.branch || '',
    currentYear: payload.current_year || raw.currentYear || '',
    currentCgpa: payload.current_cgpa || raw.currentCgpa,

    // Skills & Activities
    skills: payload.skills || raw.skills || [],
    softSkills: payload.soft_skills || raw.softSkills || [],
    learningInterests: payload.learning_interests || raw.learningInterests || [],
    extracurricularActivities: payload.extracurricular_activities || raw.extracurricularActivities || [],

    // Links & Documents
    linkedinUrl: payload.linkedin_url || raw.linkedinUrl,
    resumeUrl: payload.resume_url || raw.resumeUrl,
    resumeFileName: payload.resume_file_name || raw.resumeFileName,
  }
}

/**
 * Cache student profile to localStorage for offline resilience & fast startup.
 */
export function cacheStudentProfile(profile: StudentProfileData, userKey?: string) {
  try {
    if (!profile) return
    const key = userKey ? `karkai_student_profile_${userKey}` : 'karkai_student_profile_latest'
    localStorage.setItem(key, JSON.stringify(profile))
    localStorage.setItem('karkai_student_profile_latest', JSON.stringify(profile))
  } catch (e) {
    console.warn('Could not cache student profile to localStorage:', e)
  }
}

/**
 * Retrieve cached student profile from localStorage.
 */
export function getCachedStudentProfile(userKey?: string): StudentProfileData | null {
  try {
    if (userKey) {
      const data = localStorage.getItem(`karkai_student_profile_${userKey}`)
      if (data) return JSON.parse(data)
    }
    const latest = localStorage.getItem('karkai_student_profile_latest')
    if (latest) return JSON.parse(latest)
  } catch (e) {
    console.warn('Could not read cached student profile:', e)
  }
  return null
}

/**
 * Clear cached student profile from localStorage upon sign out.
 */
export function clearCachedStudentProfile(userKey?: string) {
  try {
    if (userKey) {
      localStorage.removeItem(`karkai_student_profile_${userKey}`)
    }
    localStorage.removeItem('karkai_student_profile_latest')
    localStorage.removeItem('karkai_user_session')
  } catch (e) {
    console.warn('Could not clear cached student profile:', e)
  }
}

/**
 * Fetch student details from the 'Student-details' table.
 * Supports querying by user ID or user email.
 */
export async function getStudentDetails(
  userId?: string,
  userEmail?: string
): Promise<StudentDetailsPayload | null> {
  // If Supabase is not configured, fall back directly to cached data
  if (!supabase || !isSupabaseConfigured) {
    const cached = getCachedStudentProfile(userId || userEmail)
    if (cached) {
      return {
        full_name: cached.fullName,
        mobile_number: cached.mobileNumber,
        country_code: cached.countryCode,
        date_of_birth: cached.dateOfBirth,
        age: cached.age,
        is_minor: cached.isMinor,
        wing: cached.isMinor ? 'school' : 'senior',
        gender: cached.gender,
        city: cached.city,
        district: cached.district,
        institution_name: cached.institutionName,
        degree: cached.degree,
        branch: cached.branch,
        current_year: cached.currentYear,
        raw_data: cached as any,
      }
    }
    return null
  }

  try {
    let resolvedUserId = userId
    let resolvedEmail = userEmail

    if (!resolvedUserId && !resolvedEmail) {
      const { data: sessionData } = await supabase.auth.getSession()
      resolvedUserId = sessionData.session?.user?.id
      resolvedEmail = sessionData.session?.user?.email
    }

    // 1. First priority: Query by user_id
    if (resolvedUserId) {
      const { data, error } = await supabase
        .from(STUDENT_TABLE_NAME)
        .select('*')
        .eq('user_id', resolvedUserId)
        .maybeSingle()

      if (!error && data) {
        return data as StudentDetailsPayload
      }
    }

    // 2. Second priority: Query by email in raw_data JSONB if userEmail is known
    if (resolvedEmail) {
      try {
        const { data: emailData, error: emailError } = await supabase
          .from(STUDENT_TABLE_NAME)
          .select('*')
          .filter('raw_data->>email', 'eq', resolvedEmail)
          .limit(1)

        if (!emailError && emailData && emailData.length > 0) {
          return emailData[0] as StudentDetailsPayload
        }
      } catch (err) {
        console.warn('Could not filter by raw_data->>email:', err)
      }
    }

    // 3. Fallback: check local storage cache
    const cached = getCachedStudentProfile(resolvedUserId || resolvedEmail)
    if (cached) {
      return {
        full_name: cached.fullName,
        mobile_number: cached.mobileNumber,
        country_code: cached.countryCode,
        date_of_birth: cached.dateOfBirth,
        age: cached.age,
        is_minor: cached.isMinor,
        wing: cached.isMinor ? 'school' : 'senior',
        gender: cached.gender,
        city: cached.city,
        district: cached.district,
        institution_name: cached.institutionName,
        degree: cached.degree,
        branch: cached.branch,
        current_year: cached.currentYear,
        raw_data: cached as any,
      }
    }

    return null
  } catch (err) {
    console.warn(`Error fetching student details:`, err)
    return null
  }
}

/**
 * Normalizes a raw Student-details record (merging top-level table columns with raw_data JSONB).
 */
export function normalizeStudentPayload(raw: any): StudentDetailsPayload | null {
  if (!raw) return null
  const rd = raw.raw_data && typeof raw.raw_data === 'object' ? raw.raw_data : {}
  const parentConsent = rd.parentConsent && typeof rd.parentConsent === 'object' ? rd.parentConsent : {}

  const isMinorVal =
    raw.is_minor !== undefined && raw.is_minor !== null
      ? Boolean(raw.is_minor)
      : rd.isMinor !== undefined && rd.isMinor !== null
      ? Boolean(rd.isMinor)
      : raw.age
      ? Number(raw.age) < 18
      : false

  const wingVal =
    raw.wing ||
    (isMinorVal ? 'school' : rd.wing || (rd.institutionName?.toLowerCase().includes('school') ? 'school' : 'senior'))

  return {
    id: raw.id || rd.id,
    user_id: raw.user_id || rd.userId || rd.user_id,
    full_name: raw.full_name || rd.fullName || rd.full_name || 'Student',
    mobile_number: raw.mobile_number || rd.mobileNumber || rd.mobile_number || '',
    country_code: raw.country_code || rd.countryCode || rd.country_code || '+91',
    date_of_birth: raw.date_of_birth || rd.dateOfBirth || rd.date_of_birth || '',
    age: Number(raw.age || rd.age || 0),
    is_minor: isMinorVal,
    wing: wingVal,
    gender: raw.gender || rd.gender || '',
    city: raw.city || rd.city || '',
    district: raw.district || rd.district || '',
    state: raw.state || rd.state || 'Tamil Nadu',

    // School Wing: Parent Consent
    parent_name: raw.parent_name || parentConsent.parentName || rd.parentName || null,
    parent_relationship: raw.parent_relationship || parentConsent.relationship || rd.parentRelationship || null,
    parent_mobile: raw.parent_mobile || parentConsent.parentMobile || rd.parentMobile || null,
    parent_consent_given:
      raw.parent_consent_given !== undefined && raw.parent_consent_given !== null
        ? raw.parent_consent_given
        : parentConsent.consentGiven !== undefined && parentConsent.consentGiven !== null
        ? parentConsent.consentGiven
        : rd.parentConsentGiven ?? null,

    // Senior Wing: Schooling (10th & 12th)
    tenth_school_name: raw.tenth_school_name || rd.tenthSchoolName || null,
    tenth_marks: raw.tenth_marks || rd.tenthMarks || null,
    tenth_percentage: raw.tenth_percentage || rd.tenthPercentage || null,
    twelfth_school_name: raw.twelfth_school_name || rd.twelfthSchoolName || null,
    twelfth_marks: raw.twelfth_marks || rd.twelfthMarks || null,
    twelfth_percentage: raw.twelfth_percentage || rd.twelfthPercentage || null,

    medium_of_study: raw.medium_of_study || rd.mediumOfStudy || null,

    // Academic / School Details
    institution_name: raw.institution_name || rd.institutionName || 'Not specified',
    degree: raw.degree || rd.degree || (isMinorVal ? 'School Student' : 'College Student'),
    custom_degree: raw.custom_degree || rd.customDegree || null,
    branch: raw.branch || rd.branch || '',
    current_year: raw.current_year || rd.currentYear || '',
    current_cgpa: raw.current_cgpa || rd.currentCgpa || rd.cgpa || null,

    // Skills & Activities
    skills:
      Array.isArray(raw.skills) && raw.skills.length > 0
        ? raw.skills
        : Array.isArray(rd.skills) && rd.skills.length > 0
        ? rd.skills
        : [],
    soft_skills:
      Array.isArray(raw.soft_skills) && raw.soft_skills.length > 0
        ? raw.soft_skills
        : Array.isArray(rd.softSkills) && rd.softSkills.length > 0
        ? rd.softSkills
        : [],
    learning_interests:
      Array.isArray(raw.learning_interests) && raw.learning_interests.length > 0
        ? raw.learning_interests
        : Array.isArray(rd.learningInterests) && rd.learningInterests.length > 0
        ? rd.learningInterests
        : [],
    extracurricular_activities:
      Array.isArray(raw.extracurricular_activities) && raw.extracurricular_activities.length > 0
        ? raw.extracurricular_activities
        : Array.isArray(rd.extracurricularActivities) && rd.extracurricularActivities.length > 0
        ? rd.extracurricularActivities
        : [],

    linkedin_url: raw.linkedin_url || rd.linkedinUrl || null,
    resume_url: raw.resume_url || rd.resumeUrl || null,
    resume_file_name: raw.resume_file_name || rd.resumeFileName || null,
    raw_data: rd,
    created_at: raw.created_at,
    updated_at: raw.updated_at,
  }
}

/**
 * Fetch helper directly via Supabase REST API using anon headers
 * (so auth.uid() is NULL, which matches RLS: auth.uid() = user_id OR auth.uid() IS NULL)
 */
async function fetchStudentAnonRest(queryString: string): Promise<any[] | null> {
  if (!supabaseUrl || !supabaseAnonKey) return null
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/${STUDENT_TABLE_NAME}?${queryString}`, {
      method: 'GET',
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
      },
    })
    if (!res.ok) return null
    const json = await res.json()
    return Array.isArray(json) ? json : null
  } catch {
    return null
  }
}

/**
 * Fetch full student profile for a mentor reviewing a request.
 * Tries querying by user_id, id, full_name, or cached local profile.
 * Uses unauthenticated client & anon REST headers so the mentor's JWT does not block reads via RLS.
 */
export async function getStudentProfileForMentor(
  userId?: string | null,
  studentName?: string | null
): Promise<StudentDetailsPayload | null> {
  const fallbackCached = () => {
    const cached = getCachedStudentProfile(userId || studentName || undefined)
    if (cached) {
      return normalizeStudentPayload({
        full_name: cached.fullName,
        mobile_number: cached.mobileNumber,
        country_code: cached.countryCode,
        date_of_birth: cached.dateOfBirth,
        age: cached.age,
        is_minor: cached.isMinor,
        wing: cached.isMinor ? 'school' : 'senior',
        gender: cached.gender,
        city: cached.city,
        district: cached.district,
        state: cached.state || 'Tamil Nadu',
        institution_name: cached.institutionName,
        degree: cached.degree,
        branch: cached.branch,
        current_year: cached.currentYear,
        current_cgpa: (cached as any).currentCgpa || (cached as any).cgpa,
        skills: cached.skills,
        soft_skills: cached.softSkills,
        learning_interests: cached.learningInterests,
        extracurricular_activities: cached.extracurricularActivities,
        linkedin_url: (cached as any).linkedinUrl,
        resume_url: (cached as any).resumeUrl,
        parent_name: (cached as any).parentName,
        parent_relationship: (cached as any).parentRelationship,
        parent_mobile: (cached as any).parentMobile,
        parent_consent_given: (cached as any).parentConsentGiven,
        tenth_school_name: (cached as any).tenthSchoolName,
        tenth_marks: (cached as any).tenthMarks,
        tenth_percentage: (cached as any).tenthPercentage,
        twelfth_school_name: (cached as any).twelfthSchoolName,
        twelfth_marks: (cached as any).twelfthMarks,
        twelfth_percentage: (cached as any).twelfthPercentage,
        medium_of_study: (cached as any).mediumOfStudy,
        raw_data: cached as any,
      })
    }
    return null
  }

  const clientToUse = anonSupabase || supabase

  if (!isSupabaseConfigured) {
    return fallbackCached()
  }

  try {
    // 1. Try querying by user_id or id
    if (userId && userId.trim()) {
      const cleanUserId = userId.trim()

      // 1a. Try unauthenticated REST API
      const restUserMatch = await fetchStudentAnonRest(`user_id=eq.${encodeURIComponent(cleanUserId)}&select=*`)
      if (restUserMatch && restUserMatch.length > 0) {
        return normalizeStudentPayload(restUserMatch[0])
      }

      // 1b. Try id = cleanUserId
      const restIdMatch = await fetchStudentAnonRest(`id=eq.${encodeURIComponent(cleanUserId)}&select=*`)
      if (restIdMatch && restIdMatch.length > 0) {
        return normalizeStudentPayload(restIdMatch[0])
      }

      // 1c. Try via clientToUse
      if (clientToUse) {
        const { data, error } = await clientToUse
          .from(STUDENT_TABLE_NAME)
          .select('*')
          .eq('user_id', cleanUserId)
          .maybeSingle()
        if (!error && data) return normalizeStudentPayload(data)

        const { data: byId } = await clientToUse
          .from(STUDENT_TABLE_NAME)
          .select('*')
          .eq('id', cleanUserId)
          .maybeSingle()
        if (byId) return normalizeStudentPayload(byId)
      }
    }

    // 2. Try querying by student full_name
    if (studentName && studentName.trim()) {
      const cleanName = studentName.trim()

      // 2a. Direct anon REST exact match
      const restNameMatch = await fetchStudentAnonRest(`full_name=ilike.${encodeURIComponent(cleanName)}&select=*`)
      if (restNameMatch && restNameMatch.length > 0) {
        return normalizeStudentPayload(restNameMatch[0])
      }

      // 2b. Direct anon REST wildcard match (e.g. *Tharun*)
      const restWildcardMatch = await fetchStudentAnonRest(`full_name=ilike.*${encodeURIComponent(cleanName)}*&select=*`)
      if (restWildcardMatch && restWildcardMatch.length > 0) {
        return normalizeStudentPayload(restWildcardMatch[0])
      }

      // 2c. Direct anon REST first name wildcard
      const firstName = cleanName.split(' ')[0]
      if (firstName && firstName.length >= 3) {
        const restFirstMatch = await fetchStudentAnonRest(`full_name=ilike.*${encodeURIComponent(firstName)}*&select=*`)
        if (restFirstMatch && restFirstMatch.length > 0) {
          return normalizeStudentPayload(restFirstMatch[0])
        }
      }

      // 2d. Try clientToUse
      if (clientToUse) {
        const { data } = await clientToUse
          .from(STUDENT_TABLE_NAME)
          .select('*')
          .ilike('full_name', cleanName)
          .limit(1)
        if (data && data.length > 0) return normalizeStudentPayload(data[0])

        const { data: dataWild } = await clientToUse
          .from(STUDENT_TABLE_NAME)
          .select('*')
          .ilike('full_name', `%${cleanName}%`)
          .limit(1)
        if (dataWild && dataWild.length > 0) return normalizeStudentPayload(dataWild[0])
      }
    }

    // 3. Fallback: Fetch all student rows via REST or client and match in-memory
    const allStudents =
      (await fetchStudentAnonRest('select=*&limit=100')) ||
      (clientToUse ? (await clientToUse.from(STUDENT_TABLE_NAME).select('*').limit(100)).data : null)

    if (allStudents && allStudents.length > 0) {
      if (userId) {
        const matchedById = allStudents.find((s: any) => s.user_id === userId || s.id === userId)
        if (matchedById) return normalizeStudentPayload(matchedById)
      }
      if (studentName && studentName.trim()) {
        const lowerSearch = studentName.trim().toLowerCase()
        const matchedByName = allStudents.find((s: any) => {
          const sName = (s.full_name || s.raw_data?.fullName || '').toLowerCase()
          return sName === lowerSearch || sName.includes(lowerSearch) || lowerSearch.includes(sName)
        })
        if (matchedByName) return normalizeStudentPayload(matchedByName)
      }
    }

    // 4. Fallback: check cached student profile
    return fallbackCached()
  } catch (err) {
    console.warn('Error in getStudentProfileForMentor:', err)
    return fallbackCached()
  }
}

/**
 * Fetch all students from the 'Student-details' table for Admin User Management.
 * Queries directly ordered by created_at descending.
 */
export async function getAllStudents(): Promise<StudentDetailsPayload[]> {
  const resultList: StudentDetailsPayload[] = []

  // 1. Try anon REST endpoint
  const restData = await fetchStudentAnonRest('select=*&order=created_at.desc')
  if (Array.isArray(restData) && restData.length > 0) {
    restData.forEach((row) => {
      const normalized = normalizeStudentPayload(row)
      if (normalized) resultList.push(normalized)
    })
    return resultList
  }

  // 2. Try Supabase client (anon or primary)
  const clientToUse = anonSupabase || supabase
  if (clientToUse && isSupabaseConfigured) {
    try {
      const { data, error } = await clientToUse
        .from(STUDENT_TABLE_NAME)
        .select('*')
        .order('created_at', { ascending: false })

      if (!error && Array.isArray(data)) {
        data.forEach((row) => {
          const normalized = normalizeStudentPayload(row)
          if (normalized) resultList.push(normalized)
        })
        return resultList
      }
    } catch (e) {
      console.warn('Error querying all students:', e)
    }
  }

  // 3. Fallback: Check cached student profile
  const cached = getCachedStudentProfile()
  if (cached) {
    const normalized = normalizeStudentPayload(cached)
    if (normalized) resultList.push(normalized)
  }

  return resultList
}

/**
 * SQL Schema definition for the 'Student-details' table and 'Students-assets' storage bucket.
 * This can be run in the Supabase SQL Editor.
 */
export const STUDENT_DETAILS_SQL = `
-- 1. Create the 'Student-details' table
CREATE TABLE IF NOT EXISTS "Student-details" (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  mobile_number TEXT,
  country_code TEXT DEFAULT '+91',
  date_of_birth TEXT,
  age INTEGER,
  is_minor BOOLEAN DEFAULT FALSE,
  wing TEXT NOT NULL, -- 'school' or 'senior'
  gender TEXT,
  city TEXT,
  district TEXT,
  state TEXT,
  
  -- School Student Wing: Parent Consent
  parent_name TEXT,
  parent_relationship TEXT,
  parent_mobile TEXT,
  parent_consent_given BOOLEAN,
  
  -- Senior Student Wing: Schooling (10th & 12th)
  tenth_school_name TEXT,
  tenth_marks TEXT,
  tenth_percentage TEXT,
  twelfth_school_name TEXT,
  twelfth_marks TEXT,
  twelfth_percentage TEXT,
  medium_of_study TEXT, -- 'Tamil Medium' or 'English Medium'
  
  -- Academic / School Details
  institution_name TEXT,
  degree TEXT,
  custom_degree TEXT,
  branch TEXT,
  current_year TEXT,
  current_cgpa TEXT,
  
  -- Skills & Activities
  skills JSONB DEFAULT '[]'::jsonb,
  soft_skills JSONB DEFAULT '[]'::jsonb,
  learning_interests JSONB DEFAULT '[]'::jsonb,
  extracurricular_activities JSONB DEFAULT '[]'::jsonb,
  
  -- Professional Links (Senior Wing)
  linkedin_url TEXT,
  resume_url TEXT,
  resume_file_name TEXT,
  
  raw_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_student_user_id UNIQUE (user_id)
);

-- Enable Row Level Security (RLS)
ALTER TABLE "Student-details" ENABLE ROW LEVEL SECURITY;

-- Allow users to manage their own student profile
CREATE POLICY "Users can manage own student details"
  ON "Student-details"
  FOR ALL
  USING (auth.uid() = user_id OR auth.uid() IS NULL)
  WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL);

-- Allow authenticated users (such as mentors) to read student profiles
CREATE POLICY "Allow read student profiles"
  ON "Student-details"
  FOR SELECT
  USING (true);

-- 2. Create the 'Students-assets' storage bucket (if not already existing)
INSERT INTO storage.buckets (id, name, public)
VALUES ('Students-assets', 'Students-assets', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage Policy: allow public reads
CREATE POLICY "Public Read Students Assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'Students-assets');

-- Storage Policy: allow authenticated & anon uploads
CREATE POLICY "Allow Upload Students Assets"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'Students-assets');
`
