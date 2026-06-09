-- =============================================================================
-- TravelOS — Schema Fixes for Production
-- Migration: 20260605000001_schema_fixes_production
-- 
-- Corrige:
--   1. Colunas faltantes em public.trips
--   2. Colunas faltantes em public.clients
--   3. Colunas faltantes em public.leads
--   4. RLS de trip_passengers (anon policy aberta demais)
--   5. Trigger duplicado em public.agencies
--   6. Storage buckets (INSERT na tabela storage.buckets)
--   7. Índices de performance
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. TRIPS — Adicionar colunas faltantes
-- ─────────────────────────────────────────────────────────────────────────────
-- O PRD define departure_date/return_date; a tabela usa travel_start/travel_end.
-- Adicionamos os aliases + campos operacionais críticos que o sistema usa.

ALTER TABLE public.trips
  -- Operadora e localizadores (usados em Embarques, Vouchers, Contratos)
  ADD COLUMN IF NOT EXISTS operator           text,
  ADD COLUMN IF NOT EXISTS operator_booking_id text,
  ADD COLUMN IF NOT EXISTS airline            text,
  ADD COLUMN IF NOT EXISTS pnr                text,

  -- Quartos: array de objetos {id, label, type, passenger_ids, magic_link_token}
  -- Usado pelo módulo de Passageiros e pelo link de quarto
  ADD COLUMN IF NOT EXISTS rooms              jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- Checklist de embarque: array de {id, label, done, phase}
  -- Usado pelo Kanban de Embarques
  ADD COLUMN IF NOT EXISTS checklist          jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- Status operacional do embarque (diferente do status da viagem)
  ADD COLUMN IF NOT EXISTS boarding_status    text NOT NULL DEFAULT 'pending'
    CHECK (boarding_status IN ('pending', 'in_progress', 'done')),

  -- Tags da agência vinculadas à viagem
  ADD COLUMN IF NOT EXISTS tags               text[] NOT NULL DEFAULT '{}',

  -- Total já pago pelo cliente (calculado a partir de payment_installments)
  ADD COLUMN IF NOT EXISTS total_paid         numeric(14,2) NOT NULL DEFAULT 0,

  -- Campos de passageiros (contagem)
  ADD COLUMN IF NOT EXISTS pax_adults         integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS pax_children       integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pax_infants        integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pax_seniors        integer NOT NULL DEFAULT 0,

  -- Agente responsável (owner)
  ADD COLUMN IF NOT EXISTS owner_id           uuid;

-- Índice para busca por operator/airline (usado em relatórios)
CREATE INDEX IF NOT EXISTS trips_airline_idx ON public.trips(airline)
  WHERE airline IS NOT NULL;
CREATE INDEX IF NOT EXISTS trips_pnr_idx ON public.trips(pnr)
  WHERE pnr IS NOT NULL;
CREATE INDEX IF NOT EXISTS trips_owner_idx ON public.trips(owner_id)
  WHERE owner_id IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. CLIENTS — Adicionar colunas de documentação e passaporte
-- ─────────────────────────────────────────────────────────────────────────────
-- Campos essenciais para emissão de contratos, passaportes, vistos e magic links.

ALTER TABLE public.clients
  -- Documentos brasileiros
  ADD COLUMN IF NOT EXISTS cpf                text,
  ADD COLUMN IF NOT EXISTS rg                 text,

  -- Passaporte (viagens internacionais)
  ADD COLUMN IF NOT EXISTS passport_number    text,
  ADD COLUMN IF NOT EXISTS passport_expiry    date,
  ADD COLUMN IF NOT EXISTS passport_country   text,

  -- Uploads de documentos (IDs do Storage — array de URLs)
  ADD COLUMN IF NOT EXISTS document_images    text[] NOT NULL DEFAULT '{}',

  -- Dados enriquecidos por IA (preferências, histórico, insights)
  ADD COLUMN IF NOT EXISTS brain_data         jsonb NOT NULL DEFAULT '{}'::jsonb,

  -- Origem do cadastro
  ADD COLUMN IF NOT EXISTS source             text
    CHECK (source IS NULL OR source IN ('manual', 'form', 'whatsapp', 'instagram', 'referral', 'portal', 'import')),

  -- Preferências de viagem (estilo, restrições alimentares, etc.)
  ADD COLUMN IF NOT EXISTS preferences        jsonb NOT NULL DEFAULT '{}'::jsonb,

  -- Agente responsável
  ADD COLUMN IF NOT EXISTS preferred_agent_id uuid;

-- Índice parcial para buscas por CPF (frequente na emissão de contratos)
CREATE UNIQUE INDEX IF NOT EXISTS clients_agency_cpf_uidx
  ON public.clients(agency_id, cpf)
  WHERE cpf IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS clients_agency_passport_uidx
  ON public.clients(agency_id, passport_number)
  WHERE passport_number IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. LEADS — Adicionar colunas faltantes
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.leads
  -- Tags coloridas (multi-select de agency_tags)
  ADD COLUMN IF NOT EXISTS tags               text[] NOT NULL DEFAULT '{}',

  -- Preferências de viagem (jsonb: budget_range, travel_style, accommodation_preference etc.)
  ADD COLUMN IF NOT EXISTS preferences        jsonb NOT NULL DEFAULT '{}'::jsonb,

  -- Links de conversão (quando lead vira proposta/viagem)
  ADD COLUMN IF NOT EXISTS proposal_id        uuid REFERENCES public.proposals(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS trip_id            uuid REFERENCES public.trips(id) ON DELETE SET NULL,

  -- Último contato para SLA tracking
  ADD COLUMN IF NOT EXISTS last_contact_at    timestamptz,

  -- Origem do formulário (se veio de lead_forms)
  ADD COLUMN IF NOT EXISTS form_id            uuid REFERENCES public.lead_forms(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS leads_proposal_idx ON public.leads(proposal_id)
  WHERE proposal_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS leads_trip_idx ON public.leads(trip_id)
  WHERE trip_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS leads_tags_idx ON public.leads USING GIN(tags);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. FIX: Trigger duplicado em public.agencies
-- ─────────────────────────────────────────────────────────────────────────────
-- Problema: duas triggers coexistem — agencies_after_insert (migration _021703)
-- e on_agency_created_assign_admin (migration _042744), ambas chamando versões
-- de handle_new_agency(). A segunda é a versão correta (com profiles upsert).
-- Removemos a primeira para evitar conflitos e duplicate key errors.

DROP TRIGGER IF EXISTS agencies_after_insert ON public.agencies;

-- Garantir que apenas on_agency_created_assign_admin está ativo
-- (já criado na migration 042744, mas garantimos existência)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'on_agency_created_assign_admin'
      AND tgrelid = 'public.agencies'::regclass
  ) THEN
    CREATE TRIGGER on_agency_created_assign_admin
    AFTER INSERT ON public.agencies
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_agency();
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. FIX: RLS de trip_passengers — política anon aberta demais
-- ─────────────────────────────────────────────────────────────────────────────
-- Problema: a política "passengers public by token" retorna TODOS os registros
-- para qualquer usuário anônimo (USING (true)), expondo dados PII globalmente.
-- Fix: Remover políticas anon diretas e usar SECURITY DEFINER RPCs específicas
-- (já existem: public_passenger_by_token e save_passenger_with_token).

DROP POLICY IF EXISTS "passengers public by token" ON public.trip_passengers;
DROP POLICY IF EXISTS "passengers public update by token" ON public.trip_passengers;

-- Revogar grants anon diretos na tabela (acesso só via RPCs)
REVOKE SELECT, UPDATE ON public.trip_passengers FROM anon;

-- As RPCs já existentes (public_passenger_by_token e save_passenger_with_token)
-- com SECURITY DEFINER são o único caminho seguro para acesso anon.
-- Garantir que estão acessíveis:
GRANT EXECUTE ON FUNCTION public.public_passenger_by_token(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_passenger_with_token(text, jsonb) TO anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. STORAGE BUCKETS — Criar buckets que faltam
-- ─────────────────────────────────────────────────────────────────────────────
-- As políticas de storage já foram criadas via migration 030551,
-- mas os próprios buckets precisam existir na tabela storage.buckets.
-- public = true: arquivo acessível via URL sem autenticação
-- public = false: requer signed URL ou autenticação

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  -- Logos e imagens de marca (públicos para o portal)
  ('agency-logos',        'agency-logos',        true,  5242880,  ARRAY['image/jpeg','image/png','image/webp','image/svg+xml']),
  ('agency-covers',       'agency-covers',        true,  10485760, ARRAY['image/jpeg','image/png','image/webp']),

  -- Propostas (privados — acesso por signed URL)
  ('proposal-covers',     'proposal-covers',      false, 10485760, ARRAY['image/jpeg','image/png','image/webp']),
  ('proposal-attachments','proposal-attachments',  false, 20971520, ARRAY['image/jpeg','image/png','image/webp','application/pdf']),

  -- Contratos (PRIVADO, sem delete policy — imutável)
  ('contract-pdfs',       'contract-pdfs',         false, 52428800, ARRAY['application/pdf']),

  -- Vouchers (privados)
  ('voucher-sources',     'voucher-sources',       false, 52428800, ARRAY['image/jpeg','image/png','image/webp','application/pdf']),
  ('voucher-pdfs',        'voucher-pdfs',          false, 20971520, ARRAY['application/pdf']),

  -- Financeiro (privado)
  ('financial-receipts',  'financial-receipts',    false, 20971520, ARRAY['image/jpeg','image/png','image/webp','application/pdf']),

  -- Documentos de passageiros (MUITO PRIVADO — dados biométricos/PII)
  ('passenger-documents', 'passenger-documents',   false, 20971520, ARRAY['image/jpeg','image/png','image/webp','application/pdf']),

  -- Roteiros em grupo (público)
  ('group-tour-gallery',  'group-tour-gallery',    true,  10485760, ARRAY['image/jpeg','image/png','image/webp']),

  -- Blog (público)
  ('blog-covers',         'blog-covers',           true,  10485760, ARRAY['image/jpeg','image/png','image/webp']),

  -- Suporte (privado)
  ('support-attachments', 'support-attachments',   false, 20971520, ARRAY['image/jpeg','image/png','image/webp','application/pdf']),

  -- Avatares de clientes (públicos)
  ('client-avatars',      'client-avatars',        true,  5242880,  ARRAY['image/jpeg','image/png','image/webp'])

ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. FUNÇÃO: Atualizar total_paid na trip baseado em payment_installments
-- ─────────────────────────────────────────────────────────────────────────────
-- Esta função é chamada via trigger quando um installment é pago,
-- mantendo trips.total_paid sempre sincronizado.

CREATE OR REPLACE FUNCTION public.sync_trip_total_paid()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _trip_id uuid;
  _total_paid numeric(14,2);
BEGIN
  -- Determinar o trip_id via payment_plan
  SELECT pp.trip_id INTO _trip_id
  FROM public.payment_plans pp
  WHERE pp.id = COALESCE(NEW.payment_plan_id, OLD.payment_plan_id);

  IF _trip_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Calcular soma de parcelas pagas desta viagem
  SELECT COALESCE(SUM(pi.amount), 0) INTO _total_paid
  FROM public.payment_installments pi
  JOIN public.payment_plans pp ON pp.id = pi.payment_plan_id
  WHERE pp.trip_id = _trip_id
    AND pi.status = 'paid';

  UPDATE public.trips
  SET total_paid = _total_paid
  WHERE id = _trip_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS sync_trip_total_paid_trg ON public.payment_installments;
CREATE TRIGGER sync_trip_total_paid_trg
  AFTER INSERT OR UPDATE OF status ON public.payment_installments
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_trip_total_paid();

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. FUNÇÃO: Calcular margem da viagem (view materializada virtual)
-- ─────────────────────────────────────────────────────────────────────────────
-- RPC pública para obter DRE resumido de uma viagem sem expor dados de outras.

CREATE OR REPLACE FUNCTION public.trip_financial_summary(_trip_id uuid)
RETURNS TABLE(
  revenue         numeric,
  cost            numeric,
  margin          numeric,
  margin_percent  numeric,
  total_paid      numeric,
  outstanding     numeric,
  income_breakdown jsonb,
  expense_breakdown jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH income AS (
    SELECT
      category,
      SUM(amount_brl) AS subtotal
    FROM public.financial_records
    WHERE trip_id = _trip_id
      AND type = 'income'
      AND status <> 'cancelled'
    GROUP BY category
  ),
  expense AS (
    SELECT
      category,
      SUM(amount_brl) AS subtotal
    FROM public.financial_records
    WHERE trip_id = _trip_id
      AND type = 'expense'
      AND status <> 'cancelled'
    GROUP BY category
  ),
  totals AS (
    SELECT
      COALESCE((SELECT SUM(subtotal) FROM income), 0) AS rev,
      COALESCE((SELECT SUM(subtotal) FROM expense), 0) AS cst
  )
  SELECT
    t.rev,
    t.cst,
    t.rev - t.cst,
    CASE WHEN t.rev > 0 THEN ROUND(((t.rev - t.cst) / t.rev) * 100, 2) ELSE 0 END,
    tr.total_paid,
    tr.total_sale - tr.total_paid,
    COALESCE((SELECT jsonb_agg(jsonb_build_object('category', category, 'total', subtotal)) FROM income), '[]'::jsonb),
    COALESCE((SELECT jsonb_agg(jsonb_build_object('category', category, 'total', subtotal)) FROM expense), '[]'::jsonb)
  FROM totals t
  JOIN public.trips tr ON tr.id = _trip_id;
$$;

REVOKE ALL ON FUNCTION public.trip_financial_summary(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.trip_financial_summary(uuid) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. ÍNDICES DE PERFORMANCE (consultas frequentes)
-- ─────────────────────────────────────────────────────────────────────────────

-- Busca de passageiros por viagem (crítico para embarques)
CREATE INDEX IF NOT EXISTS trip_passengers_data_complete_idx
  ON public.trip_passengers(trip_id, data_complete);

-- Busca de contratos por status (cofre de contratos)
CREATE INDEX IF NOT EXISTS contracts_agency_status_idx
  ON public.contracts(agency_id, status);

-- Busca de vouchers por viagem
CREATE INDEX IF NOT EXISTS vouchers_agency_trip_idx
  ON public.vouchers(agency_id, trip_id);

-- Busca financeira por período (relatórios)
CREATE INDEX IF NOT EXISTS financial_records_agency_type_date_idx
  ON public.financial_records(agency_id, type, due_date DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- 10. FIX: agency_private — garantir que todas as agências têm registro
-- ─────────────────────────────────────────────────────────────────────────────
-- Agências criadas antes da migration 034311 podem não ter registro em agency_private.

INSERT INTO public.agency_private (agency_id)
SELECT id FROM public.agencies a
WHERE NOT EXISTS (
  SELECT 1 FROM public.agency_private ap WHERE ap.agency_id = a.id
)
ON CONFLICT (agency_id) DO NOTHING;
