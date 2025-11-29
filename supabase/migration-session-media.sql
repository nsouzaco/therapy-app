-- Add media_storage_path column to sessions table for video playback
ALTER TABLE public.sessions
ADD COLUMN IF NOT EXISTS media_storage_path TEXT;

-- Create storage bucket for session media files (if not exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'session-media',
  'session-media',
  false,
  104857600, -- 100MB limit
  ARRAY['audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/m4a', 'audio/wav', 'audio/webm', 'audio/ogg', 'video/mp4', 'video/webm', 'video/quicktime']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 104857600,
  allowed_mime_types = ARRAY['audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/m4a', 'audio/wav', 'audio/webm', 'audio/ogg', 'video/mp4', 'video/webm', 'video/quicktime'];

-- Drop existing policies if they exist (to allow clean recreation)
DROP POLICY IF EXISTS "Therapists can upload session media" ON storage.objects;
DROP POLICY IF EXISTS "Therapists can read session media" ON storage.objects;
DROP POLICY IF EXISTS "Therapists can delete session media" ON storage.objects;

-- Allow authenticated users to upload to their client folders
CREATE POLICY "Therapists can upload session media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'session-media'
  AND (storage.foldername(name))[1] IN (
    SELECT cp.id::text FROM public.client_profiles cp
    JOIN public.therapist_profiles tp ON cp.therapist_id = tp.id
    WHERE tp.user_id = auth.uid()
  )
);

-- Allow therapists to read their clients' media
CREATE POLICY "Therapists can read session media"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'session-media'
  AND (storage.foldername(name))[1] IN (
    SELECT cp.id::text FROM public.client_profiles cp
    JOIN public.therapist_profiles tp ON cp.therapist_id = tp.id
    WHERE tp.user_id = auth.uid()
  )
);

-- Allow therapists to delete their clients' media
CREATE POLICY "Therapists can delete session media"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'session-media'
  AND (storage.foldername(name))[1] IN (
    SELECT cp.id::text FROM public.client_profiles cp
    JOIN public.therapist_profiles tp ON cp.therapist_id = tp.id
    WHERE tp.user_id = auth.uid()
  )
);

