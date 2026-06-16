-- ==============================================================================
-- PROPOSED DATABASE MIGRATIONS FOR OMNICHANNEL CHAT & AI-FIRST ARCHITECTURE
-- ==============================================================================

-- 1. Enable pgvector Extension (for semantic RAG search & memory embeddings)
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Knowledge Playbooks Tables (Operational procedures & playbooks)
CREATE TABLE IF NOT EXISTS public.knowledge_playbooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid REFERENCES public.agencies(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  category text DEFAULT 'Geral',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.knowledge_playbook_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  playbook_id uuid REFERENCES public.knowledge_playbooks(id) ON DELETE CASCADE,
  step_number integer NOT NULL,
  title text NOT NULL,
  description text,
  cancellation_provider text, -- Target operator/supplier (e.g. ViagensPromo, RexturAdvance)
  ai_guidelines text, -- Explicit guidelines for the AI to follow during RAG
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS & Policies
ALTER TABLE public.knowledge_playbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_playbook_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage playbooks of their agency" ON public.knowledge_playbooks
  FOR ALL USING (is_agency_member(auth.uid(), agency_id));

CREATE POLICY "Users can manage playbook steps of their agency" ON public.knowledge_playbook_steps
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.knowledge_playbooks p
      WHERE p.id = playbook_id AND is_agency_member(auth.uid(), p.agency_id)
    )
  );

-- 3. RAG Conversational Embeddings Table (Vetorização de memórias do chat)
CREATE TABLE IF NOT EXISTS public.omnichannel_message_embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid REFERENCES public.omnichannel_messages(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  agency_id uuid REFERENCES public.agencies(id) ON DELETE CASCADE,
  content text NOT NULL,
  embedding vector(1536), -- 1536-dimension vector for OpenAI embeddings
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.omnichannel_message_embeddings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read embeddings of their agency" ON public.omnichannel_message_embeddings
  FOR SELECT USING (is_agency_member(auth.uid(), agency_id));

-- Index for vector cosine distance query optimization
CREATE INDEX IF NOT EXISTS idx_omnichannel_message_embeddings_vector 
  ON public.omnichannel_message_embeddings 
  USING hnsw (embedding vector_cosine_ops);

-- 4. Visual Workflow Orchestration (n8n-like automated triggers & actions)
CREATE TABLE IF NOT EXISTS public.workflow_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid REFERENCES public.agencies(id) ON DELETE CASCADE,
  name text NOT NULL,
  trigger_type text NOT NULL, -- message_inbound, lead_created, proposal_approved, contract_signed, cron
  is_active boolean DEFAULT true NOT NULL,
  config jsonb DEFAULT '{}'::jsonb NOT NULL, -- Nodes structure: triggers and action blocks
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.workflow_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid REFERENCES public.workflow_definitions(id) ON DELETE CASCADE,
  agency_id uuid REFERENCES public.agencies(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'running', -- running, success, failed
  logs jsonb DEFAULT '[]'::jsonb NOT NULL, -- Log details for each node execution
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.workflow_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage workflows of their agency" ON public.workflow_definitions
  FOR ALL USING (is_agency_member(auth.uid(), agency_id));

CREATE POLICY "Users can read workflow runs of their agency" ON public.workflow_runs
  FOR SELECT USING (is_agency_member(auth.uid(), agency_id));
