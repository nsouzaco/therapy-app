-- RAG Knowledge Base Migration
-- Enable pgvector extension for similarity search

CREATE EXTENSION IF NOT EXISTS vector;

-- Therapist documents table
-- Stores metadata about uploaded documents (research, protocols, preferences, etc.)
CREATE TABLE IF NOT EXISTS public.therapist_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  therapist_id UUID NOT NULL REFERENCES public.therapist_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  filename TEXT,
  source_type TEXT NOT NULL CHECK (source_type IN ('research', 'protocol', 'technique', 'worksheet', 'preference', 'other')),
  description TEXT,
  file_size_bytes INTEGER,
  chunk_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Document chunks with embeddings
-- Each document is split into chunks for semantic search
CREATE TABLE IF NOT EXISTS public.document_chunks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES public.therapist_documents(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding VECTOR(1536), -- OpenAI text-embedding-ada-002 dimensions
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_therapist_documents_therapist ON public.therapist_documents(therapist_id);
CREATE INDEX IF NOT EXISTS idx_therapist_documents_type ON public.therapist_documents(source_type);
CREATE INDEX IF NOT EXISTS idx_document_chunks_document ON public.document_chunks(document_id);

-- Vector similarity search index (IVFFlat for approximate nearest neighbor)
-- Note: Run this after inserting some data, or use HNSW for small datasets
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding ON public.document_chunks 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Enable Row Level Security
ALTER TABLE public.therapist_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for therapist_documents
-- Therapists can only see their own documents
CREATE POLICY "Therapists can view own documents" ON public.therapist_documents
  FOR SELECT USING (
    therapist_id IN (
      SELECT id FROM public.therapist_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Therapists can insert own documents" ON public.therapist_documents
  FOR INSERT WITH CHECK (
    therapist_id IN (
      SELECT id FROM public.therapist_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Therapists can update own documents" ON public.therapist_documents
  FOR UPDATE USING (
    therapist_id IN (
      SELECT id FROM public.therapist_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Therapists can delete own documents" ON public.therapist_documents
  FOR DELETE USING (
    therapist_id IN (
      SELECT id FROM public.therapist_profiles WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for document_chunks
-- Therapists can only access chunks from their own documents
CREATE POLICY "Therapists can view own document chunks" ON public.document_chunks
  FOR SELECT USING (
    document_id IN (
      SELECT d.id FROM public.therapist_documents d
      JOIN public.therapist_profiles tp ON d.therapist_id = tp.id
      WHERE tp.user_id = auth.uid()
    )
  );

CREATE POLICY "Therapists can insert own document chunks" ON public.document_chunks
  FOR INSERT WITH CHECK (
    document_id IN (
      SELECT d.id FROM public.therapist_documents d
      JOIN public.therapist_profiles tp ON d.therapist_id = tp.id
      WHERE tp.user_id = auth.uid()
    )
  );

CREATE POLICY "Therapists can delete own document chunks" ON public.document_chunks
  FOR DELETE USING (
    document_id IN (
      SELECT d.id FROM public.therapist_documents d
      JOIN public.therapist_profiles tp ON d.therapist_id = tp.id
      WHERE tp.user_id = auth.uid()
    )
  );

-- Function for similarity search
-- Returns chunks similar to the query embedding
CREATE OR REPLACE FUNCTION match_document_chunks(
  query_embedding VECTOR(1536),
  match_therapist_id UUID,
  match_count INT DEFAULT 5,
  match_source_types TEXT[] DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  document_id UUID,
  content TEXT,
  similarity FLOAT,
  document_title TEXT,
  source_type TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dc.id,
    dc.document_id,
    dc.content,
    1 - (dc.embedding <=> query_embedding) AS similarity,
    td.title AS document_title,
    td.source_type
  FROM public.document_chunks dc
  JOIN public.therapist_documents td ON dc.document_id = td.id
  WHERE td.therapist_id = match_therapist_id
    AND (match_source_types IS NULL OR td.source_type = ANY(match_source_types))
    AND dc.embedding IS NOT NULL
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_therapist_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_therapist_documents_updated_at
  BEFORE UPDATE ON public.therapist_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_therapist_documents_updated_at();

