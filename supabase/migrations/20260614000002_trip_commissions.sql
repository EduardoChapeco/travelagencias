-- ============================================================
-- Migração: trip_commissions
-- Gestão de comissão da agência e do agente por viagem.
-- Lógica:
--   Base Comissionável (BC) = total_sale - embarque_tax
--   Comissão Agência = BC * agency_commission_pct / 100
--   Comissão Agente = escala progressiva por faturamento mensal
--     0–50k   → 3%
--     50–100k → 5%
--     100k+   → 7%
-- ============================================================

CREATE TABLE IF NOT EXISTS trip_commissions (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id                uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  agency_id              uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,

  -- Valores financeiros base
  embarque_tax           numeric(12,2) NOT NULL DEFAULT 0,
  agency_commission_pct  numeric(5,2)  NOT NULL DEFAULT 15,

  -- Agente responsável
  agent_id               uuid REFERENCES profiles(id),
  agent_commission_pct   numeric(5,2),       -- Calculado automaticamente pela escala
  agent_commission_brl   numeric(12,2),      -- Valor em R$ da comissão do agente

  -- Valores calculados (denormalizados para performance)
  base_comissionavel     numeric(12,2),      -- total_sale - embarque_tax
  agency_commission_brl  numeric(12,2),      -- BC * agency_commission_pct%
  net_profit             numeric(12,2),      -- agency_commission - agent_commission - outras despesas

  -- Controle
  notes                  text,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),

  UNIQUE(trip_id)  -- Uma única configuração de comissão por viagem
);

-- RLS
ALTER TABLE trip_commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agency_members_access" ON trip_commissions
  USING (
    agency_id IN (
      SELECT agency_id FROM agency_members WHERE user_id = auth.uid()
    )
  );

-- Trigger para updated_at
CREATE TRIGGER trip_commissions_updated_at
  BEFORE UPDATE ON trip_commissions
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

-- Índices
CREATE INDEX IF NOT EXISTS idx_trip_commissions_trip_id    ON trip_commissions(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_commissions_agency_id  ON trip_commissions(agency_id);
CREATE INDEX IF NOT EXISTS idx_trip_commissions_agent_id   ON trip_commissions(agent_id);

COMMENT ON TABLE trip_commissions IS
  'Configuração e cálculo de comissões por viagem para agência e agente.';
