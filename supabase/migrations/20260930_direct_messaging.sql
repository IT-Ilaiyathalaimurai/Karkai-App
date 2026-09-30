-- ============================================================================
-- Supabase Migration: 1:1 Student-to-Mentor Direct Messaging System
-- Tables: profiles, connections, direct_messages
-- Includes: Indexes, Secure Row-Level Security (RLS) Policies, and Realtime
-- ============================================================================

-- 1. Profiles Table (linking auth.users with app role & metadata)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('student', 'mentor', 'admin')),
  full_name TEXT NOT NULL,
  job_title TEXT,
  company TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index on profiles role for fast filtering
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- 2. Connections Table (representing accepted/pending/declined mentorship relations)
CREATE TABLE IF NOT EXISTS public.connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mentor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_student_mentor_connection UNIQUE (student_id, mentor_id)
);

-- Indexes for connection lookups
CREATE INDEX IF NOT EXISTS idx_connections_student_id ON public.connections(student_id);
CREATE INDEX IF NOT EXISTS idx_connections_mentor_id ON public.connections(mentor_id);
CREATE INDEX IF NOT EXISTS idx_connections_status ON public.connections(status);

-- 3. Direct Messages Table (private 1:1 messaging between accepted connections)
CREATE TABLE IF NOT EXISTS public.direct_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES public.connections(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_text TEXT NOT NULL,
  media_url TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance (connection history and unread queries)
CREATE INDEX IF NOT EXISTS idx_direct_messages_connection_id ON public.direct_messages(connection_id);
CREATE INDEX IF NOT EXISTS idx_direct_messages_created_at ON public.direct_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_direct_messages_receiver_read ON public.direct_messages(receiver_id, is_read);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- PROFILES POLICIES
-- ----------------------------------------------------------------------------
-- Any authenticated user can view profiles
CREATE POLICY "Profiles are viewable by authenticated users"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Users can only insert/update their own profile
CREATE POLICY "Users can insert their own profile"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ----------------------------------------------------------------------------
-- CONNECTIONS POLICIES
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Participants can view their connections" ON public.connections;
DROP POLICY IF EXISTS "Students can create mentorship requests" ON public.connections;
DROP POLICY IF EXISTS "Mentors can accept or decline requests" ON public.connections;

-- Only the student or mentor belonging to a connection can view that connection
CREATE POLICY "Participants can view their connections"
  ON public.connections
  FOR SELECT
  TO authenticated
  USING (auth.uid() = student_id OR auth.uid() = mentor_id);

-- Students can create mentorship requests
CREATE POLICY "Students can create mentorship requests"
  ON public.connections
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = student_id 
    AND status IN ('pending', 'accepted')
  );

-- Mentors or participants can accept or decline requests
CREATE POLICY "Mentors can accept or decline requests"
  ON public.connections
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = mentor_id OR auth.uid() = student_id)
  WITH CHECK (
    (auth.uid() = mentor_id OR auth.uid() = student_id)
    AND status IN ('accepted', 'declined', 'pending')
  );

-- ----------------------------------------------------------------------------
-- DIRECT MESSAGES POLICIES
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Participants of accepted connections can read messages" ON public.direct_messages;
DROP POLICY IF EXISTS "Participants can send messages in accepted connections" ON public.direct_messages;
DROP POLICY IF EXISTS "Receivers can mark their received messages as read" ON public.direct_messages;

-- Only student or mentor belonging to an accepted connection can view messages
CREATE POLICY "Participants of accepted connections can read messages"
  ON public.direct_messages
  FOR SELECT
  TO authenticated
  USING (
    (auth.uid() = sender_id OR auth.uid() = receiver_id)
    AND (
      EXISTS (
        SELECT 1 FROM public.connections c
        WHERE c.id = direct_messages.connection_id
          AND c.status = 'accepted'
          AND (c.student_id = auth.uid() OR c.mentor_id = auth.uid())
      )
      OR
      EXISTS (
        SELECT 1 FROM public."mentor-mentee-connections" mmc
        WHERE mmc.id::text = direct_messages.connection_id::text
          AND mmc.status = 'accepted'
          AND (mmc.user_id = auth.uid() OR mmc.mentor_user_id = auth.uid() OR mmc.user_id IS NULL)
      )
    )
  );

-- Only authenticated participants of an accepted connection can send a message
-- sender_id must equal auth.uid()
CREATE POLICY "Participants can send messages in accepted connections"
  ON public.direct_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND (
      EXISTS (
        SELECT 1 FROM public.connections c
        WHERE c.id = direct_messages.connection_id
          AND c.status = 'accepted'
          AND (c.student_id = auth.uid() OR c.mentor_id = auth.uid())
      )
      OR
      EXISTS (
        SELECT 1 FROM public."mentor-mentee-connections" mmc
        WHERE mmc.id::text = direct_messages.connection_id::text
          AND mmc.status = 'accepted'
          AND (mmc.user_id = auth.uid() OR mmc.mentor_user_id = auth.uid() OR mmc.user_id IS NULL)
      )
    )
  );

-- Only the recipient can mark messages as read
CREATE POLICY "Receivers can mark their received messages as read"
  ON public.direct_messages
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = receiver_id)
  WITH CHECK (auth.uid() = receiver_id);

-- ============================================================================
-- SUPABASE REALTIME CONFIGURATION
-- ============================================================================
-- Enable publication for direct_messages table so listeners receive INSERT events
ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;

-- Set replica identity to full so update events carry row keys
ALTER TABLE public.direct_messages REPLICA IDENTITY FULL;
