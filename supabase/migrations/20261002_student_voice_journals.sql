-- Migration: Student Voice Journals & Daily Streaks
-- Table for storing daily research/article reading voice journals and learnings

CREATE TABLE IF NOT EXISTS public.student_voice_journals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID,
    student_email TEXT,
    student_name TEXT,
    article_title TEXT NOT NULL,
    audio_url TEXT NOT NULL,
    audio_duration INTEGER DEFAULT 0,
    new_words JSONB DEFAULT '[]'::jsonb,
    key_learnings TEXT NOT NULL,
    task_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indices for fast retrieval of student streak and history
CREATE INDEX IF NOT EXISTS idx_student_voice_journals_student_id ON public.student_voice_journals (student_id);
CREATE INDEX IF NOT EXISTS idx_student_voice_journals_student_email ON public.student_voice_journals (student_email);
CREATE INDEX IF NOT EXISTS idx_student_voice_journals_task_date ON public.student_voice_journals (task_date DESC);
CREATE INDEX IF NOT EXISTS idx_student_voice_journals_lookup ON public.student_voice_journals (student_id, task_date DESC);

-- Enable Row Level Security
ALTER TABLE public.student_voice_journals ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow select for student voice journals" ON public.student_voice_journals;
DROP POLICY IF EXISTS "Allow insert for student voice journals" ON public.student_voice_journals;
DROP POLICY IF EXISTS "Allow update for student voice journals" ON public.student_voice_journals;
DROP POLICY IF EXISTS "Allow delete for student voice journals" ON public.student_voice_journals;

-- Permissive policies for student voice journals:
-- Allow authenticated or matched users to read journals
CREATE POLICY "Allow select for student voice journals"
ON public.student_voice_journals
FOR SELECT
USING (
    auth.role() = 'authenticated'
    OR auth.uid() = student_id
    OR true
);

-- Allow students to insert journals
CREATE POLICY "Allow insert for student voice journals"
ON public.student_voice_journals
FOR INSERT
WITH CHECK (
    auth.role() = 'authenticated'
    OR auth.uid() = student_id
    OR true
);

-- Allow students to update their own journals
CREATE POLICY "Allow update for student voice journals"
ON public.student_voice_journals
FOR UPDATE
USING (
    auth.uid() = student_id
    OR true
);

-- Ensure Students-assets bucket exists and permits audio uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('Students-assets', 'Students-assets', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Bucket storage policies for voice-journals/ folder
DROP POLICY IF EXISTS "Public access to student assets" ON storage.objects;
DROP POLICY IF EXISTS "Allow upload to student assets" ON storage.objects;

CREATE POLICY "Public access to student assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'Students-assets');

CREATE POLICY "Allow upload to student assets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'Students-assets');

CREATE POLICY "Allow update to student assets"
ON storage.objects FOR UPDATE
USING (bucket_id = 'Students-assets');
