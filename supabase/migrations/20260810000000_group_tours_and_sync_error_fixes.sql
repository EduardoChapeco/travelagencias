-- Migration: 20260810000000_group_tours_and_sync_error_fixes.sql
-- Objetivo: Fortalecer segurança do Hub de Grupos (saldo não negativo) e permitir logs de erro de sincronização em operadoras Infotravel

-- 1. Restrição na tabela group_tours para impedir saldo de poupança negativo
ALTER TABLE public.group_tours 
  DROP CONSTRAINT IF EXISTS chk_group_tours_poupanca_non_negative;

ALTER TABLE public.group_tours 
  ADD CONSTRAINT chk_group_tours_poupanca_non_negative 
  CHECK (target_poupanca_balance >= 0);

-- 2. Adicionar colunas de log de sincronização na tabela api_keys para os conectores
ALTER TABLE public.api_keys 
  ADD COLUMN IF NOT EXISTS last_sync_error TEXT,
  ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMPTZ;

-- Comentários explicativos para documentação de schema
COMMENT ON COLUMN public.api_keys.last_sync_error IS 'Último erro de processamento retornado pelo conector de sincronização (Infotravel, WhatsApp, etc).';
COMMENT ON COLUMN public.api_keys.last_sync_at IS 'Data e hora da última sincronização ativa efetuada para este operador/provider.';
