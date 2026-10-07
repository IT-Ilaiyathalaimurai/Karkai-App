/**
 * Mentor Assigned Tasks Service
 * 
 * Handles creation, student submission, and mentor review/feedback for tasks
 * assigned by mentors to their connected students.
 * 
 * Uses Supabase Postgres table `mentor_assigned_tasks` with automatic local caching,
 * real-time resilience, and offline fallback.
 */

import { supabase, isSupabaseConfigured } from './supabase'
import { getCachedConnections } from './mentor-mentee-connections'

export const TASKS_TABLE_NAME = 'mentor_assigned_tasks'
export const TASKS_CACHE_KEY = 'karkai_mentor_assigned_tasks'

export type TaskStatus = 'assigned' | 'submitted' | 'reviewed' | 'needs_revision'

export interface MentorAssignedTask {
  id: string
  connection_id?: string | null
  mentor_id: string
  mentor_name: string
  student_id: string
  student_name: string
  title: string
  description?: string | null
  deadline: string // ISO date string (YYYY-MM-DDTHH:mm:ssZ)
  status: TaskStatus

  // Student submission
  submission_link?: string | null
  submission_notes?: string | null
  submitted_at?: string | null

  // Mentor evaluation & feedback
  feedback?: string | null
  rating?: number | null // 1 to 5
  reviewed_at?: string | null

  created_at: string
  updated_at: string
}

export interface ConnectedMentee {
  connection_id: string
  student_id: string
  student_name: string
}

// ---------------------------------------------------------------------------
// Local Cache Helpers
// ---------------------------------------------------------------------------

export function getCachedTasks(): MentorAssignedTask[] {
  try {
    const raw = localStorage.getItem(TASKS_CACHE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveCachedTasks(tasks: MentorAssignedTask[]): void {
  try {
    localStorage.setItem(TASKS_CACHE_KEY, JSON.stringify(tasks))
  } catch {
    // ignore quota errors
  }
}

// ---------------------------------------------------------------------------
// Fetch Connected Students for a Mentor
// ---------------------------------------------------------------------------

export async function getConnectedStudentsForMentor(
  mentorId?: string | null,
  mentorName?: string | null
): Promise<ConnectedMentee[]> {
  const result: ConnectedMentee[] = []
  const seen = new Set<string>()

  // 1. Check local cache first
  const cachedConns = getCachedConnections()
  cachedConns
    .filter(
      (c) =>
        c.status === 'accepted' &&
        ((mentorName && c.mentor_name?.toLowerCase() === mentorName.toLowerCase()) ||
          (mentorId && (c.mentor_user_id === mentorId || c.id === mentorId)))
    )
    .forEach((c) => {
      const studentId = c.user_id || `student-${c.student_name.toLowerCase().replace(/\s+/g, '-')}`
      if (!seen.has(c.student_name.toLowerCase())) {
        seen.add(c.student_name.toLowerCase())
        result.push({
          connection_id: c.id,
          student_id: studentId,
          student_name: c.student_name,
        })
      }
    })

  // 2. Fetch from Supabase if configured
  if (supabase && isSupabaseConfigured) {
    try {
      let query = supabase
        .from('mentor-mentee-connections')
        .select('*')
        .eq('status', 'accepted')

      if (mentorId) {
        query = query.or(`mentor_user_id.eq.${mentorId},mentor_name.eq.${mentorName || ''}`)
      } else if (mentorName) {
        query = query.eq('mentor_name', mentorName)
      }

      const { data, error } = await query

      if (!error && Array.isArray(data)) {
        data.forEach((c: any) => {
          const sName = c.student_name || 'Student'
          if (!seen.has(sName.toLowerCase())) {
            seen.add(sName.toLowerCase())
            result.push({
              connection_id: c.id,
              student_id: c.user_id || `student-${sName.toLowerCase().replace(/\s+/g, '-')}`,
              student_name: sName,
            })
          }
        })
      }
    } catch (e) {
      console.warn('Could not fetch connected students from Supabase:', e)
    }
  }

  return result
}

// ---------------------------------------------------------------------------
// Assign Task (Mentor -> Student)
// ---------------------------------------------------------------------------

export interface CreateTaskPayload {
  connection_id?: string | null
  mentor_id: string
  mentor_name: string
  student_id: string
  student_name: string
  title: string
  description?: string
  deadline: string // ISO string
}

export async function assignTask(
  payload: CreateTaskPayload
): Promise<{ success: boolean; task?: MentorAssignedTask; error?: string }> {
  const now = new Date().toISOString()
  const taskId = `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`

  const newTask: MentorAssignedTask = {
    id: taskId,
    connection_id: payload.connection_id || null,
    mentor_id: payload.mentor_id,
    mentor_name: payload.mentor_name,
    student_id: payload.student_id,
    student_name: payload.student_name,
    title: payload.title.trim(),
    description: payload.description?.trim() || null,
    deadline: payload.deadline,
    status: 'assigned',
    submission_link: null,
    submission_notes: null,
    submitted_at: null,
    feedback: null,
    rating: null,
    reviewed_at: null,
    created_at: now,
    updated_at: now,
  }

  // 1. Cache immediately
  const cached = getCachedTasks()
  cached.unshift(newTask)
  saveCachedTasks(cached)

  // 2. Persist to Supabase if configured
  if (supabase && isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from(TASKS_TABLE_NAME)
        .insert({
          id: taskId,
          connection_id: newTask.connection_id,
          mentor_id: newTask.mentor_id,
          mentor_name: newTask.mentor_name,
          student_id: newTask.student_id,
          student_name: newTask.student_name,
          title: newTask.title,
          description: newTask.description,
          deadline: newTask.deadline,
          status: 'assigned',
          created_at: now,
          updated_at: now,
        })
        .select()
        .single()

      if (!error && data) {
        // Update local cache with exact DB row
        const index = cached.findIndex((t) => t.id === taskId)
        if (index >= 0) {
          cached[index] = { ...newTask, ...data }
          saveCachedTasks(cached)
        }
        return { success: true, task: data }
      }
    } catch (e: any) {
      console.warn('Failed to insert task into Supabase (cached locally):', e?.message)
    }
  }

  return { success: true, task: newTask }
}

// ---------------------------------------------------------------------------
// Get Tasks for a Mentor
// ---------------------------------------------------------------------------

export async function getTasksForMentor(
  mentorId: string,
  mentorName?: string | null
): Promise<MentorAssignedTask[]> {
  // 1. Get from cache first
  const cached = getCachedTasks()
  const localMatching = cached.filter(
    (t) =>
      t.mentor_id === mentorId ||
      (mentorName && t.mentor_name.toLowerCase() === mentorName.toLowerCase())
  )

  // 2. Try Supabase
  if (supabase && isSupabaseConfigured) {
    try {
      let query = supabase
        .from(TASKS_TABLE_NAME)
        .select('*')
        .order('created_at', { ascending: false })

      if (mentorName) {
        query = query.or(`mentor_id.eq.${mentorId},mentor_name.eq.${mentorName}`)
      } else {
        query = query.eq('mentor_id', mentorId)
      }

      const { data, error } = await query

      if (!error && Array.isArray(data)) {
        // Merge with cache
        const map = new Map<string, MentorAssignedTask>()
        data.forEach((item) => map.set(item.id, item))
        localMatching.forEach((item) => {
          if (!map.has(item.id)) map.set(item.id, item)
        })
        const combined = Array.from(map.values()).sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
        saveCachedTasks(combined)
        return combined
      }
    } catch (e) {
      console.warn('Could not query Supabase for mentor tasks:', e)
    }
  }

  return localMatching
}

// ---------------------------------------------------------------------------
// Get Tasks for a Student
// ---------------------------------------------------------------------------

export async function getTasksForStudent(
  studentId: string,
  studentName?: string | null
): Promise<MentorAssignedTask[]> {
  // 1. Get from cache first
  const cached = getCachedTasks()
  const localMatching = cached.filter(
    (t) =>
      t.student_id === studentId ||
      (studentName && t.student_name.toLowerCase() === studentName.toLowerCase())
  )

  // 2. Try Supabase
  if (supabase && isSupabaseConfigured) {
    try {
      let query = supabase
        .from(TASKS_TABLE_NAME)
        .select('*')
        .order('created_at', { ascending: false })

      if (studentName) {
        query = query.or(`student_id.eq.${studentId},student_name.eq.${studentName}`)
      } else {
        query = query.eq('student_id', studentId)
      }

      const { data, error } = await query

      if (!error && Array.isArray(data)) {
        const map = new Map<string, MentorAssignedTask>()
        data.forEach((item) => map.set(item.id, item))
        localMatching.forEach((item) => {
          if (!map.has(item.id)) map.set(item.id, item)
        })
        const combined = Array.from(map.values()).sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
        saveCachedTasks(combined)
        return combined
      }
    } catch (e) {
      console.warn('Could not query Supabase for student tasks:', e)
    }
  }

  return localMatching
}

// ---------------------------------------------------------------------------
// Student Submits Work with Reviewable Link
// ---------------------------------------------------------------------------

export async function submitStudentTask(
  taskId: string,
  submissionLink: string,
  submissionNotes?: string | null
): Promise<{ success: boolean; task?: MentorAssignedTask; error?: string }> {
  const now = new Date().toISOString()

  // 1. Update cache
  const cached = getCachedTasks()
  const idx = cached.findIndex((t) => t.id === taskId)
  let updatedTask: MentorAssignedTask | null = null

  if (idx >= 0) {
    cached[idx] = {
      ...cached[idx],
      submission_link: submissionLink.trim(),
      submission_notes: submissionNotes?.trim() || null,
      submitted_at: now,
      status: 'submitted',
      updated_at: now,
    }
    updatedTask = cached[idx]
    saveCachedTasks(cached)
  }

  // 2. Update Supabase
  if (supabase && isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from(TASKS_TABLE_NAME)
        .update({
          submission_link: submissionLink.trim(),
          submission_notes: submissionNotes?.trim() || null,
          submitted_at: now,
          status: 'submitted',
          updated_at: now,
        })
        .eq('id', taskId)
        .select()
        .single()

      if (!error && data) {
        if (idx >= 0) {
          cached[idx] = data
          saveCachedTasks(cached)
        }
        return { success: true, task: data }
      }
    } catch (e: any) {
      console.warn('Failed to update task submission in Supabase:', e?.message)
    }
  }

  if (updatedTask) {
    return { success: true, task: updatedTask }
  }
  return { success: false, error: 'Task not found' }
}

// ---------------------------------------------------------------------------
// Mentor Reviews Submission & Gives Feedback
// ---------------------------------------------------------------------------

export async function reviewTaskFeedback(
  taskId: string,
  feedback: string,
  rating?: number | null,
  status: 'reviewed' | 'needs_revision' = 'reviewed'
): Promise<{ success: boolean; task?: MentorAssignedTask; error?: string }> {
  const now = new Date().toISOString()

  // 1. Update cache
  const cached = getCachedTasks()
  const idx = cached.findIndex((t) => t.id === taskId)
  let updatedTask: MentorAssignedTask | null = null

  if (idx >= 0) {
    cached[idx] = {
      ...cached[idx],
      feedback: feedback.trim(),
      rating: rating ?? cached[idx].rating ?? null,
      reviewed_at: now,
      status,
      updated_at: now,
    }
    updatedTask = cached[idx]
    saveCachedTasks(cached)
  }

  // 2. Update Supabase
  if (supabase && isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from(TASKS_TABLE_NAME)
        .update({
          feedback: feedback.trim(),
          rating: rating ?? null,
          reviewed_at: now,
          status,
          updated_at: now,
        })
        .eq('id', taskId)
        .select()
        .single()

      if (!error && data) {
        if (idx >= 0) {
          cached[idx] = data
          saveCachedTasks(cached)
        }
        return { success: true, task: data }
      }
    } catch (e: any) {
      console.warn('Failed to review task in Supabase:', e?.message)
    }
  }

  if (updatedTask) {
    return { success: true, task: updatedTask }
  }
  return { success: false, error: 'Task not found' }
}

// ---------------------------------------------------------------------------
// Delete Assigned Task (Mentor cancellation)
// ---------------------------------------------------------------------------

export async function deleteAssignedTask(
  taskId: string
): Promise<{ success: boolean }> {
  const cached = getCachedTasks()
  const filtered = cached.filter((t) => t.id !== taskId)
  saveCachedTasks(filtered)

  if (supabase && isSupabaseConfigured) {
    try {
      await supabase.from(TASKS_TABLE_NAME).delete().eq('id', taskId)
    } catch (e) {
      console.warn('Failed to delete task from Supabase:', e)
    }
  }

  return { success: true }
}
