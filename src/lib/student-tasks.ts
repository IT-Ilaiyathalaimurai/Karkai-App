import { supabase, isSupabaseConfigured } from './supabase'

export interface NewWordEntry {
  id: string
  word: string
  meaning: string
}

export interface VoiceJournalEntry {
  id: string
  student_id?: string
  student_email?: string
  student_name?: string
  article_title: string
  audio_url: string
  audio_duration: number // in seconds
  new_words: NewWordEntry[]
  key_learnings: string
  task_date: string // YYYY-MM-DD
  created_at: string
}

export interface WeekDayStatus {
  dayName: string // 'M', 'T', 'W', 'T', 'F', 'S', 'S'
  dayNumber: number // 1..31
  dateStr: string // YYYY-MM-DD
  isCompleted: boolean
  isToday: boolean
}

export interface StreakInfo {
  currentStreak: number
  bestStreak: number
  completedToday: boolean
  totalCompleted: number
  weekDaysStatus: WeekDayStatus[]
}

const STORAGE_BUCKET = 'Students-assets'
const FOLDER_NAME = 'voice-journals'
const LOCAL_STORAGE_KEY_PREFIX = 'karkai_voice_journals_'

/**
 * Format Date to YYYY-MM-DD in local time
 */
export function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Convert Blob to Base64 Data URL
 */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

/**
 * Upload voice recording to Supabase Storage with base64 Data URL fallback
 */
export async function uploadVoiceRecording(
  audioBlob: Blob,
  userId: string = 'student'
): Promise<string> {
  try {
    if (supabase && isSupabaseConfigured) {
      const ext = audioBlob.type.includes('wav')
        ? 'wav'
        : audioBlob.type.includes('mp4') || audioBlob.type.includes('m4a')
        ? 'm4a'
        : audioBlob.type.includes('mp3')
        ? 'mp3'
        : 'webm'

      const fileName = `${userId}-${Date.now()}.${ext}`
      const filePath = `${FOLDER_NAME}/${fileName}`

      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(filePath, audioBlob, {
          contentType: audioBlob.type || 'audio/webm',
          upsert: true,
        })

      if (!error && data) {
        const { data: publicUrlData } = supabase.storage
          .from(STORAGE_BUCKET)
          .getPublicUrl(data.path)

        if (publicUrlData?.publicUrl) {
          return publicUrlData.publicUrl
        }
      } else if (error) {
        console.warn('Supabase storage upload error, falling back to base64 Data URL:', error.message)
      }
    }
  } catch (err) {
    console.warn('Storage upload failed, falling back to base64 Data URL:', err)
  }

  // Fallback to base64 data URL
  return await blobToDataUrl(audioBlob)
}

/**
 * Cache journals locally in LocalStorage
 */
function cacheJournalsLocally(identifier: string, journals: VoiceJournalEntry[]) {
  try {
    const key = `${LOCAL_STORAGE_KEY_PREFIX}${identifier || 'guest'}`
    if (journals.length === 0) {
      localStorage.removeItem(key)
      // Also remove general fallback keys if table is empty
      localStorage.removeItem(`${LOCAL_STORAGE_KEY_PREFIX}guest`)
      localStorage.removeItem(`${LOCAL_STORAGE_KEY_PREFIX}student`)
    } else {
      localStorage.setItem(key, JSON.stringify(journals))
    }
  } catch (err) {
    console.warn('Failed to cache journals locally:', err)
  }
}

/**
 * Load journals from LocalStorage
 */
export function getLocalJournals(identifier: string): VoiceJournalEntry[] {
  try {
    const key = `${LOCAL_STORAGE_KEY_PREFIX}${identifier || 'guest'}`
    const raw = localStorage.getItem(key)
    if (raw) {
      return JSON.parse(raw) as VoiceJournalEntry[]
    }
  } catch (err) {
    console.warn('Failed to read journals from localStorage:', err)
  }
  return []
}

/**
 * Clear all cached journals for student
 */
export function clearStudentTaskCache(identifier?: string) {
  try {
    if (identifier) {
      localStorage.removeItem(`${LOCAL_STORAGE_KEY_PREFIX}${identifier}`)
    }
    localStorage.removeItem(`${LOCAL_STORAGE_KEY_PREFIX}guest`)
    localStorage.removeItem(`${LOCAL_STORAGE_KEY_PREFIX}student`)
  } catch (err) {
    console.warn('Failed to clear student task cache:', err)
  }
}

/**
 * Submit daily voice journal entry
 */
export async function submitVoiceJournal(payload: {
  student_id?: string
  student_email?: string
  student_name?: string
  article_title: string
  audio_url: string
  audio_duration: number
  new_words: NewWordEntry[]
  key_learnings: string
}): Promise<{ success: boolean; data?: VoiceJournalEntry; error?: string }> {
  const task_date = getLocalDateString(new Date())
  const identifier = payload.student_id || payload.student_email || 'guest'

  const newEntry: VoiceJournalEntry = {
    id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    student_id: payload.student_id,
    student_email: payload.student_email,
    student_name: payload.student_name,
    article_title: payload.article_title.trim(),
    audio_url: payload.audio_url,
    audio_duration: payload.audio_duration || 0,
    new_words: payload.new_words || [],
    key_learnings: payload.key_learnings.trim(),
    task_date,
    created_at: new Date().toISOString(),
  }

  // Always update local storage first so user has immediate feedback
  const existingLocal = getLocalJournals(identifier)
  const updatedLocal = [newEntry, ...existingLocal.filter((e) => e.id !== newEntry.id)]
  cacheJournalsLocally(identifier, updatedLocal)

  // Save to Supabase backend if configured
  if (supabase && isSupabaseConfigured) {
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const authUserId = sessionData?.session?.user?.id
      const effectiveStudentId =
        (payload.student_id && payload.student_id.includes('-'))
          ? payload.student_id
          : (authUserId || null)

      const { data, error } = await supabase
        .from('student_voice_journals')
        .insert({
          student_id: effectiveStudentId,
          student_email: payload.student_email || sessionData?.session?.user?.email || null,
          student_name: payload.student_name || null,
          article_title: payload.article_title.trim(),
          audio_url: payload.audio_url,
          audio_duration: payload.audio_duration || 0,
          new_words: payload.new_words || [],
          key_learnings: payload.key_learnings.trim(),
          task_date,
        })
        .select()
        .single()

      if (error) {
        console.warn('Could not insert voice journal into Supabase, saved locally:', error.message)
      } else if (data) {
        newEntry.id = data.id
        newEntry.created_at = data.created_at
        // Re-cache with backend ID
        const refreshed = [newEntry, ...existingLocal.filter((e) => e.id !== newEntry.id)]
        cacheJournalsLocally(identifier, refreshed)
      }
    } catch (err: any) {
      console.warn('Backend save exception, saved locally:', err?.message || err)
    }
  }

  return { success: true, data: newEntry }
}

/**
 * Fetch all voice journals for a student
 * The backend is the authoritative source: if records were deleted in the backend table,
 * local cache is automatically synchronized and cleared so the daily task resets to start of day.
 */
export async function getStudentVoiceJournals(
  studentId?: string,
  studentEmail?: string
): Promise<VoiceJournalEntry[]> {
  const identifier = studentId || studentEmail || 'guest'
  const localItems = getLocalJournals(identifier)

  if (!supabase || !isSupabaseConfigured) {
    return localItems
  }

  try {
    const { data: sessionData } = await supabase.auth.getSession()
    const authUserId = sessionData?.session?.user?.id
    const authUserEmail = sessionData?.session?.user?.email

    const effectiveId =
      studentId && studentId.includes('-') ? studentId : (authUserId || null)
    const effectiveEmail = studentEmail || authUserEmail || null

    let query = supabase
      .from('student_voice_journals')
      .select('*')
      .order('task_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (effectiveId && effectiveEmail) {
      query = query.or(`student_id.eq.${effectiveId},student_email.eq.${effectiveEmail}`)
    } else if (effectiveId) {
      query = query.eq('student_id', effectiveId)
    } else if (effectiveEmail) {
      query = query.eq('student_email', effectiveEmail)
    }

    const { data, error } = await query

    if (error) {
      console.warn('Failed to load journals from Supabase, falling back to local:', error.message)
      return localItems
    }

    // Backend is the source of truth!
    // If user deleted records in Supabase backend, data will be empty [] or have only remaining records.
    const remoteItems: VoiceJournalEntry[] = (data || []).map((d: any) => ({
      ...d,
      new_words: Array.isArray(d.new_words) ? d.new_words : [],
    }))

    // Synchronize local cache with backend truth
    cacheJournalsLocally(identifier, remoteItems)
    return remoteItems
  } catch (err) {
    console.warn('Error fetching journals:', err)
    return localItems
  }
}

/**
 * Compute Streaks & Weekly status
 */
export function calculateStreakInfo(journals: VoiceJournalEntry[]): StreakInfo {
  const todayStr = getLocalDateString(new Date())

  // Set of all unique task dates completed
  const completedDateSet = new Set<string>()
  journals.forEach((j) => {
    if (j.task_date) {
      completedDateSet.add(j.task_date.slice(0, 10))
    }
  })

  const completedToday = completedDateSet.has(todayStr)

  // Calculate current streak
  let currentStreak = 0
  const checkDate = new Date()

  if (!completedToday) {
    // If not completed today, check if yesterday was completed
    checkDate.setDate(checkDate.getDate() - 1)
  }

  while (true) {
    const dStr = getLocalDateString(checkDate)
    if (completedDateSet.has(dStr)) {
      currentStreak++
      checkDate.setDate(checkDate.getDate() - 1)
    } else {
      break
    }
  }

  // Calculate best streak historically
  let bestStreak = 0
  if (completedDateSet.size > 0) {
    const sortedDates = Array.from(completedDateSet).sort()
    let tempStreak = 0
    let prevDate: Date | null = null

    for (const dStr of sortedDates) {
      const [y, m, d] = dStr.split('-').map(Number)
      const curDate = new Date(y, m - 1, d)

      if (!prevDate) {
        tempStreak = 1
      } else {
        const diffMs = curDate.getTime() - prevDate.getTime()
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))
        if (diffDays === 1) {
          tempStreak++
        } else {
          tempStreak = 1
        }
      }
      if (tempStreak > bestStreak) {
        bestStreak = tempStreak
      }
      prevDate = curDate
    }
  }

  bestStreak = Math.max(bestStreak, currentStreak)

  // Compute Monday-Sunday of current week
  const now = new Date()
  const currentDayOfWeek = now.getDay() // 0 = Sun, 1 = Mon, ..., 6 = Sat
  // Distance back to Monday (if Sun 0, distance is 6)
  const distToMon = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1
  const monday = new Date(now)
  monday.setDate(now.getDate() - distToMon)

  const dayNames = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
  const weekDaysStatus: WeekDayStatus[] = []

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    const dateStr = getLocalDateString(d)
    weekDaysStatus.push({
      dayName: dayNames[i],
      dayNumber: d.getDate(),
      dateStr,
      isCompleted: completedDateSet.has(dateStr),
      isToday: dateStr === todayStr,
    })
  }

  return {
    currentStreak,
    bestStreak,
    completedToday,
    totalCompleted: journals.length,
    weekDaysStatus,
  }
}
