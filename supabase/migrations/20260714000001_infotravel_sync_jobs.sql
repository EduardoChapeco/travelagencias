-- Migration: Criação da tabela sync_jobs para auditoria e controle de execuções de sincronização
-- Autor: Antigravity AI
-- Data: 2026-06-24

CREATE TABLE IF NOT EXISTS public.sync_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  job_type TEXT NOT NULL, -- 'backfill', 'polling'
  status TEXT DEFAULT 'running', -- 'running', 'completed', 'failed'
  records_processed INTEGER DEFAULT 0,
  errors_log JSONB DEFAULT '[]'::jsonb,
  started_at TIMESTAMPTZ DEFAULT now(),
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.sync_jobs ENABLE ROW LEVEL SECURITY;

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sync_jobs TO authenticated;
GRANT ALL ON public.sync_jobs TO service_role;

-- Policies
CREATE POLICY "agency members read sync_jobs" ON public.sync_jobs
  FOR SELECT TO authenticated USING (public.is_agency_member(auth.uid(), agency_id));

CREATE POLICY "agency members write sync_jobs" ON public.sync_jobs
  FOR ALL TO authenticated USING (public.is_agency_member(auth.uid(), agency_id));

-- Trigger de updated_at
DROP TRIGGER IF EXISTS sync_jobs_touch ON public.sync_jobs;
CREATE TRIGGER sync_jobs_touch
  BEFORE UPDATE ON public.sync_jobs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
