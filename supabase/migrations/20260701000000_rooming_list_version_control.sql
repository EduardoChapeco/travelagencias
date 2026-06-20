-- Migration: 20260701000000_rooming_list_version_control
-- Objetivo: Adicionar controle de concorrência otimista na tabela boarding_rooming_list
-- para prevenir o problema de "Lost Update" quando múltiplos operadores editam
-- o mesmo quarto simultaneamente.

-- 1. Adicionar coluna de versão para controle de concorrência otimista
ALTER TABLE public.boarding_rooming_list
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

-- 2. RPC: Atualização com verificação de versão (Optimistic Locking)
-- Retorna TRUE se o update foi bem-sucedido, FALSE se houve conflito de versão.
CREATE OR REPLACE FUNCTION public.update_rooming_list_versioned(
  _room_id      uuid,
  _passengers   jsonb,
  _version      integer,         -- versão atual que o cliente conhece
  _agency_id    uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _current_version integer;
  _rows_updated    integer;
BEGIN
  -- Buscar a versão atual do registro para validação
  SELECT version INTO _current_version
    FROM public.boarding_rooming_list
   WHERE id = _room_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Room record % not found', _room_id;
  END IF;

  -- Verificar conflito de versão: se a versão do cliente é diferente da atual,
  -- outro operador modificou este registro entre a leitura e o update.
  IF _current_version <> _version THEN
    -- Conflito detectado: retornar FALSE sem realizar o update
    RETURN FALSE;
  END IF;

  -- Versão coincide: realizar o update e incrementar a versão
  UPDATE public.boarding_rooming_list
     SET passengers  = _passengers,
         version     = version + 1,
         updated_at  = now()
   WHERE id      = _room_id
     AND version = _version;   -- Cláusula atômica adicional: WHERE com a versão confirmada

  GET DIAGNOSTICS _rows_updated = ROW_COUNT;

  -- Se nenhuma linha foi afetada, houve race condition (concorrência extrema)
  IF _rows_updated = 0 THEN
    RETURN FALSE;
  END IF;

  RETURN TRUE;
END;
$$;

-- Grant para usuários autenticados
GRANT EXECUTE ON FUNCTION public.update_rooming_list_versioned(uuid, jsonb, integer, uuid)
  TO authenticated;

-- Comentário explicativo na coluna
COMMENT ON COLUMN public.boarding_rooming_list.version IS
  'Versão do registro para controle de concorrência otimista. Incrementado automaticamente '
  'a cada update via update_rooming_list_versioned(). Impede o problema de Lost Update '
  'quando múltiplos operadores alocam passageiros simultaneamente.';
