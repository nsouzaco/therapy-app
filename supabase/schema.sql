-- Tava Health Database Schema
-- Run this in Supabase SQL Editor to set up the database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('therapist', 'client')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Therapist profiles
CREATE TABLE public.therapist_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  license_number TEXT,
  preferences JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Client profiles
CREATE TABLE public.client_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  therapist_id UUID NOT NULL REFERENCES public.therapist_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Sessions (therapy sessions with transcripts)
CREATE TABLE public.sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES public.client_profiles(id) ON DELETE CASCADE,
  session_date DATE NOT NULL,
  transcript_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Treatment plans (one per client)
CREATE TABLE public.treatment_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID UNIQUE NOT NULL REFERENCES public.client_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Plan versions (versioned content)
CREATE TABLE public.plan_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id UUID NOT NULL REFERENCES public.treatment_plans(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  source_session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved')),
  content JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(plan_id, version_number)
);

-- Indexes for performance
CREATE INDEX idx_client_profiles_therapist ON public.client_profiles(therapist_id);
CREATE INDEX idx_sessions_client ON public.sessions(client_id);
CREATE INDEX idx_sessions_date ON public.sessions(session_date DESC);
CREATE INDEX idx_plan_versions_plan ON public.plan_versions(plan_id);
CREATE INDEX idx_plan_versions_status ON public.plan_versions(status);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.therapist_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treatment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_versions ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users: Users can read their own data
CREATE POLICY "Users can view own data" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Therapist profiles: Therapists can manage their own profile
CREATE POLICY "Therapists can view own profile" ON public.therapist_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Therapists can update own profile" ON public.therapist_profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Client profiles: Therapists can see their clients, clients can see themselves
CREATE POLICY "Therapists can view their clients" ON public.client_profiles
  FOR SELECT USING (
    therapist_id IN (
      SELECT id FROM public.therapist_profiles WHERE user_id = auth.uid()
    )
    OR user_id = auth.uid()
  );

CREATE POLICY "Therapists can create clients" ON public.client_profiles
  FOR INSERT WITH CHECK (
    therapist_id IN (
      SELECT id FROM public.therapist_profiles WHERE user_id = auth.uid()
    )
  );

-- Sessions: Therapists can manage their clients' sessions, clients can view their own
CREATE POLICY "Therapists can manage client sessions" ON public.sessions
  FOR ALL USING (
    client_id IN (
      SELECT cp.id FROM public.client_profiles cp
      JOIN public.therapist_profiles tp ON cp.therapist_id = tp.id
      WHERE tp.user_id = auth.uid()
    )
  );

CREATE POLICY "Clients can view own sessions" ON public.sessions
  FOR SELECT USING (
    client_id IN (
      SELECT id FROM public.client_profiles WHERE user_id = auth.uid()
    )
  );

-- Treatment plans: Same pattern as sessions
CREATE POLICY "Therapists can manage client plans" ON public.treatment_plans
  FOR ALL USING (
    client_id IN (
      SELECT cp.id FROM public.client_profiles cp
      JOIN public.therapist_profiles tp ON cp.therapist_id = tp.id
      WHERE tp.user_id = auth.uid()
    )
  );

CREATE POLICY "Clients can view own plan" ON public.treatment_plans
  FOR SELECT USING (
    client_id IN (
      SELECT id FROM public.client_profiles WHERE user_id = auth.uid()
    )
  );

-- Plan versions: Same pattern
CREATE POLICY "Therapists can manage plan versions" ON public.plan_versions
  FOR ALL USING (
    plan_id IN (
      SELECT tp.id FROM public.treatment_plans tp
      JOIN public.client_profiles cp ON tp.client_id = cp.id
      JOIN public.therapist_profiles thp ON cp.therapist_id = thp.id
      WHERE thp.user_id = auth.uid()
    )
  );

CREATE POLICY "Clients can view own plan versions" ON public.plan_versions
  FOR SELECT USING (
    plan_id IN (
      SELECT tp.id FROM public.treatment_plans tp
      JOIN public.client_profiles cp ON tp.client_id = cp.id
      WHERE cp.user_id = auth.uid()
    )
    AND status = 'approved'
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for treatment_plans updated_at
CREATE TRIGGER update_treatment_plans_updated_at
  BEFORE UPDATE ON public.treatment_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to handle new user registration
-- This is called via a trigger when a new auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'client')
  );
  
  -- If therapist, create therapist profile
  IF COALESCE(NEW.raw_user_meta_data->>'role', 'client') = 'therapist' THEN
    INSERT INTO public.therapist_profiles (user_id)
    VALUES (NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user record on auth signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

