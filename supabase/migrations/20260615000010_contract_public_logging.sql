-- Migração para logs públicos de auditoria de contratos e obtenção da cadeia de custódia
-- Criação de funções SECURITY DEFINER que rodam com privilégios elevados permitindo acesso pela role 'anon'

-- 1. RPC para registrar atividades do contrato (visualização, leitura, etc.)
CREATE OR REPLACE FUNCTION public.log_contract_activity(
  _token TEXT,
  _action TEXT,
  _metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _contract_id UUID;
BEGIN
  SELECT id INTO _contract_id FROM public.contracts WHERE public_token = _token;
  IF _contract_id IS NULL THEN
    RAISE EXCEPTION 'Contrato não encontrado';
  END IF;

  INSERT INTO public.contract_audit_chain (contract_id, action, metadata)
  VALUES (_contract_id, _action, _metadata);
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_contract_activity(TEXT, TEXT, JSONB) TO anon, authenticated;

-- 2. RPC para obter a cadeia de auditoria de um contrato usando o token público
CREATE OR REPLACE FUNCTION public.public_audit_chain_by_token(_token TEXT)
RETURNS TABLE (
  id BIGINT,
  action TEXT,
  metadata JSONB,
  prev_hash TEXT,
  row_hash TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ac.id, ac.action, ac.metadata, ac.prev_hash, ac.row_hash, ac.created_at
  FROM public.contract_audit_chain ac
  JOIN public.contracts c ON c.id = ac.contract_id
  WHERE c.public_token = _token
  ORDER BY ac.id ASC;
$$;

GRANT EXECUTE ON FUNCTION public.public_audit_chain_by_token(TEXT) TO anon, authenticated;
