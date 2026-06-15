-- ============================================================
-- Migração: client_documents
-- Armazenamento de documentos pessoais de clientes
-- (passaporte, RG, CPF, visto, certidão, CNH, etc.)
-- com controle de vencimento e alertas.
-- ============================================================

CREATE TABLE IF NOT EXISTS client_documents (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  agency_id   uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,

  doc_type    text NOT NULL CHECK (doc_type IN (
    'rg', 'cpf', 'passport', 'birth_cert', 'cnh',
    'visa', 'vaccination_card', 'insurance', 'other'
  )),

  doc_number  text,
  issued_at   date,
  expires_at  date,
  file_url    text,           -- URL do documento digitalizado
  notes       text,

  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE client_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agency_members_access" ON client_documents;
CREATE POLICY "agency_members_access" ON client_documents
  USING (public.is_agency_member(auth.uid(), agency_id));

-- Trigger para updated_at
DROP TRIGGER IF EXISTS client_documents_updated_at ON client_documents;
CREATE TRIGGER client_documents_updated_at
  BEFORE UPDATE ON client_documents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Índices
CREATE INDEX IF NOT EXISTS idx_client_documents_client_id  ON client_documents(client_id);
CREATE INDEX IF NOT EXISTS idx_client_documents_agency_id  ON client_documents(agency_id);
CREATE INDEX IF NOT EXISTS idx_client_documents_expires_at ON client_documents(expires_at);

-- Vista: documentos vencendo em 90 dias
CREATE OR REPLACE VIEW client_documents_expiring AS
  SELECT
    cd.*,
    c.full_name AS client_name,
    c.email AS client_email,
    c.phone AS client_phone,
    (cd.expires_at - CURRENT_DATE) AS days_until_expiry
  FROM client_documents cd
  JOIN clients c ON c.id = cd.client_id
  WHERE cd.expires_at IS NOT NULL
    AND cd.expires_at > CURRENT_DATE
    AND cd.expires_at <= CURRENT_DATE + INTERVAL '90 days'
  ORDER BY cd.expires_at ASC;

COMMENT ON TABLE client_documents IS
  'Documentos pessoais dos clientes (passaporte, visto, RG, etc.) com controle de vencimento.';

-- ──────────────────────────────────────────────────────────────
-- destination_info: Cache de informações curadas por destino
-- ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS destination_info (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  destination         text NOT NULL,     -- ex: "Mexico", "Portugal", "Cancún"
  country_code        text,              -- ISO 3166-1 alpha-2
  slug                text UNIQUE,       -- para URLs amigáveis

  -- Vistos e entrada
  visa_required       boolean DEFAULT false,
  visa_info           text,
  entry_requirements  text,

  -- Taxa de turismo
  tourist_tax         text,              -- Texto descritivo
  tourist_tax_amount  numeric(10,2),
  tourist_tax_currency text DEFAULT 'USD',

  -- Saúde
  vaccinations_required text[],
  vaccinations_recommended text[],
  health_notes        text,

  -- Práticas e cultura
  currency            text,
  currency_code       text,
  plug_type           text,              -- ex: "Tipo A/B (110V)"
  language            text,
  time_zone           text,
  utc_offset          text,             -- ex: "-06:00"

  -- Segurança
  safety_level        text CHECK (safety_level IN ('safe', 'moderate', 'caution', 'high_risk')),
  safety_notes        text,

  -- Dicas
  cultural_tips       text,
  best_season         text,
  budget_range        text,             -- ex: "R$ 8.000–15.000 por pessoa (7 dias)"

  -- Controle de cache IA
  ai_generated_at     timestamptz,
  ai_model            text,

  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- Acesso público (leitura) para a área do cliente
ALTER TABLE destination_info ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read" ON destination_info;
CREATE POLICY "public_read" ON destination_info FOR SELECT USING (true);

-- Trigger para updated_at
DROP TRIGGER IF EXISTS destination_info_updated_at ON destination_info;
CREATE TRIGGER destination_info_updated_at
  BEFORE UPDATE ON destination_info
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_destination_info_slug ON destination_info(slug);

COMMENT ON TABLE destination_info IS
  'Cache de informações curadas de destinos (visto, taxa turismo, cultura, etc.) geradas por IA.';
