-- =============================================================================
-- Turis — Master Security & Architecture Audit Fixes
-- Migration: 20260609000005_master_audit_fixes
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. PREVENÇÃO DE DDOS / FULL TABLE SCAN
-- ─────────────────────────────────────────────────────────────────────────────
-- O endpoint verify_contract busca pelo jsonb ->> 'serial'. 
-- A falta de índice causava um Sequential Scan total.
CREATE INDEX IF NOT EXISTS contracts_certificate_serial_idx 
ON public.contracts ((certificate->>'serial'));

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. CRIPTOGRAFIA DE CONTRATO FORTE (ENTROPIA REAL)
-- ─────────────────────────────────────────────────────────────────────────────
-- O PostgreSQL random() não é criptograficamente seguro.
-- Precisamos usar pgcrypto para gerar seriais impossíveis de prever.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.sign_contract_with_token(
  _token text,
  _signer_name text,
  _signer_document text,
  _signature_image text,
  _selfie_image text,
  _ip text,
  _user_agent text,
  _pdf_path text DEFAULT NULL,
  _signed_hash text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _contract public.contracts;
  _serial text;
  _server_hash text;
BEGIN
  SELECT * INTO _contract FROM public.contracts WHERE public_token = _token;
  IF _contract.id IS NULL THEN RAISE EXCEPTION 'Contrato não encontrado'; END IF;
  IF _contract.signed_at IS NOT NULL THEN RAISE EXCEPTION 'Contrato já assinado'; END IF;

  -- Uso do pgcrypto para gerar 6 bytes randômicos seguros (12 caracteres hex)
  _serial := upper(encode(gen_random_bytes(6), 'hex'));

  -- Re-calcular hash criptográfico rigoroso no Server-Side
  _server_hash := encode(digest(_contract.id::text || COALESCE(_contract.package_summary, '') || _contract.total_value::text, 'sha256'), 'hex');

  UPDATE public.contracts
  SET
    status = 'signed',
    signed_at = now(),
    content_hash = _server_hash,
    signed_hash = encode(digest(_signature_image, 'sha256'), 'hex'),
    pdf_url = _pdf_path,
    certificate = jsonb_build_object('serial', _serial, 'issued_at', now(), 'client_hash', _signed_hash),
    signatures = coalesce(signatures, '[]'::jsonb) || jsonb_build_object(
      'signer_name', _signer_name,
      'signer_document', _signer_document,
      'signed_at', now(),
      'ip', _ip,
      'user_agent', _user_agent,
      'signature_image', _signature_image,
      'selfie_image', _selfie_image
    )
  WHERE id = _contract.id;

  RETURN _serial;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. AUDIT LOG POISONING (Imutabilidade de Trilhas de Auditoria)
-- ─────────────────────────────────────────────────────────────────────────────
-- Revogar o acesso direto de INSERT para usuários comuns
DROP POLICY IF EXISTS "audit insert" ON public.audit_log;

-- Apenas funções backend ou RPCs estritas devem inserir logs
CREATE OR REPLACE FUNCTION public.log_audit_event(
  _agency_id uuid,
  _action text,
  _entity_type text,
  _entity_id uuid,
  _metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_log (
    agency_id, actor_id, actor_type, action, entity_type, entity_id, metadata, ip_address
  ) VALUES (
    _agency_id,
    auth.uid(),
    'user',
    _action,
    _entity_type,
    _entity_id,
    _metadata,
    current_setting('request.headers', true)::json->>'x-real-ip'
  );
END;
$$;

-- Garantir acesso de execução ao RPC para usuários
REVOKE EXECUTE ON FUNCTION public.log_audit_event(uuid, text, text, uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_audit_event(uuid, text, text, uuid, jsonb) TO authenticated;
