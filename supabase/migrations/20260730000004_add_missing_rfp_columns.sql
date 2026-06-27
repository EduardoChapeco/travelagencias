-- ==============================================================================
-- Migração: 20260730000004_add_missing_rfp_columns
-- Adiciona colunas ausentes na tabela corporate_rfps para viabilizar aprovações B2B.
-- ==============================================================================

ALTER TABLE public.corporate_rfps
  ADD COLUMN IF NOT EXISTS approved_by text,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejection_reason text;

COMMENT ON COLUMN public.corporate_rfps.approved_by IS 'Identificador do aprovador da rfp';
COMMENT ON COLUMN public.corporate_rfps.approved_at IS 'Timestamp do momento da aprovação ou rejeição';
COMMENT ON COLUMN public.corporate_rfps.rejection_reason IS 'Motivo registrado em caso de rejeição da rfp';
