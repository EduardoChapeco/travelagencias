-- ==============================================================================
-- FASE 1: VISTOS & PASSAPORTES (KANBAN)
-- ==============================================================================

-- 1. Estágios do Visto
CREATE TABLE IF NOT EXISTS public.visa_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  name text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  color text NOT NULL DEFAULT '#64748b',
  is_final boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.visa_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Visa stages viewable by agency members" ON public.visa_stages
  FOR SELECT USING (is_agency_member(agency_id));

CREATE POLICY "Visa stages insertable by agency members" ON public.visa_stages
  FOR INSERT WITH CHECK (is_agency_member(agency_id));

CREATE POLICY "Visa stages updatable by agency members" ON public.visa_stages
  FOR UPDATE USING (is_agency_member(agency_id));

CREATE POLICY "Visa stages deletable by agency members" ON public.visa_stages
  FOR DELETE USING (is_agency_member(agency_id));

-- 2. Solicitações de Visto
CREATE TABLE IF NOT EXISTS public.visas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  stage_id uuid NOT NULL REFERENCES public.visa_stages(id),
  owner_id uuid REFERENCES auth.users(id),
  country text NOT NULL,
  category text NOT NULL, -- Turismo, Estudante, Negócios
  status text NOT NULL DEFAULT 'gathering_docs', -- gathering_docs, analyzing, scheduled, issued, denied
  position integer NOT NULL DEFAULT 0,
  expected_date date,
  interview_date timestamptz,
  notes text,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.visas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Visas viewable by agency members" ON public.visas
  FOR SELECT USING (is_agency_member(agency_id));

CREATE POLICY "Visas insertable by agency members" ON public.visas
  FOR INSERT WITH CHECK (is_agency_member(agency_id));

CREATE POLICY "Visas updatable by agency members" ON public.visas
  FOR UPDATE USING (is_agency_member(agency_id));

CREATE POLICY "Visas deletable by agency members" ON public.visas
  FOR DELETE USING (is_agency_member(agency_id));

-- 3. Documentos do Visto
CREATE TABLE IF NOT EXISTS public.visa_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visa_id uuid NOT NULL REFERENCES public.visas(id) ON DELETE CASCADE,
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  title text NOT NULL,
  file_url text NOT NULL,
  is_approved boolean,
  uploaded_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.visa_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Visa docs viewable by agency members" ON public.visa_documents
  FOR SELECT USING (is_agency_member(agency_id));

CREATE POLICY "Visa docs insertable by agency members" ON public.visa_documents
  FOR INSERT WITH CHECK (is_agency_member(agency_id));

CREATE POLICY "Visa docs updatable by agency members" ON public.visa_documents
  FOR UPDATE USING (is_agency_member(agency_id));

CREATE POLICY "Visa docs deletable by agency members" ON public.visa_documents
  FOR DELETE USING (is_agency_member(agency_id));

-- RPC for triggering default visa stages on new agency or manually
CREATE OR REPLACE FUNCTION public.seed_default_visa_stages(p_agency_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM visa_stages WHERE agency_id = p_agency_id) THEN
    INSERT INTO visa_stages (agency_id, name, position, color, is_final) VALUES
      (p_agency_id, 'Triagem', 0, '#94a3b8', false),
      (p_agency_id, 'Coleta de Documentos', 1, '#f59e0b', false),
      (p_agency_id, 'Agendado/Consulado', 2, '#3b82f6', false),
      (p_agency_id, 'Aprovado/Emitido', 3, '#10b981', true),
      (p_agency_id, 'Negado', 4, '#ef4444', true);
  END IF;
END;
$$;
