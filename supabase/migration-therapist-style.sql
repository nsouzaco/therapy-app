-- Migration: Add therapist style profile tables
-- This enables automatic extraction and storage of therapist clinical style from session transcripts

-- Store aggregated therapist style profile
CREATE TABLE IF NOT EXISTS public.therapist_style_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  therapist_id UUID UNIQUE NOT NULL REFERENCES public.therapist_profiles(id) ON DELETE CASCADE,
  
  -- Detected modalities and approaches
  primary_modality TEXT,  -- e.g., 'CBT', 'ACT', 'DBT', 'Psychodynamic'
  secondary_modalities TEXT[] DEFAULT '{}',
  modality_indicators JSONB DEFAULT '{}',  -- evidence for each modality
  
  -- Intervention patterns
  common_interventions TEXT[] DEFAULT '{}',
  homework_style TEXT,  -- e.g., 'structured', 'flexible', 'minimal'
  
  -- Communication style
  tone TEXT,  -- e.g., 'warm', 'clinical', 'warm-clinical', 'direct'
  pacing TEXT,  -- e.g., 'exploratory', 'directive', 'balanced'
  uses_metaphors BOOLEAN DEFAULT false,
  
  -- Signature elements
  signature_phrases TEXT[] DEFAULT '{}',
  focus_areas TEXT[] DEFAULT '{}',  -- e.g., 'strengths-based', 'trauma-informed'
  
  -- Metadata
  sessions_analyzed INT DEFAULT 0,
  confidence_score FLOAT DEFAULT 0,  -- 0-1 based on data amount
  last_extraction_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Store per-session style extractions (for aggregation and history)
CREATE TABLE IF NOT EXISTS public.session_style_extractions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  therapist_id UUID NOT NULL REFERENCES public.therapist_profiles(id) ON DELETE CASCADE,
  
  -- Raw extraction from AI
  extraction JSONB NOT NULL,
  
  -- Key extracted fields (denormalized for querying)
  detected_modalities TEXT[] DEFAULT '{}',
  detected_interventions TEXT[] DEFAULT '{}',
  detected_tone TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- One extraction per session
  UNIQUE(session_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_style_profiles_therapist ON public.therapist_style_profiles(therapist_id);
CREATE INDEX IF NOT EXISTS idx_style_extractions_therapist ON public.session_style_extractions(therapist_id);
CREATE INDEX IF NOT EXISTS idx_style_extractions_session ON public.session_style_extractions(session_id);

-- Enable RLS
ALTER TABLE public.therapist_style_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_style_extractions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for therapist_style_profiles
CREATE POLICY "Therapists can view own style profile" ON public.therapist_style_profiles
  FOR SELECT USING (
    therapist_id IN (
      SELECT id FROM public.therapist_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Therapists can manage own style profile" ON public.therapist_style_profiles
  FOR ALL USING (
    therapist_id IN (
      SELECT id FROM public.therapist_profiles WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for session_style_extractions
CREATE POLICY "Therapists can view own session extractions" ON public.session_style_extractions
  FOR SELECT USING (
    therapist_id IN (
      SELECT id FROM public.therapist_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Therapists can manage own session extractions" ON public.session_style_extractions
  FOR ALL USING (
    therapist_id IN (
      SELECT id FROM public.therapist_profiles WHERE user_id = auth.uid()
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_therapist_style_profiles_updated_at
  BEFORE UPDATE ON public.therapist_style_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

