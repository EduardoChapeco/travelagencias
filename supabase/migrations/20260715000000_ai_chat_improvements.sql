-- Migration: 20260715000000_ai_chat_improvements.sql
-- Description: Tabelas de feedback de IA, memórias de RAG da agência e políticas de auditoria de chat para gestores

-- 1. Tabela de Feedback de IA
CREATE TABLE IF NOT EXISTS public.ai_chat_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid REFERENCES public.ai_chat_messages(id) ON DELETE CASCADE,
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating int NOT NULL CHECK (rating IN (-1, 1)),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Habilitar RLS e criar políticas
ALTER TABLE public.ai_chat_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS feedback_select ON public.ai_chat_feedback;
CREATE POLICY feedback_select ON public.ai_chat_feedback
  FOR SELECT TO authenticated USING (
    public.is_agency_member(auth.uid(), agency_id)
  );

DROP POLICY IF EXISTS feedback_insert ON public.ai_chat_feedback;
CREATE POLICY feedback_insert ON public.ai_chat_feedback
  FOR INSERT TO authenticated WITH CHECK (
    user_id = auth.uid() AND public.is_agency_member(auth.uid(), agency_id)
  );

-- 2. Tabela de Memórias de Longo Prazo e RAG da Agência
CREATE TABLE IF NOT EXISTS public.ai_agency_memories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('process', 'preference', 'instruction')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Habilitar RLS e criar políticas
ALTER TABLE public.ai_agency_memories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS memories_select ON public.ai_agency_memories;
CREATE POLICY memories_select ON public.ai_agency_memories
  FOR SELECT TO authenticated USING (
    public.is_agency_member(auth.uid(), agency_id)
  );

DROP POLICY IF EXISTS memories_all ON public.ai_agency_memories;
CREATE POLICY memories_all ON public.ai_agency_memories
  FOR ALL TO authenticated USING (
    public.has_role(auth.uid(), 'agency_admin', agency_id) OR
    public.has_role(auth.uid(), 'super_admin'::public.app_role)
  );

-- Trigger set_updated_at para ai_agency_memories
DROP TRIGGER IF EXISTS ai_agency_memories_touch ON public.ai_agency_memories;
CREATE TRIGGER ai_agency_memories_touch BEFORE UPDATE ON public.ai_agency_memories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. Atualizar Políticas de Leitura de ai_chat_messages para auditoria do gestor
DROP POLICY IF EXISTS acm_read ON public.ai_chat_messages;
CREATE POLICY acm_read ON public.ai_chat_messages 
  FOR SELECT TO authenticated USING (
    public.is_agency_member(auth.uid(), agency_id) AND (
      user_id = auth.uid() 
      OR public.has_role(auth.uid(), 'agency_admin', agency_id)
      OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
    )
  );

-- 4. Extensão pgvector e Busca Semântica
CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE public.ai_agency_memories 
  ADD COLUMN IF NOT EXISTS embedding vector(1536);

CREATE OR REPLACE FUNCTION public.match_memories (
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  _agency_id uuid
)
RETURNS TABLE (
  id uuid,
  category text,
  content text,
  similarity float
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.category,
    m.content,
    1 - (m.embedding <=> query_embedding) AS similarity
  FROM public.ai_agency_memories m
  WHERE m.agency_id = _agency_id
    AND 1 - (m.embedding <=> query_embedding) > match_threshold
  ORDER BY m.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.match_memories(vector(1536), float, int, uuid) TO authenticated;

