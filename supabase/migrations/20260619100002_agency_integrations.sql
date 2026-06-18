-- Migration: 20260614000002_agency_integrations
-- Objetivo: Criar tabela para armazenar integrações por agência (Meta CAPI, WhatsApp, etc) integrando com Supabase Vault

-- Habilitar a extensão do Vault (se suportado no ambiente local/remoto)
CREATE EXTENSION IF NOT EXISTS "supabase_vault" CASCADE;

CREATE TABLE IF NOT EXISTS public.agency_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid REFERENCES public.agencies(id) ON DELETE CASCADE NOT NULL,
  provider text NOT NULL, -- ex: 'meta_capi', 'whatsapp', 'openrouter', 'stripe'
  secret_id uuid, -- ID do segredo armazenado em vault.secrets (usado pelas Edge Functions)
  config jsonb NOT NULL DEFAULT '{}'::jsonb, -- Configurações públicas (ex: Pixel ID, Phone Number ID)
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(agency_id, provider)
);

ALTER TABLE public.agency_integrations ENABLE ROW LEVEL SECURITY;

-- Política de RLS: Apenas membros da agência podem ver e gerenciar as integrações
DROP POLICY IF EXISTS "agency_integrations_policy" ON public.agency_integrations;

CREATE POLICY "agency_integrations_policy" ON public.agency_integrations
  FOR ALL
  TO authenticated
  USING (public.is_agency_member(auth.uid(), agency_id));

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_agency_integrations_updated_at ON public.agency_integrations;
CREATE TRIGGER trg_agency_integrations_updated_at
  BEFORE UPDATE ON public.agency_integrations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- RPC Helpers para o Vault (Opcional, para facilitar a inserção a partir do frontend através de um Edge Function ou Backend seguro)
-- Nota: O Frontend NÃO deve inserir secrets diretamente via RPC por segurança, deve chamar uma Edge Function que faça o vault.create_secret e retorne o ID.
