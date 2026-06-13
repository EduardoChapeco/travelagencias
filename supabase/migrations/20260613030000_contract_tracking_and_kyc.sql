-- Adiciona colunas para monitoramento de visualização de contratos
ALTER TABLE public.contracts
ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_viewed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS view_count INT DEFAULT 0;

-- RPC para marcar contrato como visualizado (SECURITY DEFINER para rodar via anon)
CREATE OR REPLACE FUNCTION public.mark_contract_viewed(_token TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.contracts
  SET
    viewed_at = COALESCE(viewed_at, now()),
    last_viewed_at = now(),
    view_count = view_count + 1,
    status = CASE WHEN status IN ('draft', 'sent') THEN 'viewed' ELSE status END
  WHERE public_token = _token;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_contract_viewed(TEXT) TO anon, authenticated;

-- RPC para atualizar o PDF assinado (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.update_contract_pdf_path(_contract_id UUID, _pdf_path TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Apenas permite atualizar se o contrato estiver assinado para evitar fraudes em rascunhos
  UPDATE public.contracts
  SET pdf_url = _pdf_path
  WHERE id = _contract_id AND status = 'signed';
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_contract_pdf_path(UUID, TEXT) TO anon, authenticated;
