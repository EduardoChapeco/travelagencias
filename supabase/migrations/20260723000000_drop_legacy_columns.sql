-- ================================================================
-- Migration: 20260723000000_drop_legacy_columns.sql
-- Fase 3: Higienização de Colunas Legadas
-- Data: 2026-07-23
--
-- Objetivo: Remover fisicamente colunas de texto obsoletas da tabela
-- `suppliers` que foram normalizadas nas novas tabelas `supplier_contacts`
-- e `supplier_reviews` na migration 20260623000001.
--
-- NOTA: A coluna `rooming_list` JSONB de `group_tours` já foi removida
-- pela migration 20260625000001_rooming_list_consolidation.sql.
-- Esta migration trata apenas das colunas legadas de `suppliers`.
-- ================================================================

-- Verificar e remover colunas de contato legadas de `suppliers`
-- que foram normalizadas para a tabela `supplier_contacts`.

DO $$
BEGIN
  -- Remover coluna de contato genérico legado, se existir
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'suppliers'
      AND column_name = 'contact_name'
  ) THEN
    ALTER TABLE public.suppliers DROP COLUMN contact_name;
    RAISE NOTICE 'Coluna contact_name removida de suppliers.';
  END IF;

  -- Verificar se group_tours ainda tem a coluna rooming_list JSONB
  -- (deveria ter sido removida em 20260625000001, mas garantimos aqui)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'group_tours'
      AND column_name = 'rooming_list'
  ) THEN
    ALTER TABLE public.group_tours DROP COLUMN rooming_list;
    RAISE NOTICE 'Coluna rooming_list JSONB removida de group_tours (limpeza de segurança).';
  END IF;

  RAISE NOTICE 'Higienização de colunas legadas concluída.';
END $$;
