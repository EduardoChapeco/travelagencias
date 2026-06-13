-- Habilita pgcrypto para criptografia sha256
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Tabela de Aditivos de Contrato
CREATE TABLE IF NOT EXISTS public.contract_addendums (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_signature', 'signed', 'cancelled')),
  signatures JSONB NOT NULL DEFAULT '[]'::jsonb,
  pdf_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  signed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS addendums_contract_idx ON public.contract_addendums(contract_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contract_addendums TO authenticated;
GRANT ALL ON public.contract_addendums TO service_role;
ALTER TABLE public.contract_addendums ENABLE ROW LEVEL SECURITY;

CREATE POLICY "addendums read" ON public.contract_addendums FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.contracts c WHERE c.id = contract_id AND public.is_agency_member(auth.uid(), c.agency_id)));

CREATE POLICY "addendums insert" ON public.contract_addendums FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.contracts c WHERE c.id = contract_id AND public.is_agency_member(auth.uid(), c.agency_id)));

CREATE POLICY "addendums update" ON public.contract_addendums FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.contracts c WHERE c.id = contract_id AND public.is_agency_member(auth.uid(), c.agency_id)));

-- RPC público para obter aditivos por token de contrato público (para a webview de assinatura)
CREATE OR REPLACE FUNCTION public.public_addendums_by_token(_token TEXT)
RETURNS SETOF public.contract_addendums
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT a.*
  FROM public.contract_addendums a
  JOIN public.contracts c ON c.id = a.contract_id
  WHERE c.public_token = _token
  ORDER BY a.created_at ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.public_addendums_by_token(TEXT) TO anon, authenticated;

-- RPC para assinar um aditivo por token público
CREATE OR REPLACE FUNCTION public.sign_addendum_with_token(
  _addendum_id UUID,
  _token TEXT,
  _signer_name TEXT,
  _signer_document TEXT,
  _signature_image TEXT,
  _selfie_image TEXT,
  _ip TEXT,
  _user_agent TEXT,
  _pdf_path TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _contract public.contracts;
  _addendum public.contract_addendums;
BEGIN
  SELECT * INTO _contract FROM public.contracts WHERE public_token = _token;
  IF _contract.id IS NULL THEN RAISE EXCEPTION 'Contrato não encontrado'; END IF;

  SELECT * INTO _addendum FROM public.contract_addendums WHERE id = _addendum_id AND contract_id = _contract.id;
  IF _addendum.id IS NULL THEN RAISE EXCEPTION 'Aditivo não encontrado'; END IF;
  IF _addendum.signed_at IS NOT NULL THEN RAISE EXCEPTION 'Aditivo já assinado'; END IF;

  UPDATE public.contract_addendums
  SET
    status = 'signed',
    signed_at = now(),
    pdf_url = _pdf_path,
    signatures = coalesce(signatures, '[]'::jsonb) || jsonb_build_object(
      'signer_name', _signer_name,
      'signer_document', _signer_document,
      'signed_at', now(),
      'ip', _ip,
      'user_agent', _user_agent,
      'signature_image', _signature_image,
      'selfie_image', _selfie_image
    )
  WHERE id = _addendum.id;
  
  -- Insere na cadeia de auditoria blockchain
  INSERT INTO public.contract_audit_chain (contract_id, action, metadata)
  VALUES (
    _contract.id,
    'ADDENDUM_SIGNED',
    jsonb_build_object(
      'addendum_id', _addendum.id,
      'signer_name', _signer_name,
      'signer_document', _signer_document,
      'ip', _ip
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.sign_addendum_with_token(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;

-- 2. Tabela de Auditoria Imutável (Cadeia de Custódia Blockchain-like)
CREATE TABLE IF NOT EXISTS public.contract_audit_chain (
  id BIGSERIAL PRIMARY KEY,
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  prev_hash TEXT,
  row_hash TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_chain_contract_idx ON public.contract_audit_chain(contract_id);
GRANT SELECT, INSERT ON public.contract_audit_chain TO authenticated;
GRANT ALL ON public.contract_audit_chain TO service_role;
ALTER TABLE public.contract_audit_chain ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_chain read" ON public.contract_audit_chain FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.contracts c WHERE c.id = contract_id AND public.is_agency_member(auth.uid(), c.agency_id)));

-- Trigger de Imutabilidade Estrita: Impede QUALQUER update ou delete
CREATE OR REPLACE FUNCTION public.prevent_modification_on_audit_chain()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'A tabela de auditoria é imutável e não permite modificações ou exclusões.';
END;
$$;

CREATE TRIGGER audit_chain_no_update_delete
BEFORE UPDATE OR DELETE ON public.contract_audit_chain
FOR EACH ROW EXECUTE FUNCTION public.prevent_modification_on_audit_chain();

-- Trigger para Computar Hashing em Cadeia (Blockchain Ledger)
CREATE OR REPLACE FUNCTION public.process_audit_chain_hashing()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  _prev_hash TEXT;
  _current_hash TEXT;
BEGIN
  -- Busca o row_hash do último registro global inserido
  SELECT row_hash INTO _prev_hash 
  FROM public.contract_audit_chain 
  ORDER BY id DESC 
  LIMIT 1;

  -- Computa o hash SHA-256 concatenando o prev_hash, o id do contrato, a ação, metadados e data
  _current_hash := encode(digest(
    coalesce(_prev_hash, 'GENESIS') || 
    NEW.contract_id::text || 
    NEW.action || 
    coalesce(NEW.metadata::text, '{}') || 
    NEW.created_at::text,
    'sha256'
  ), 'hex');

  -- Preenche os campos de integridade
  NEW.prev_hash := _prev_hash;
  NEW.row_hash := _current_hash;

  RETURN NEW;
END;
$$;

CREATE TRIGGER audit_chain_hashing_trigger
BEFORE INSERT ON public.contract_audit_chain
FOR EACH ROW EXECUTE FUNCTION public.process_audit_chain_hashing();
