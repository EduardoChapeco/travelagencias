-- ──────────────────────────────────────────────────────────────
-- Adiciona controle de visibilidade nas cotações
-- visibility: 'private' (só o agente) | 'agency' (toda a agência) | 'public' (link público)
-- ──────────────────────────────────────────────────────────────
ALTER TABLE proposals
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'private'
  CHECK (visibility IN ('private', 'agency', 'public'));

-- Garante que cotações avulsas (sem lead nem client) são permitidas
-- A constraint já era opcional; garantimos que não há NOT NULL em lead_id/client_id
ALTER TABLE proposals
  ALTER COLUMN lead_id DROP NOT NULL,
  ALTER COLUMN client_id DROP NOT NULL;

-- Índice para filtrar cotações públicas/da agência rapidamente
CREATE INDEX IF NOT EXISTS idx_proposals_visibility ON proposals(agency_id, visibility);
