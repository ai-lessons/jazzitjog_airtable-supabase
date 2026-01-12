-- Migration: Create evidence_chunks and evidence_chunk_models tables
-- Purpose: Store article text chunks with embeddings and link them to shoe models
-- Created: 2026-01-11

-- Enable pgvector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Table: evidence_chunks
-- Stores text chunks from articles with embeddings for semantic search
CREATE TABLE IF NOT EXISTS public.evidence_chunks (
  chunk_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_link TEXT NOT NULL,
  article_id_int BIGINT,
  source_title TEXT,
  chunk_type TEXT NOT NULL CHECK (chunk_type IN ('review', 'comparison', 'other')),
  chunk_text TEXT NOT NULL,
  chunk_hash TEXT NOT NULL,
  embedding vector(1536),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure uniqueness per source and content
  CONSTRAINT evidence_chunks_source_hash_unique UNIQUE (source_link, chunk_hash)
);

-- Table: evidence_chunk_models
-- Links chunks to specific shoe models with confidence scores
CREATE TABLE IF NOT EXISTS public.evidence_chunk_models (
  chunk_id UUID NOT NULL REFERENCES public.evidence_chunks(chunk_id) ON DELETE CASCADE,
  id_model UUID NOT NULL,
  match_confidence INTEGER NOT NULL CHECK (match_confidence >= 0 AND match_confidence <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure each chunk-model pair is unique
  CONSTRAINT evidence_chunk_models_pkey PRIMARY KEY (chunk_id, id_model)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_evidence_chunks_source_link ON public.evidence_chunks(source_link);
CREATE INDEX IF NOT EXISTS idx_evidence_chunks_article_id_int ON public.evidence_chunks(article_id_int);
CREATE INDEX IF NOT EXISTS idx_evidence_chunks_chunk_type ON public.evidence_chunks(chunk_type);
CREATE INDEX IF NOT EXISTS idx_evidence_chunks_embedding ON public.evidence_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_evidence_chunk_models_id_model ON public.evidence_chunk_models(id_model);
CREATE INDEX IF NOT EXISTS idx_evidence_chunk_models_confidence ON public.evidence_chunk_models(match_confidence);

-- Comments for documentation
COMMENT ON TABLE public.evidence_chunks IS 'Text chunks from articles with embeddings for semantic search';
COMMENT ON TABLE public.evidence_chunk_models IS 'Links chunks to shoe models with confidence scores';

COMMENT ON COLUMN public.evidence_chunks.chunk_type IS 'Type of chunk: review (single model), comparison (multiple models), or other';
COMMENT ON COLUMN public.evidence_chunks.chunk_hash IS 'SHA256 hash of normalized chunk_text for deduplication';
COMMENT ON COLUMN public.evidence_chunks.embedding IS 'Vector embedding (1536 dimensions) for semantic search';
COMMENT ON COLUMN public.evidence_chunk_models.match_confidence IS 'Confidence score 0-100 for chunk-model association';
