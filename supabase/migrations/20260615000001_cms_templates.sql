-- Migration: 20260615000001_cms_templates
-- Objetivo: Criar tabela para salvar templates padrão do CMS para rápida clonagem.

CREATE TABLE IF NOT EXISTS public.cms_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid REFERENCES public.agencies(id) ON DELETE CASCADE, -- NULL if global template
  name text NOT NULL,
  category text NOT NULL DEFAULT 'landing_page', -- 'landing_page', 'biolink', 'group_tour'
  blocks jsonb NOT NULL DEFAULT '[]'::jsonb,
  seo_defaults jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_public boolean NOT NULL DEFAULT false, -- If true, can be cloned by any agency
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cms_templates ENABLE ROW LEVEL SECURITY;

-- Agency members can read global public templates or their own
DROP POLICY IF EXISTS "read_cms_templates" ON public.cms_templates;
CREATE POLICY "read_cms_templates" ON public.cms_templates
  FOR SELECT TO authenticated
  USING (is_public = true OR public.is_agency_member(auth.uid(), agency_id));

-- Agency admins can create/update their own templates
DROP POLICY IF EXISTS "write_cms_templates" ON public.cms_templates;
CREATE POLICY "write_cms_templates" ON public.cms_templates
  FOR ALL TO authenticated
  USING (public.is_agency_member(auth.uid(), agency_id));

DROP TRIGGER IF EXISTS trg_cms_templates_updated_at ON public.cms_templates;
CREATE TRIGGER trg_cms_templates_updated_at 
  BEFORE UPDATE ON public.cms_templates 
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
