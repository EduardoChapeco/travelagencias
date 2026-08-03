-- =========================================================================================
-- Microfase 6: Autoridade em Respostas Públicas (Public Proposals)
-- O cliente final (anon) podia enviar um PATCH genérico na tabela de orçamentos e alterar
-- os JSONs de voos ou hotéis, fraudando o preço. Esta vulnerabilidade foi eliminada.
-- As decisões do cliente trafegam agora por RPCs estritas.
-- =========================================================================================

-- 1. Eliminar o acesso de UPDATE genérico
DROP POLICY IF EXISTS "public update of proposals by token" ON public.proposals;

-- 2. RPC para registrar visualização
CREATE OR REPLACE FUNCTION public.public_mark_proposal_viewed(_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Atualiza o status para "viewed" apenas se for "draft" ou "sent" e não estiver decidido
  UPDATE public.proposals
  SET status = 'viewed'
  WHERE id = _id 
    AND public_token IS NOT NULL 
    AND deleted_at IS NULL
    AND decided_at IS NULL
    AND status IN ('draft', 'sent');
END;
$$;

-- 3. RPC para tomar decisão
CREATE OR REPLACE FUNCTION public.public_decide_proposal(_id uuid, _status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _status NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Status de decisão inválido.';
  END IF;

  UPDATE public.proposals
  SET status = _status,
      decided_at = now()
  WHERE id = _id
    AND public_token IS NOT NULL
    AND deleted_at IS NULL
    AND decided_at IS NULL;
END;
$$;

-- Garantir que "anon" e "authenticated" possam rodar as RPCs
GRANT EXECUTE ON FUNCTION public.public_mark_proposal_viewed(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_decide_proposal(uuid, text) TO anon, authenticated;
