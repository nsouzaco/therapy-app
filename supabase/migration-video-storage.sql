-- Migration: Add video storage support to sessions
-- Allows storing video URLs and metadata for playback

-- Add video columns to sessions table
ALTER TABLE public.sessions
ADD COLUMN IF NOT EXISTS video_url TEXT,
ADD COLUMN IF NOT EXISTS video_filename TEXT,
ADD COLUMN IF NOT EXISTS video_duration_seconds INTEGER,
ADD COLUMN IF NOT EXISTS video_mime_type TEXT;

-- Create storage bucket for session videos (run in Supabase dashboard)
-- Note: This needs to be done via Supabase dashboard or CLI
-- INSERT INTO storage.buckets (id, name, public) VALUES ('session-videos', 'session-videos', false);

-- RLS policy for session videos storage bucket
-- (Run after creating bucket in dashboard)
-- CREATE POLICY "Therapists can upload videos" ON storage.objects
--   FOR INSERT
--   WITH CHECK (
--     bucket_id = 'session-videos' AND
--     auth.uid() IN (
--       SELECT user_id FROM public.therapist_profiles
--     )
--   );

-- CREATE POLICY "Users can view their session videos" ON storage.objects
--   FOR SELECT
--   USING (
--     bucket_id = 'session-videos' AND
--     (
--       -- Therapists can see their clients' videos
--       auth.uid() IN (
--         SELECT tp.user_id 
--         FROM public.therapist_profiles tp
--         JOIN public.client_profiles cp ON cp.therapist_id = tp.id
--         JOIN public.sessions s ON s.client_id = cp.id
--         WHERE s.video_url LIKE '%' || name
--       )
--       OR
--       -- Clients can see their own videos
--       auth.uid() IN (
--         SELECT cp.user_id
--         FROM public.client_profiles cp
--         JOIN public.sessions s ON s.client_id = cp.id
--         WHERE s.video_url LIKE '%' || name
--       )
--     )
--   );

COMMENT ON COLUMN public.sessions.video_url IS 'URL to the video file in Supabase storage';
COMMENT ON COLUMN public.sessions.video_filename IS 'Original filename of the uploaded video';
COMMENT ON COLUMN public.sessions.video_duration_seconds IS 'Duration of the video in seconds';
COMMENT ON COLUMN public.sessions.video_mime_type IS 'MIME type of the video (e.g., video/mp4)';

