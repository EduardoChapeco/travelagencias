-- ============================================================
-- P2.2 — Índices em FK críticas para eliminar Sequential Scans
-- Auditoria identificou tabelas com colunas de FK sem índice,
-- causando Seq Scans em queries de alta frequência.
-- ============================================================

-- ── omnichannel_messages ──────────────────────────────────────
-- wamid lookup (idempotência): acesso O(1) na verificação de duplicatas
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_omnichannel_messages_wamid
  ON public.omnichannel_messages (wamid)
  WHERE wamid IS NOT NULL;

-- session_id: join frequente para buscar histórico de conversa
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_omnichannel_messages_session_id
  ON public.omnichannel_messages (session_id);

-- lead_id: join em queries de CRM
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_omnichannel_messages_lead_id
  ON public.omnichannel_messages (lead_id)
  WHERE lead_id IS NOT NULL;

-- ── omnichannel_sessions ──────────────────────────────────────
-- phone_number + agency_id: usado no webhook para encontrar/criar sessão
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_omnichannel_sessions_agency_phone
  ON public.omnichannel_sessions (agency_id, phone_number);

-- connection_id: join com whatsapp_connections
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_omnichannel_sessions_connection_id
  ON public.omnichannel_sessions (connection_id)
  WHERE connection_id IS NOT NULL;

-- ── package_candidates ────────────────────────────────────────
-- quote_request_id: join primário para busca de candidatos
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_package_candidates_quote_request_id
  ON public.package_candidates (quote_request_id);

-- ── package_candidate_components ─────────────────────────────
-- package_candidate_id: join para recuperar componentes de um pacote
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pkg_candidate_components_candidate_id
  ON public.package_candidate_components (package_candidate_id);

-- ── normalized_offers ────────────────────────────────────────
-- quote_request_id: acesso para listar todas as ofertas de uma cotação
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_normalized_offers_quote_request_id
  ON public.normalized_offers (quote_request_id);

-- scenario_id: join para saber qual cenário gerou cada oferta
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_normalized_offers_scenario_id
  ON public.normalized_offers (scenario_id)
  WHERE scenario_id IS NOT NULL;

-- ── quote_scenarios ───────────────────────────────────────────
-- search_plan_id: join primário para carregar cenários de um plano
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quote_scenarios_search_plan_id
  ON public.quote_scenarios (search_plan_id);

-- ── decision_records ─────────────────────────────────────────
-- quote_request_id: join para histórico de decisões de uma cotação
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_decision_records_quote_request_id
  ON public.decision_records (quote_request_id);

-- ── rule_candidates ───────────────────────────────────────────
-- agency_id + status: query de aprovação de regras por agência
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rule_candidates_agency_status
  ON public.rule_candidates (agency_id, status);

-- ── whatsapp_connections ──────────────────────────────────────
-- waba_id + status: lookup crítico no processamento do webhook
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_whatsapp_connections_waba_status
  ON public.whatsapp_connections (waba_id, status);
