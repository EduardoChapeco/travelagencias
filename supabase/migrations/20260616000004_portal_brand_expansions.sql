-- Migration: Expand Brand Kit and create public leads/AI generation log tables
-- Add missing branding columns to brand_kit
ALTER TABLE public.brand_kit
  ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '#1E3A5F',
  ADD COLUMN IF NOT EXISTS secondary_color TEXT DEFAULT '#D4AF37',
  ADD COLUMN IF NOT EXISTS accent_color TEXT DEFAULT '#E63946',
  ADD COLUMN IF NOT EXISTS background_color TEXT DEFAULT '#FFFFFF',
  ADD COLUMN IF NOT EXISTS text_color TEXT DEFAULT '#111827',
  ADD COLUMN IF NOT EXISTS logo_white_url TEXT;

-- Create public_leads table for landing page CTAs
CREATE TABLE IF NOT EXISTS public.public_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  site_id UUID REFERENCES public.portal_pages(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  subject TEXT,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS for public_leads
ALTER TABLE public.public_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public can insert leads" ON public.public_leads
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "agency members read leads" ON public.public_leads
  FOR SELECT TO authenticated USING (public.is_agency_member(auth.uid(), agency_id));

-- Grant permissions for public_leads
GRANT SELECT, INSERT, UPDATE, DELETE ON public.public_leads TO authenticated;
GRANT INSERT ON public.public_leads TO anon;
GRANT ALL ON public.public_leads TO service_role;


-- Create ai_generation_logs table
CREATE TABLE IF NOT EXISTS public.ai_generation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  site_id UUID REFERENCES public.portal_pages(id) ON DELETE SET NULL,
  user_prompt TEXT NOT NULL,
  conversation_history JSONB DEFAULT '[]'::jsonb,
  sections_generated TEXT[],
  model_used TEXT,
  tokens_used INTEGER,
  status TEXT DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS for ai_generation_logs
ALTER TABLE public.ai_generation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agency members can manage AI generation logs" ON public.ai_generation_logs
  FOR ALL TO authenticated USING (public.is_agency_member(auth.uid(), agency_id));

-- Grant permissions for ai_generation_logs
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_generation_logs TO authenticated;
GRANT ALL ON public.ai_generation_logs TO service_role;
