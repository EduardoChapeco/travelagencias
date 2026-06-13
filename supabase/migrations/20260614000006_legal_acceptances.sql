-- ============================================================
-- Migração: legal_acceptances
-- Criação de tabela para registro único de aceite de termos.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.legal_acceptances (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id        uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  agency_id        uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  terms_type       text NOT NULL CHECK (terms_type IN ('lgpd_memories', 'contract_terms')),
  accepted_at      timestamptz NOT NULL DEFAULT now(),
  ip_address       text,
  user_agent       text,
  UNIQUE(client_id, terms_type)
);

-- RLS
ALTER TABLE public.legal_acceptances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agency_members_read" ON public.legal_acceptances
  FOR SELECT TO authenticated
  USING (agency_id IN (SELECT agency_id FROM public.user_roles WHERE user_id = auth.uid()));

CREATE POLICY "clients_own_acceptances" ON public.legal_acceptances
  FOR ALL TO authenticated
  USING (client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid()))
  WITH CHECK (client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid()));

-- Permitir inserts anon/public para clientes durante login/OTP ou token se necessário
CREATE POLICY "public_insert" ON public.legal_acceptances
  FOR INSERT TO anon
  WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.legal_acceptances TO authenticated;
GRANT SELECT, INSERT ON public.legal_acceptances TO anon;
GRANT ALL ON public.legal_acceptances TO service_role;

COMMENT ON TABLE public.legal_acceptances IS
  'Registros de aceites legais (LGPD para memórias, termos contratuais, etc.) por cliente.';
