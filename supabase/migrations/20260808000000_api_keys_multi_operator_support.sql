-- ============================================================================
-- Migration: 20260808000000_api_keys_multi_operator_support.sql
-- Objetivo: Adicionar suporte a múltiplas operadoras na tabela api_keys
--           e garantir RLS policies corretas para o integration-manager.
-- ============================================================================

-- 1. Adicionar colunas para suporte multi-operadora
ALTER TABLE api_keys
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS operator_id TEXT,
  ADD COLUMN IF NOT EXISTS operator_name TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_api_keys_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_api_keys_updated_at ON api_keys;
CREATE TRIGGER trg_api_keys_updated_at
  BEFORE UPDATE ON api_keys
  FOR EACH ROW EXECUTE FUNCTION update_api_keys_updated_at();

-- 3. Índice composto para lookup rápido (agência + provider + operadora)
CREATE INDEX IF NOT EXISTS idx_api_keys_agency_provider_operator
  ON api_keys (agency_id, provider, operator_id);

-- 4. Índice por category para filtros rápidos no integration-manager
CREATE INDEX IF NOT EXISTS idx_api_keys_category
  ON api_keys (agency_id, category);

-- 5. Garantir RLS habilitado na tabela api_keys
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- 6. Remover políticas antigas fragmentadas e recriar de forma consistente

-- SELECT: Admins e agentes da agência podem ler as próprias chaves
DROP POLICY IF EXISTS "ak read" ON api_keys;
DROP POLICY IF EXISTS "ak_read" ON api_keys;
DROP POLICY IF EXISTS "api_keys_agency_select" ON api_keys;
CREATE POLICY "api_keys_select_agency_members"
  ON api_keys FOR SELECT
  USING (
    agency_id IN (
      SELECT agency_id FROM user_roles
      WHERE user_id = auth.uid()
    )
  );

-- INSERT: Somente agency_admin pode inserir chaves
DROP POLICY IF EXISTS "ak insert" ON api_keys;
DROP POLICY IF EXISTS "ak_insert" ON api_keys;
DROP POLICY IF EXISTS "api_keys_agency_insert" ON api_keys;
CREATE POLICY "api_keys_insert_admin_only"
  ON api_keys FOR INSERT
  WITH CHECK (
    agency_id IN (
      SELECT agency_id FROM user_roles
      WHERE user_id = auth.uid()
        AND role = 'agency_admin'
    )
  );

-- UPDATE: Somente agency_admin pode atualizar chaves da própria agência
DROP POLICY IF EXISTS "ak update" ON api_keys;
DROP POLICY IF EXISTS "ak_update" ON api_keys;
DROP POLICY IF EXISTS "api_keys_agency_update" ON api_keys;
CREATE POLICY "api_keys_update_admin_only"
  ON api_keys FOR UPDATE
  USING (
    agency_id IN (
      SELECT agency_id FROM user_roles
      WHERE user_id = auth.uid()
        AND role = 'agency_admin'
    )
  )
  WITH CHECK (
    agency_id IN (
      SELECT agency_id FROM user_roles
      WHERE user_id = auth.uid()
        AND role = 'agency_admin'
    )
  );

-- DELETE: Somente agency_admin pode deletar chaves
DROP POLICY IF EXISTS "ak delete" ON api_keys;
DROP POLICY IF EXISTS "ak_delete" ON api_keys;
DROP POLICY IF EXISTS "api_keys_agency_delete" ON api_keys;
CREATE POLICY "api_keys_delete_admin_only"
  ON api_keys FOR DELETE
  USING (
    agency_id IN (
      SELECT agency_id FROM user_roles
      WHERE user_id = auth.uid()
        AND role = 'agency_admin'
    )
  );

-- 7. Comentários descritivos nas colunas
COMMENT ON COLUMN api_keys.category IS 'Categoria da credencial: general, infotravel_operator, whatsapp, meta, gmail, google_oauth, payment, etc.';
COMMENT ON COLUMN api_keys.operator_id IS 'UUID ou slug único da operadora (para múltiplas operadoras Infotravel). NULL = credencial global da agência.';
COMMENT ON COLUMN api_keys.operator_name IS 'Nome amigável da operadora (ex: "Incomum Viagens", "CVC Operadora").';
COMMENT ON COLUMN api_keys.metadata IS 'Dados extras da credencial em JSON (ex: scopes OAuth, endpoints alternativos).';
