-- Migration: 20260613040001_portal_settings_table.sql
-- Cria a tabela de configurações globais do portal público

CREATE TABLE IF NOT EXISTS public.portal_settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE UNIQUE,

  -- SEO Global
  seo_title_suffix text DEFAULT '',
  seo_default_description text DEFAULT '',
  seo_og_image_url text,

  -- Header
  header_style text DEFAULT 'full' CHECK (header_style IN ('simple', 'full', 'minimal')),
  header_cta_label text DEFAULT 'Fale conosco',
  header_cta_url text DEFAULT '#contato',
  nav_links jsonb DEFAULT '[{"label":"Início","url":"/"},{"label":"Blog","url":"/blog"}]',

  -- Footer
  footer_text text DEFAULT '',
  footer_links jsonb DEFAULT '[]',

  -- Scripts e Integrações
  analytics_id text,
  meta_pixel_id text,
  custom_head_script text,

  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Trigger updated_at
DROP TRIGGER IF EXISTS update_portal_settings_updated_at ON public.portal_settings;
CREATE TRIGGER update_portal_settings_updated_at
  BEFORE UPDATE ON public.portal_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE public.portal_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency members can manage portal settings"
  ON public.portal_settings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.agency_id = portal_settings.agency_id
        AND ur.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.agency_id = portal_settings.agency_id
        AND ur.user_id = auth.uid()
    )
  );

-- Portal público lê as settings
CREATE POLICY "Public can read portal settings"
  ON public.portal_settings
  FOR SELECT
  USING (true);

-- Índice
CREATE INDEX IF NOT EXISTS idx_portal_settings_agency
  ON public.portal_settings(agency_id);

COMMENT ON TABLE public.portal_settings IS
  'Configurações globais do portal público por agência: SEO, header, footer, scripts.';
