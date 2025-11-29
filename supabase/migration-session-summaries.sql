-- Migration: Add session summaries
-- Run this in Supabase SQL Editor

-- Add summary columns to sessions table
ALTER TABLE public.sessions 
ADD COLUMN IF NOT EXISTS summary_therapist TEXT,
ADD COLUMN IF NOT EXISTS summary_client TEXT,
ADD COLUMN IF NOT EXISTS key_themes TEXT[],
ADD COLUMN IF NOT EXISTS progress_notes TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_sessions_summary ON public.sessions(id) WHERE summary_therapist IS NOT NULL;

