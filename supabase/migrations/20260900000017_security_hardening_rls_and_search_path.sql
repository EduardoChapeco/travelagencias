-- =============================================================================
-- MIGRATION: Security Hardening — RLS Consolidation & SECURITY DEFINER search_path
-- Data: 2026-07-13
-- Objetivo:
--   1. Eliminar policies de RLS concorrentes/permissivas na tabela `leads`
--      que anulam o isolamento por owner_id via lógica OR do Postgres.
--   2. Adicionar SET search_path = public a todas as funções SECURITY DEFINER
--      que não possuíam search_path explícito (vetor de schema injection).
-- Impacto: Zero quebra funcional. Restrição de acesso é mais granular.
-- Verificação: Ver afirmações auditadas na Fase 0 do implementation_plan.md
-- =============================================================================

-- ============================================================
-- PARTE 1: LIMPEZA DE POLICIES CONCORRENTES NA TABELA leads
-- ============================================================
-- Problema: 3 conjuntos de policies para o mesmo verbo (SELECT, INSERT,
-- DELETE, UPDATE) existiam em paralelo — algumas para role 'public',
-- outras para 'authenticated'. O Postgres avalia com OR, tornando a
-- política restritiva por owner_id completamente ineficaz.
--
-- Mapeamento ANTES → DEPOIS:
--
-- SELECT:
--   [REMOVIDO] "Agency members can view leads"      → is_agency_member genérico (permissivo)
--   [REMOVIDO] "Leads are viewable by agency members" → is_agency_member em {public} (permissivo)
--   [MANTIDO]  "agency members read leads"          → is_agency_member + owner_id/admin (CANÔNICA)
--
-- INSERT:
--   [REMOVIDO] "Agency members can insert leads"    → {authenticated} sem with_check explícito
--   [REMOVIDO] "Leads are insertable by agency members" → {public} sem with_check explícito
--   [MANTIDO]  "agency members create leads"         → {authenticated} + with_check canônico
--
-- UPDATE:
--   [REMOVIDO] "Agency members can update leads"    → is_agency_member genérico
--   [REMOVIDO] "Leads are updatable by agency members" → {public} genérico
--   [MANTIDO]  "agency members update leads"         → is_agency_member + owner_id/admin (CANÔNICA)
--
-- DELETE:
--   [REMOVIDO] "Agency members can delete leads"    → {authenticated} genérico
--   [REMOVIDO] "Leads are deletable by agency members" → {public} genérico
--   [MANTIDO]  "agency admins delete leads"          → somente admins (CANÔNICA)

DROP POLICY IF EXISTS "Agency members can view leads" ON public.leads;
DROP POLICY IF EXISTS "Leads are viewable by agency members" ON public.leads;
DROP POLICY IF EXISTS "Agency members can insert leads" ON public.leads;
DROP POLICY IF EXISTS "Leads are insertable by agency members" ON public.leads;
DROP POLICY IF EXISTS "Agency members can update leads" ON public.leads;
DROP POLICY IF EXISTS "Leads are updatable by agency members" ON public.leads;
DROP POLICY IF EXISTS "Agency members can delete leads" ON public.leads;
DROP POLICY IF EXISTS "Leads are deletable by agency members" ON public.leads;

-- Verificação pós-limpeza: Apenas 4 policies canônicas devem existir.
-- SELECT: "agency members read leads"     (owner_id | NULL | admin)
-- INSERT: "agency members create leads"   (authenticated + with_check)
-- UPDATE: "agency members update leads"   (owner_id | NULL | admin)
-- DELETE: "agency admins delete leads"    (somente agency_admin)


-- ============================================================
-- PARTE 2: HARDENING DAS FUNÇÕES SECURITY DEFINER
-- ============================================================
-- Problema: Funções SECURITY DEFINER sem SET search_path = public
-- são vulneráveis a schema injection — um atacante pode criar uma tabela
-- de mesmo nome em outro schema e desviar a execução privilegiada.
-- Mitigação: Fixar search_path em todas as funções vulneráveis.
-- Referência: CVE-2025-48757, Supabase Security Advisory.

ALTER FUNCTION public.append_contract_audit(
  _contract_id uuid, _action text, _description text, _user_id uuid
) SET search_path = public;

ALTER FUNCTION public.calculate_cash_summary(
  _agency_id uuid, _filter text
) SET search_path = public;

ALTER FUNCTION public.calculate_dre_summary(
  _agency_id uuid, _period text
) SET search_path = public;

ALTER FUNCTION public.calculate_task_progress(
  p_task_id uuid
) SET search_path = public;

ALTER FUNCTION public.check_agency_trip_limit(
) SET search_path = public;

ALTER FUNCTION public.enroll_public_tour(
  _agency_id uuid, _tour_id uuid, _passenger_name text, _passenger_cpf text,
  _email text, _phone text, _notes text, _source text, _selected_seats text[],
  _unit_price numeric, _pax_count integer, _destination text, _receipt_url text
) SET search_path = public;

ALTER FUNCTION public.get_lead_id_for_whatsapp(
  _agency_id uuid, _trip_id uuid, _client_id uuid
) SET search_path = public;

ALTER FUNCTION public.handle_flight_itinerary_sync(
) SET search_path = public;

ALTER FUNCTION public.handle_flight_segment_sync(
) SET search_path = public;

ALTER FUNCTION public.handle_new_message_unread_count(
) SET search_path = public;

ALTER FUNCTION public.log_financial_changes(
) SET search_path = public;

ALTER FUNCTION public.match_knowledge_embeddings(
  query_embedding vector, match_threshold double precision,
  match_count integer, p_agency_id uuid, p_category text
) SET search_path = public;

ALTER FUNCTION public.prevent_active_flight_deletion(
) SET search_path = public;

ALTER FUNCTION public.promote_lead_to_client_v2(
  _lead_id uuid, _client_payload jsonb
) SET search_path = public;

ALTER FUNCTION public.propagate_passenger_document_metadata(
) SET search_path = public;

ALTER FUNCTION public.public_lead_by_id(
  _lead_id uuid
) SET search_path = public;

ALTER FUNCTION public.public_save_lead(
  _lead_id uuid, _payload jsonb
) SET search_path = public;

ALTER FUNCTION public.save_infotravel_booking_normalized(
  p_agency_id uuid, p_normalized jsonb, p_override_trip_id uuid
) SET search_path = public;

ALTER FUNCTION public.save_infotravel_booking_normalized(
  p_agency_id uuid, p_normalized jsonb
) SET search_path = public;

ALTER FUNCTION public.sign_contract_with_token(
  _token text, _signer_name text, _signer_document text,
  _signature_image text, _selfie_image text, _ip text, _user_agent text,
  _pdf_path text, _signed_hash text, _doc_front text, _doc_back text,
  _video_kyc text
) SET search_path = public;

ALTER FUNCTION public.submit_public_lead(
  _agency_slug text, _name text, _email text, _phone text,
  _destination text, _travel_start date, _travel_end date,
  _pax_count integer, _estimated_value numeric, _source text,
  _notes text, _tags text[]
) SET search_path = public;

ALTER FUNCTION public.sync_cash_transaction_delete_to_ledger(
) SET search_path = public;

ALTER FUNCTION public.sync_cash_transaction_to_ledger(
) SET search_path = public;

ALTER FUNCTION public.sync_financial_record_delete_to_ledger(
) SET search_path = public;

ALTER FUNCTION public.sync_financial_record_to_ledger(
) SET search_path = public;

ALTER FUNCTION public.trigger_addendum_created_whatsapp(
) SET search_path = public;

ALTER FUNCTION public.trigger_ai_message_processor(
) SET search_path = public;

ALTER FUNCTION public.trigger_contract_signed_whatsapp(
) SET search_path = public;

ALTER FUNCTION public.trigger_meta_capi_sync(
) SET search_path = public;

ALTER FUNCTION public.trigger_passport_expiry_whatsapp(
) SET search_path = public;

ALTER FUNCTION public.trigger_whatsapp_sender(
) SET search_path = public;

-- ============================================================
-- VERIFICAÇÃO FINAL (executar via MCP/psql após migration)
-- ============================================================
-- 1. Tabelas sem RLS:
--    SELECT tablename FROM pg_tables WHERE schemaname='public' AND rowsecurity=false;
--    Esperado: 0 linhas
--
-- 2. Policies restantes em leads:
--    SELECT policyname, cmd FROM pg_policies WHERE tablename='leads' ORDER BY cmd;
--    Esperado: 4 linhas (read, create, update, delete)
--
-- 3. Funções SECURITY DEFINER sem search_path:
--    SELECT proname FROM pg_proc JOIN pg_namespace ON ... WHERE prosecdef=true
--    AND (proconfig IS NULL OR NOT array_to_string(proconfig,',') LIKE '%search_path%');
--    Esperado: 0 linhas
