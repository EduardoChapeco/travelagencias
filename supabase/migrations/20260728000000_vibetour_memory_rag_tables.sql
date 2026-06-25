-- Migration: 20260728000000_vibetour_memory_rag_tables.sql
-- Description: Tabelas de RAG e Conhecimento Vetorial, RLS e Função de Similaridade pgvector

-- Habilitar a extensão vector caso ainda não esteja habilitada (embora já deva estar para o omnichannel)
CREATE EXTENSION IF NOT EXISTS vector;

-- 1. knowledge_sources
CREATE TABLE IF NOT EXISTS public.knowledge_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid REFERENCES public.agencies(id) ON DELETE CASCADE, -- null para fontes globais
  name text NOT NULL,
  scope text NOT NULL DEFAULT 'agency', -- global | agency
  source_type text NOT NULL DEFAULT 'manual', -- website | pdf | manual | chat
  source_url text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.knowledge_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY knowledge_sources_select ON public.knowledge_sources
  FOR SELECT TO authenticated
  USING (
    scope = 'global' OR public.is_agency_member(auth.uid(), agency_id)
  );

CREATE POLICY knowledge_sources_write ON public.knowledge_sources
  FOR ALL TO authenticated
  USING (
    (scope = 'global' AND public.has_role(auth.uid(), 'super_admin'::app_role))
    OR (scope = 'agency' AND public.is_agency_member(auth.uid(), agency_id))
  )
  WITH CHECK (
    (scope = 'global' AND public.has_role(auth.uid(), 'super_admin'::app_role))
    OR (scope = 'agency' AND public.is_agency_member(auth.uid(), agency_id))
  );


-- 2. knowledge_documents
CREATE TABLE IF NOT EXISTS public.knowledge_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid REFERENCES public.knowledge_sources(id) ON DELETE CASCADE,
  agency_id uuid REFERENCES public.agencies(id) ON DELETE CASCADE, -- null para documentos globais
  title text NOT NULL,
  content text,
  category text NOT NULL DEFAULT 'destinations', -- destinations | gateway_rules | hotel_reviews | guidelines
  scope text NOT NULL DEFAULT 'agency', -- global | agency
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.knowledge_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY knowledge_documents_select ON public.knowledge_documents
  FOR SELECT TO authenticated
  USING (
    scope = 'global' OR public.is_agency_member(auth.uid(), agency_id)
  );

CREATE POLICY knowledge_documents_write ON public.knowledge_documents
  FOR ALL TO authenticated
  USING (
    (scope = 'global' AND public.has_role(auth.uid(), 'super_admin'::app_role))
    OR (scope = 'agency' AND public.is_agency_member(auth.uid(), agency_id))
  )
  WITH CHECK (
    (scope = 'global' AND public.has_role(auth.uid(), 'super_admin'::app_role))
    OR (scope = 'agency' AND public.is_agency_member(auth.uid(), agency_id))
  );


-- 3. knowledge_chunks
CREATE TABLE IF NOT EXISTS public.knowledge_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES public.knowledge_documents(id) ON DELETE CASCADE,
  agency_id uuid REFERENCES public.agencies(id) ON DELETE CASCADE, -- null para chunks globais
  content text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.knowledge_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY knowledge_chunks_select ON public.knowledge_chunks
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.knowledge_documents d
      WHERE d.id = document_id AND (d.scope = 'global' OR public.is_agency_member(auth.uid(), d.agency_id))
    )
  );

CREATE POLICY knowledge_chunks_write ON public.knowledge_chunks
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.knowledge_documents d
      WHERE d.id = document_id AND (
        (d.scope = 'global' AND public.has_role(auth.uid(), 'super_admin'::app_role))
        OR (d.scope = 'agency' AND public.is_agency_member(auth.uid(), d.agency_id))
      )
    )
  );


-- 4. knowledge_embeddings
CREATE TABLE IF NOT EXISTS public.knowledge_embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chunk_id uuid REFERENCES public.knowledge_chunks(id) ON DELETE CASCADE,
  agency_id uuid REFERENCES public.agencies(id) ON DELETE CASCADE, -- null para embeddings globais
  embedding vector(1536) NOT NULL,
  embedding_model text NOT NULL DEFAULT 'text-embedding-3-small',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.knowledge_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY knowledge_embeddings_select ON public.knowledge_embeddings
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.knowledge_chunks c
      JOIN public.knowledge_documents d ON d.id = c.document_id
      WHERE c.id = chunk_id AND (d.scope = 'global' OR public.is_agency_member(auth.uid(), d.agency_id))
    )
  );

CREATE POLICY knowledge_embeddings_write ON public.knowledge_embeddings
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.knowledge_chunks c
      JOIN public.knowledge_documents d ON d.id = c.document_id
      WHERE c.id = chunk_id AND (
        (d.scope = 'global' AND public.has_role(auth.uid(), 'super_admin'::app_role))
        OR (d.scope = 'agency' AND public.is_agency_member(auth.uid(), d.agency_id))
      )
    )
  );

-- Criar índice HNSW para otimização da busca vetorial (distância cosseno)
CREATE INDEX IF NOT EXISTS knowledge_embeddings_hnsw_idx 
  ON public.knowledge_embeddings 
  USING hnsw (embedding vector_cosine_ops);


-- 5. Função de busca por similaridade (match_knowledge_embeddings)
CREATE OR REPLACE FUNCTION public.match_knowledge_embeddings(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  p_agency_id uuid,
  p_category text DEFAULT NULL
)
RETURNS TABLE (
  chunk_id uuid,
  document_title text,
  content text,
  category text,
  scope text,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id AS chunk_id,
    d.title AS document_title,
    c.content,
    d.category,
    d.scope,
    1 - (e.embedding <=> query_embedding) AS similarity
  FROM public.knowledge_embeddings e
  JOIN public.knowledge_chunks c ON c.id = e.chunk_id
  JOIN public.knowledge_documents d ON d.id = c.document_id
  WHERE (d.scope = 'global' OR d.agency_id = p_agency_id)
    AND (p_category IS NULL OR d.category = p_category)
    AND 1 - (e.embedding <=> query_embedding) > match_threshold
  ORDER BY e.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.match_knowledge_embeddings(vector(1536), float, int, uuid, text) TO authenticated;
