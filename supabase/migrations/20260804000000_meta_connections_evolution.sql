-- Migration: 20260804000000_meta_connections_evolution.sql
-- Descrição: Evolução do modelo canônico de conexões Meta, Compliance legal, exclusão de dados e persistência do Kanban

-- 1. Evolve whatsapp_connections schema to support Instagram and advanced Meta settings
ALTER TABLE public.whatsapp_connections
  ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'whatsapp' CHECK (provider IN ('whatsapp', 'instagram', 'messenger', 'email', 'webchat')),
  ADD COLUMN IF NOT EXISTS connection_mode text CHECK (connection_mode IN ('whatsapp_cloud_api', 'whatsapp_business_app_coexistence', 'instagram_login', 'facebook_login', 'oauth')),
  ADD COLUMN IF NOT EXISTS verified_name text,
  ADD COLUMN IF NOT EXISTS page_id text,
  ADD COLUMN IF NOT EXISTS instagram_account_id text,
  ADD COLUMN IF NOT EXISTS username text,
  ADD COLUMN IF NOT EXISTS scopes_authorized text[],
  ADD COLUMN IF NOT EXISTS token_expiration timestamptz,
  ADD COLUMN IF NOT EXISTS last_event_received_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_health_check_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_error_message text,
  ADD COLUMN IF NOT EXISTS metadata_validated jsonb DEFAULT '{}'::jsonb;

-- Adjust display_phone_number and other columns to be nullable for non-whatsapp providers
ALTER TABLE public.whatsapp_connections 
  ALTER COLUMN business_id DROP NOT NULL,
  ALTER COLUMN waba_id DROP NOT NULL,
  ALTER COLUMN phone_number_id DROP NOT NULL,
  ALTER COLUMN display_phone_number DROP NOT NULL,
  ALTER COLUMN app_id DROP NOT NULL;

-- 2. Data Subject Requests (Fluxo de Exclusão de Dados)
CREATE TABLE IF NOT EXISTS public.data_subject_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid REFERENCES public.agencies(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  request_type text NOT NULL CHECK (request_type IN ('deletion', 'access', 'portability')),
  status text NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'identity_verification', 'under_review', 'approved', 'partially_approved', 'rejected_with_reason', 'processing', 'completed', 'cancelled')),
  protocol_code text UNIQUE NOT NULL,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.data_subject_request_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.data_subject_requests(id) ON DELETE CASCADE,
  evidence_type text NOT NULL,
  evidence_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS para Data Subject Requests
ALTER TABLE public.data_subject_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_subject_request_evidence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency members manage requests" ON public.data_subject_requests
  FOR ALL USING (is_agency_member(auth.uid(), agency_id));

CREATE POLICY "Agency members manage request evidence" ON public.data_subject_request_evidence
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.data_subject_requests r WHERE r.id = request_id AND is_agency_member(auth.uid(), r.agency_id))
  );

-- Grants
GRANT ALL ON public.data_subject_requests TO service_role;
GRANT ALL ON public.data_subject_requests TO authenticated;
GRANT ALL ON public.data_subject_request_evidence TO service_role;
GRANT ALL ON public.data_subject_request_evidence TO authenticated;

-- 3. Kanban Settings (Persistência real no backend de nomes e ordem das colunas)
CREATE TABLE IF NOT EXISTS public.kanban_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  column_key text NOT NULL, -- Ex: 'todo', 'in_progress', 'done'
  display_label text NOT NULL,
  column_order integer DEFAULT 0,
  is_visible boolean DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(agency_id, user_id, column_key)
);

ALTER TABLE public.kanban_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "manage own kanban settings" ON public.kanban_settings
  FOR ALL USING (agency_id IN (SELECT agency_id FROM public.profiles WHERE id = auth.uid()));

GRANT ALL ON public.kanban_settings TO service_role;
GRANT ALL ON public.kanban_settings TO authenticated;

-- 4. Seed Default Policy Documents
INSERT INTO public.policy_documents (kind, version, content_md, effective_at, is_published)
VALUES 
  ('privacy', '1.0', '# Política de Privacidade - TravelOS\n\nEsta é a Política de Privacidade do TravelOS. Coletamos dados para fornecer e melhorar nossos serviços.', now(), true),
  ('terms', '1.0', '# Termos de Uso - TravelOS\n\nEstes são os Termos de Uso do TravelOS. Ao usar nossos serviços, você concorda com estes termos.', now(), true)
ON CONFLICT (kind, version) DO NOTHING;
