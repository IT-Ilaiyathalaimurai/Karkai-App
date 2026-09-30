/**
 * Onboarding Draft Persistence Module
 * 
 * Ensures that if a student or mentor is in the middle of their onboarding flow,
 * any accidental reload, tab close, or app exit will preserve their progress
 * (current step, all entered fields, and uploaded document previews) and resume
 * exactly where they left off.
 */

export interface StudentDraftData {
  currentStep: 'identity' | 'parent-consent' | 'personal' | 'schooling' | 'academic' | 'skills' | 'professional'
  fullName: string
  countryCode: string
  mobileNumber: string
  dateOfBirth: string
  formattedDob: string
  idCardPhotoUrl: string | null
  idCardFileName: string
  isPdf: boolean
  // Parent Consent
  parentName: string
  parentRelationship: 'father' | 'mother' | 'guardian'
  parentMobile: string
  parentConsentGiven: boolean
  // Personal
  gender: string
  city: string
  district: string
  stateName: string
  // Schooling
  tenthSchoolName: string
  tenthMarks: string
  tenthPercentage: string
  twelfthSchoolName: string
  twelfthMarks: string
  twelfthPercentage: string
  mediumOfStudy: 'Tamil Medium' | 'English Medium' | ''
  // Academic
  institutionName: string
  degree: string
  customDegree: string
  branch: string
  currentYear: string
  currentCgpa: string
  // Skills
  selectedSkills: string[]
  selectedSoftSkills: string[]
  learningInterests: string[]
  extracurricularActivities: string[]
  // Documents
  linkedinUrl: string
  resumeFileName: string
  resumeFileSize: string
  resumeUrl: string
  savedAt: string
}

export interface MentorDraftData {
  currentStep: 'information' | 'skills-bio' | 'documents'
  fullName: string
  countryCode: string
  phoneNumber: string
  workingAs: string
  workingIn: string
  city: string
  region: string
  selectedTechSkills: string[]
  selectedSoftSkills: string[]
  bio: string
  linkedinUrl: string
  idCardPhotoUrl: string | null
  idCardFileName: string
  resumeUrl: string | null
  resumeFileName: string
  resumeFileSize: string
  savedAt: string
}

const STORAGE_PREFIX = 'karkai_onboarding_'

function sanitizeKey(userKey?: string): string {
  if (!userKey) return 'guest'
  return userKey.toLowerCase().replace(/[^a-z0-9_-]/g, '_')
}

// -----------------------------------------------------------------------------
// Active Onboarding Role Tracker
// -----------------------------------------------------------------------------
export function setActiveOnboardingRole(userKey: string | undefined, role: 'student' | 'mentor'): void {
  try {
    const key = `${STORAGE_PREFIX}active_role_${sanitizeKey(userKey)}`
    localStorage.setItem(key, role)
    // Also save global active role as fallback
    localStorage.setItem(`${STORAGE_PREFIX}global_active_role`, role)
  } catch (e) {
    console.warn('Failed to set active onboarding role:', e)
  }
}

export function getActiveOnboardingRole(userKey?: string): 'student' | 'mentor' | null {
  try {
    const specificKey = `${STORAGE_PREFIX}active_role_${sanitizeKey(userKey)}`
    const specific = localStorage.getItem(specificKey)
    if (specific === 'student' || specific === 'mentor') return specific

    const globalVal = localStorage.getItem(`${STORAGE_PREFIX}global_active_role`)
    if (globalVal === 'student' || globalVal === 'mentor') return globalVal
    return null
  } catch {
    return null
  }
}

export function clearActiveOnboardingRole(userKey?: string): void {
  try {
    localStorage.removeItem(`${STORAGE_PREFIX}active_role_${sanitizeKey(userKey)}`)
    localStorage.removeItem(`${STORAGE_PREFIX}global_active_role`)
  } catch (e) {
    console.warn('Failed to clear active onboarding role:', e)
  }
}

// -----------------------------------------------------------------------------
// Student Draft Storage
// -----------------------------------------------------------------------------
export function saveStudentDraft(userKey: string | undefined, data: Partial<StudentDraftData>): void {
  try {
    const key = `${STORAGE_PREFIX}student_draft_${sanitizeKey(userKey)}`
    const payload = {
      ...data,
      savedAt: new Date().toISOString(),
    }

    try {
      localStorage.setItem(key, JSON.stringify(payload))
      localStorage.setItem(`${STORAGE_PREFIX}student_draft_latest`, key)
    } catch (_quotaErr) {
      // If quota exceeded (due to large image data URL), strip large data URLs and keep filenames
      console.warn('LocalStorage quota reached. Stripping large asset data URLs from student draft.')
      const safePayload = {
        ...payload,
        idCardPhotoUrl: payload.idCardPhotoUrl?.startsWith('data:') && payload.idCardPhotoUrl.length > 50000 ? null : payload.idCardPhotoUrl,
        resumeUrl: payload.resumeUrl?.startsWith('data:') && payload.resumeUrl.length > 50000 ? '' : payload.resumeUrl,
      }
      localStorage.setItem(key, JSON.stringify(safePayload))
      localStorage.setItem(`${STORAGE_PREFIX}student_draft_latest`, key)
    }
  } catch (e) {
    console.warn('Notice: Could not save student onboarding draft:', e)
  }
}

export function getStudentDraft(userKey?: string): StudentDraftData | null {
  try {
    const key = `${STORAGE_PREFIX}student_draft_${sanitizeKey(userKey)}`
    let raw = localStorage.getItem(key)
    if (!raw) {
      const latestKey = localStorage.getItem(`${STORAGE_PREFIX}student_draft_latest`)
      if (latestKey) {
        raw = localStorage.getItem(latestKey)
      }
    }
    if (!raw) return null
    return JSON.parse(raw) as StudentDraftData
  } catch (e) {
    console.warn('Notice: Could not read student onboarding draft:', e)
    return null
  }
}

export function clearStudentDraft(userKey?: string): void {
  try {
    localStorage.removeItem(`${STORAGE_PREFIX}student_draft_${sanitizeKey(userKey)}`)
    const latestKey = localStorage.getItem(`${STORAGE_PREFIX}student_draft_latest`)
    if (latestKey) {
      localStorage.removeItem(latestKey)
    }
    localStorage.removeItem(`${STORAGE_PREFIX}student_draft_latest`)
  } catch (e) {
    console.warn('Notice: Could not clear student onboarding draft:', e)
  }
}

// -----------------------------------------------------------------------------
// Mentor Draft Storage
// -----------------------------------------------------------------------------
export function saveMentorDraft(userKey: string | undefined, data: Partial<MentorDraftData>): void {
  try {
    const key = `${STORAGE_PREFIX}mentor_draft_${sanitizeKey(userKey)}`
    const payload = {
      ...data,
      savedAt: new Date().toISOString(),
    }

    try {
      localStorage.setItem(key, JSON.stringify(payload))
      localStorage.setItem(`${STORAGE_PREFIX}mentor_draft_latest`, key)
    } catch (_quotaErr) {
      console.warn('LocalStorage quota reached. Stripping large asset data URLs from mentor draft.')
      const safePayload = {
        ...payload,
        idCardPhotoUrl: payload.idCardPhotoUrl?.startsWith('data:') && payload.idCardPhotoUrl.length > 50000 ? null : payload.idCardPhotoUrl,
        resumeUrl: payload.resumeUrl?.startsWith('data:') && payload.resumeUrl.length > 50000 ? null : payload.resumeUrl,
      }
      localStorage.setItem(key, JSON.stringify(safePayload))
      localStorage.setItem(`${STORAGE_PREFIX}mentor_draft_latest`, key)
    }
  } catch (e) {
    console.warn('Notice: Could not save mentor onboarding draft:', e)
  }
}

export function getMentorDraft(userKey?: string): MentorDraftData | null {
  try {
    const key = `${STORAGE_PREFIX}mentor_draft_${sanitizeKey(userKey)}`
    let raw = localStorage.getItem(key)
    if (!raw) {
      const latestKey = localStorage.getItem(`${STORAGE_PREFIX}mentor_draft_latest`)
      if (latestKey) {
        raw = localStorage.getItem(latestKey)
      }
    }
    if (!raw) return null
    return JSON.parse(raw) as MentorDraftData
  } catch (e) {
    console.warn('Notice: Could not read mentor onboarding draft:', e)
    return null
  }
}

export function clearMentorDraft(userKey?: string): void {
  try {
    localStorage.removeItem(`${STORAGE_PREFIX}mentor_draft_${sanitizeKey(userKey)}`)
    const latestKey = localStorage.getItem(`${STORAGE_PREFIX}mentor_draft_latest`)
    if (latestKey) {
      localStorage.removeItem(latestKey)
    }
    localStorage.removeItem(`${STORAGE_PREFIX}mentor_draft_latest`)
  } catch (e) {
    console.warn('Notice: Could not clear mentor onboarding draft:', e)
  }
}
