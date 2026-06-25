-- Migration: Criação das tabelas para controle de sincronização e mapeamento do GDS Infotravel
-- Autor: Antigravity AI
-- Data: 2026-06-24

CREATE TABLE IF NOT EXISTS public.external_entity_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  entity_type TEXT NOT NULL, -- 'trip', 'client', 'passenger', 'financial_ledger_entry'
  external_id TEXT NOT NULL,
  internal_id UUID NOT NULL,
  sync_status TEXT DEFAULT 'synced', -- 'synced', 'pending', 'conflict'
  last_sync_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (agency_id, provider, entity_type, external_id),
  UNIQUE (agency_id, provider, entity_type, internal_id)
);

CREATE TABLE IF NOT EXISTS public.sync_checkpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  cursor_value TEXT,
  last_run_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (agency_id, provider)
);

-- RLS
ALTER TABLE public.external_entity_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_checkpoints ENABLE ROW LEVEL SECURITY;

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.external_entity_links TO authenticated;
GRANT ALL ON public.external_entity_links TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sync_checkpoints TO authenticated;
GRANT ALL ON public.sync_checkpoints TO service_role;

-- Policies external_entity_links
CREATE POLICY "agency members read external_entity_links" ON public.external_entity_links
  FOR SELECT TO authenticated USING (public.is_agency_member(auth.uid(), agency_id));

CREATE POLICY "agency members insert external_entity_links" ON public.external_entity_links
  FOR INSERT TO authenticated WITH CHECK (public.is_agency_member(auth.uid(), agency_id));

CREATE POLICY "agency members update external_entity_links" ON public.external_entity_links
  FOR UPDATE TO authenticated USING (public.is_agency_member(auth.uid(), agency_id));

CREATE POLICY "agency members delete external_entity_links" ON public.external_entity_links
  FOR DELETE TO authenticated USING (public.is_agency_member(auth.uid(), agency_id));

-- Policies sync_checkpoints
CREATE POLICY "agency members read sync_checkpoints" ON public.sync_checkpoints
  FOR SELECT TO authenticated USING (public.is_agency_member(auth.uid(), agency_id));

CREATE POLICY "agency members write sync_checkpoints" ON public.sync_checkpoints
  FOR ALL TO authenticated USING (public.is_agency_member(auth.uid(), agency_id));
