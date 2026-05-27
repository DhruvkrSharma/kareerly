-- 002_pgvector_setup.sql
-- Run this in the Supabase SQL Editor to enable AI vector search

-- 1. Enable the pgvector extension to work with embedding vectors
create extension if not exists vector;

-- 2. Add embedding columns to jobs and profiles
-- We use 384 dimensions because we'll use the 'all-MiniLM-L6-v2' model from HuggingFace
alter table jobs add column if not exists embedding vector(384);
alter table profiles add column if not exists embedding vector(384);

-- 3. Create HNSW indexes for fast cosine distance search
-- (Cosine distance is 1 - cosine similarity)
create index if not exists jobs_embedding_idx on jobs using hnsw (embedding vector_cosine_ops);
create index if not exists profiles_embedding_idx on profiles using hnsw (embedding vector_cosine_ops);

-- 4. Create a function to match a profile to jobs
-- This returns jobs sorted by similarity to the user's profile embedding
create or replace function match_jobs (
  query_embedding vector(384),
  match_threshold float,
  match_count int
)
returns table (
  id bigint,
  title text,
  company_id bigint,
  similarity float
)
language sql stable
as $$
  select
    jobs.id,
    jobs.title,
    jobs.company_id,
    1 - (jobs.embedding <=> query_embedding) as similarity
  from jobs
  where 1 - (jobs.embedding <=> query_embedding) > match_threshold
    and jobs.is_active = true
  order by jobs.embedding <=> query_embedding
  limit match_count;
$$;
