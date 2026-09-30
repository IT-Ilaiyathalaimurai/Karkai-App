/**
 * Direct Messaging Service
 * 
 * Handles private 1:1 real-time messaging between students and mentors with accepted connections.
 * Uses Supabase Postgres tables: `connections` & `direct_messages`, with automatic local caching,
 * real-time subscriptions, read receipts, and offline fallback.
 */

import { supabase, isSupabaseConfigured } from './supabase'

export interface DirectMessage {
  id: string
  connection_id: string
  sender_id: string
  receiver_id: string
  message_text: string
  media_url?: string | null
  is_read: boolean
  created_at: string
  isPending?: boolean
}

export interface AcceptedConnection {
  connectionId: string
  id?: string
  partnerId: string
  partnerName: string
  partnerRole: 'student' | 'mentor'
  partnerTitle?: string
  partnerCompany?: string
  partnerAvatar?: string | null
  partnerWing?: 'Senior Wing' | 'School Wing'
  isVerifiedMentor?: boolean
  status: 'accepted'
  lastMessage?: string
  lastMessageTime?: string
  unreadCount: number
}

const STORAGE_CACHE_PREFIX = 'karkai_dm_'

// ---------------------------------------------------------------------------
// Local Cache Helpers
// ---------------------------------------------------------------------------

function getCachedMessages(connectionId: string): DirectMessage[] {
  try {
    const raw = localStorage.getItem(`${STORAGE_CACHE_PREFIX}messages_${connectionId}`)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveCachedMessages(connectionId: string, messages: DirectMessage[]): void {
  try {
    localStorage.setItem(`${STORAGE_CACHE_PREFIX}messages_${connectionId}`, JSON.stringify(messages))
  } catch {
    // ignore quota errors
  }
}

function getCachedAcceptedConnections(userId: string): AcceptedConnection[] {
  try {
    const raw = localStorage.getItem(`${STORAGE_CACHE_PREFIX}connections_${userId}`)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveCachedAcceptedConnections(userId: string, list: AcceptedConnection[]): void {
  try {
    localStorage.setItem(`${STORAGE_CACHE_PREFIX}connections_${userId}`, JSON.stringify(list))
  } catch {
    // ignore quota errors
  }
}

// ---------------------------------------------------------------------------
// 1. Get Accepted Connections for User
// ---------------------------------------------------------------------------

export async function getAcceptedConnections(
  currentUserId?: string,
  currentUserRole: 'student' | 'mentor' = 'student'
): Promise<AcceptedConnection[]> {
  if (!currentUserId) return []

  // Check cache first for instant UI response
  const cached = getCachedAcceptedConnections(currentUserId)

  if (!supabase || !isSupabaseConfigured) {
    return cached
  }

  try {
    const isStudent = currentUserRole === 'student'
    const results: AcceptedConnection[] = []

    // 1. Attempt reading from 'connections' table
    const { data: connectionsData, error: connErr } = await supabase
      .from('connections')
      .select('*')
      .eq('status', 'accepted')
      .or(`student_id.eq.${currentUserId},mentor_id.eq.${currentUserId}`)
      .order('created_at', { ascending: false })

    interface RawConn {
      id: string
      student_id: string
      mentor_id: string
      mentor_name?: string
      student_name?: string
      status: string
      created_at?: string
    }

    let rawConnections: RawConn[] = (connectionsData as RawConn[]) || []

    // 2. If 'connections' table does not exist or empty, check legacy 'mentor-mentee-connections'
    if (connErr || rawConnections.length === 0) {
      const { data: legacyData, error: legacyErr } = await supabase
        .from('mentor-mentee-connections')
        .select('*')
        .eq('status', 'accepted')
        .or(`user_id.eq.${currentUserId},mentor_user_id.eq.${currentUserId}`)
        .order('created_at', { ascending: false })

      if (!legacyErr && Array.isArray(legacyData)) {
        rawConnections = legacyData.map((leg) => ({
          id: leg.id,
          student_id: leg.user_id || leg.id,
          mentor_id: leg.mentor_user_id || leg.id,
          mentor_name: leg.mentor_name,
          student_name: leg.student_name,
          status: 'accepted',
          created_at: leg.created_at,
        }))
      }
    }

    if (rawConnections.length === 0) {
      return cached
    }

    // For each connection, resolve partner details and latest message
    for (const conn of rawConnections) {
      const partnerId = isStudent ? conn.mentor_id : conn.student_id
      let partnerName = isStudent ? (conn.mentor_name || 'Mentor') : (conn.student_name || 'Student')
      let partnerTitle = isStudent ? 'Verified Industry Mentor' : 'Senior Student'
      let partnerCompany = isStudent ? 'Karkai Global' : undefined
      let partnerAvatar: string | null = null
      let partnerWing: 'Senior Wing' | 'School Wing' | undefined = isStudent ? undefined : 'Senior Wing'
      let isVerifiedMentor = isStudent

      // 1. If student looking at mentor: resolve mentor details
      if (isStudent) {
        try {
          const { data: mentorRow } = await supabase
            .from('Mentor-details')
            .select('full_name, working_as, working_in, avatar_url, is_verified')
            .or(`user_id.eq.${partnerId},id.eq.${partnerId}`)
            .maybeSingle()

          if (mentorRow) {
            if (mentorRow.full_name) partnerName = mentorRow.full_name
            if (mentorRow.working_as) partnerTitle = mentorRow.working_as
            if (mentorRow.working_in) partnerCompany = mentorRow.working_in
            if (mentorRow.avatar_url) partnerAvatar = mentorRow.avatar_url
            isVerifiedMentor = true
          } else {
            // Check legacy mentor-mentee-connections by connection id
            const { data: legConn } = await supabase
              .from('mentor-mentee-connections')
              .select('mentor_name')
              .eq('id', conn.id)
              .maybeSingle()

            if (legConn?.mentor_name) {
              partnerName = legConn.mentor_name
            } else if (conn.mentor_name) {
              partnerName = conn.mentor_name
            }

            // Fallback check users table
            if (partnerName === 'Mentor') {
              const { data: userRow } = await supabase
                .from('users')
                .select('name')
                .eq('id', partnerId)
                .maybeSingle()
              if (userRow?.name) partnerName = userRow.name
            }
          }
        } catch {
          // Fallback to defaults
        }
      } else {
        // 2. If mentor looking at student: resolve student name and Senior/School wing
        try {
          const { data: studentRow } = await supabase
            .from('Student-details')
            .select('full_name, is_minor, age, institution_name, degree, branch, avatar_url')
            .or(`user_id.eq.${partnerId},id.eq.${partnerId}`)
            .maybeSingle()

          if (studentRow) {
            if (studentRow.full_name) partnerName = studentRow.full_name
            const isMinor = Boolean(studentRow.is_minor) || (studentRow.age ? Number(studentRow.age) < 18 : false)
            partnerWing = isMinor ? 'School Wing' : 'Senior Wing'
            partnerTitle = isMinor
              ? 'School Wing Student'
              : (studentRow.degree ? `${studentRow.degree} • ${studentRow.institution_name || 'Senior Student'}` : 'Senior Wing Student')
            partnerCompany = partnerWing
            if (studentRow.avatar_url) partnerAvatar = studentRow.avatar_url
          } else {
            // Check legacy mentor-mentee-connections
            const { data: legConn } = await supabase
              .from('mentor-mentee-connections')
              .select('student_name')
              .eq('id', conn.id)
              .maybeSingle()

            if (legConn?.student_name) {
              partnerName = legConn.student_name
            } else if (conn.student_name) {
              partnerName = conn.student_name
            }

            // Fallback check users table
            if (partnerName === 'Student' || partnerName === 'Student Learner') {
              const { data: userRow } = await supabase
                .from('users')
                .select('name')
                .eq('id', partnerId)
                .maybeSingle()
              if (userRow?.name) partnerName = userRow.name
            }
          }
        } catch {
          // Fallback to defaults
        }
      }

      // Fetch latest message for this connection
      let lastMessage: string | undefined = undefined
      let lastMessageTime: string | undefined = undefined
      let unreadCount = 0

      try {
        const { data: messages } = await supabase
          .from('direct_messages')
          .select('message_text, created_at, is_read, sender_id')
          .eq('connection_id', conn.id)
          .order('created_at', { ascending: false })
          .limit(1)

        if (messages && messages.length > 0) {
          lastMessage = messages[0].message_text
          lastMessageTime = messages[0].created_at
        }

        // Count unread messages sent to current user
        const { count } = await supabase
          .from('direct_messages')
          .select('*', { count: 'exact', head: true })
          .eq('connection_id', conn.id)
          .eq('receiver_id', currentUserId)
          .eq('is_read', false)

        unreadCount = count || 0
      } catch {
        // Direct messages table might not be queried yet
      }

      results.push({
        connectionId: conn.id,
        id: conn.id,
        partnerId,
        partnerName,
        partnerRole: isStudent ? 'mentor' : 'student',
        partnerTitle,
        partnerCompany,
        partnerAvatar,
        partnerWing,
        isVerifiedMentor,
        status: 'accepted',
        lastMessage,
        lastMessageTime,
        unreadCount,
      })
    }

    saveCachedAcceptedConnections(currentUserId, results)
    return results
  } catch (err) {
    console.warn('Error fetching accepted connections:', err)
    return cached
  }
}

// ---------------------------------------------------------------------------
// 2. Get Messages for a Connection
// ---------------------------------------------------------------------------

export async function getMessages(connectionId: string): Promise<DirectMessage[]> {
  if (!connectionId) return []

  const cached = getCachedMessages(connectionId)

  if (!supabase || !isSupabaseConfigured) {
    return cached
  }

  try {
    const { data, error } = await supabase
      .from('direct_messages')
      .select('*')
      .eq('connection_id', connectionId)
      .order('created_at', { ascending: true })

    if (error) {
      console.warn('Notice loading direct_messages from Supabase:', error.message)
      return cached
    }

    if (data && Array.isArray(data)) {
      saveCachedMessages(connectionId, data as DirectMessage[])
      return data as DirectMessage[]
    }

    return cached
  } catch (err) {
    console.warn('Error in getMessages:', err)
    return cached
  }
}

// ---------------------------------------------------------------------------
// 3. Send Message
// ---------------------------------------------------------------------------

export async function sendMessage(params: {
  connectionId: string
  senderId: string
  receiverId: string
  messageText: string
  mediaUrl?: string | null
}): Promise<{ success: boolean; message?: DirectMessage; error?: string }> {
  const { connectionId, senderId, receiverId, messageText, mediaUrl } = params
  const trimmed = messageText.trim()

  if (!trimmed) {
    return { success: false, error: 'Message cannot be empty.' }
  }

  const now = new Date().toISOString()
  const optimisticMessage: DirectMessage = {
    id: `local-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    connection_id: connectionId,
    sender_id: senderId,
    receiver_id: receiverId,
    message_text: trimmed,
    media_url: mediaUrl || null,
    is_read: false,
    created_at: now,
    isPending: true,
  }

  // Update local cache immediately for optimistic UI
  const existing = getCachedMessages(connectionId)
  saveCachedMessages(connectionId, [...existing, optimisticMessage])

  if (!supabase || !isSupabaseConfigured) {
    return { success: true, message: optimisticMessage }
  }

  try {
    // 1. Resolve active authenticated user ID from Supabase session
    let actualSenderId = senderId
    let actualReceiverId = receiverId
    let actualConnectionId = connectionId

    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const authUser = sessionData?.session?.user
      if (authUser?.id) {
        actualSenderId = authUser.id
      }
    } catch {
      // Continue with provided senderId
    }

    // 2. Ensure connection exists in public.connections table
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(actualConnectionId)

    if (isUuid) {
      const { data: connRow } = await supabase
        .from('connections')
        .select('id, student_id, mentor_id, status')
        .eq('id', actualConnectionId)
        .maybeSingle()

      if (connRow) {
        actualConnectionId = connRow.id
        if (connRow.student_id === actualSenderId) {
          actualReceiverId = connRow.mentor_id
        } else if (connRow.mentor_id === actualSenderId) {
          actualReceiverId = connRow.student_id
        }
      } else {
        // Find by participant pair
        const { data: pairConn } = await supabase
          .from('connections')
          .select('id, student_id, mentor_id, status')
          .or(`and(student_id.eq.${actualSenderId},mentor_id.eq.${actualReceiverId}),and(mentor_id.eq.${actualSenderId},student_id.eq.${actualReceiverId})`)
          .maybeSingle()

        if (pairConn) {
          actualConnectionId = pairConn.id
        } else {
          try {
            const { data: newConn } = await supabase
              .from('connections')
              .insert([
                {
                  id: actualConnectionId,
                  student_id: actualSenderId,
                  mentor_id: actualReceiverId,
                  status: 'accepted',
                },
              ])
              .select()
              .maybeSingle()

            if (newConn?.id) {
              actualConnectionId = newConn.id
            }
          } catch {
            // Ignore insert conflict
          }
        }
      }
    } else {
      // Legacy text ID (e.g. conn-123...) - find or create in connections table
      const { data: pairConn } = await supabase
        .from('connections')
        .select('id')
        .or(`and(student_id.eq.${actualSenderId},mentor_id.eq.${actualReceiverId}),and(mentor_id.eq.${actualSenderId},student_id.eq.${actualReceiverId})`)
        .maybeSingle()

      if (pairConn) {
        actualConnectionId = pairConn.id
      } else {
        // Create matching connection row in public.connections
        const { data: newConn } = await supabase
          .from('connections')
          .insert([
            {
              student_id: actualSenderId,
              mentor_id: actualReceiverId,
              status: 'accepted',
            },
          ])
          .select()
          .maybeSingle()

        if (newConn?.id) {
          actualConnectionId = newConn.id
        }
      }
    }

    const payload = {
      connection_id: actualConnectionId,
      sender_id: actualSenderId,
      receiver_id: actualReceiverId,
      message_text: trimmed,
      media_url: mediaUrl || null,
      is_read: false,
      created_at: now,
    }

    const { data, error } = await supabase
      .from('direct_messages')
      .insert([payload])
      .select()
      .single()

    if (error) {
      console.warn('Error inserting message into direct_messages table:', error.message)
      return { success: false, message: optimisticMessage, error: error.message }
    }

    if (data) {
      const confirmedMessage: DirectMessage = { ...data, isPending: false }
      // Replace optimistic message in cache
      const updatedCache = getCachedMessages(connectionId).map((m) =>
        m.id === optimisticMessage.id ? confirmedMessage : m
      )
      saveCachedMessages(connectionId, updatedCache)
      return { success: true, message: confirmedMessage }
    }

    return { success: true, message: optimisticMessage }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return { success: false, message: optimisticMessage, error: msg }
  }
}

// ---------------------------------------------------------------------------
// 4. Mark Messages as Read
// ---------------------------------------------------------------------------

export async function markMessagesAsRead(
  connectionId: string,
  currentUserId: string
): Promise<void> {
  if (!connectionId || !currentUserId) return

  // Update local cache
  const cached = getCachedMessages(connectionId)
  let changed = false
  const updated = cached.map((m) => {
    if (m.receiver_id === currentUserId && !m.is_read) {
      changed = true
      return { ...m, is_read: true }
    }
    return m
  })
  if (changed) {
    saveCachedMessages(connectionId, updated)
  }

  if (!supabase || !isSupabaseConfigured) return

  try {
    await supabase
      .from('direct_messages')
      .update({ is_read: true })
      .eq('connection_id', connectionId)
      .eq('receiver_id', currentUserId)
      .eq('is_read', false)
  } catch (err) {
    console.warn('Notice marking messages as read in Supabase:', err)
  }
}

// ---------------------------------------------------------------------------
// 5. Get Total Unread Counts
// ---------------------------------------------------------------------------

export async function getUnreadCounts(
  currentUserId: string
): Promise<{ total: number; byConnection: Record<string, number> }> {
  if (!currentUserId || !supabase || !isSupabaseConfigured) {
    return { total: 0, byConnection: {} }
  }

  try {
    const { data, error } = await supabase
      .from('direct_messages')
      .select('connection_id')
      .eq('receiver_id', currentUserId)
      .eq('is_read', false)

    if (error || !data) {
      return { total: 0, byConnection: {} }
    }

    const byConnection: Record<string, number> = {}
    let total = 0

    data.forEach((row) => {
      byConnection[row.connection_id] = (byConnection[row.connection_id] || 0) + 1
      total++
    })

    return { total, byConnection }
  } catch {
    return { total: 0, byConnection: {} }
  }
}

// ---------------------------------------------------------------------------
// 6. Realtime Subscription to New Messages
// ---------------------------------------------------------------------------

export function subscribeToMessages(
  connectionId: string,
  onNewMessage: (msg: DirectMessage) => void
): () => void {
  if (!connectionId || !supabase || !isSupabaseConfigured) {
    return () => {}
  }

  const channelName = `dm_${connectionId}_${Date.now()}`
  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'direct_messages',
        filter: `connection_id=eq.${connectionId}`,
      },
      (payload) => {
        if (payload.new) {
          const newMsg = payload.new as DirectMessage
          onNewMessage(newMsg)
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'direct_messages',
        filter: `connection_id=eq.${connectionId}`,
      },
      (payload) => {
        if (payload.new) {
          const updatedMsg = payload.new as DirectMessage
          onNewMessage(updatedMsg)
        }
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        // Active
      }
    })

  return () => {
    if (supabase) {
      supabase.removeChannel(channel)
    }
  }
}
