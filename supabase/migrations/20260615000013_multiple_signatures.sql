-- Migration: 20260615000013_multiple_signatures.sql
-- Goal: Allow multiple signatures per contract

CREATE OR REPLACE FUNCTION public.sign_contract_with_token(
  _token TEXT,
  _signer_name TEXT,
  _signer_document TEXT,
  _signature_image TEXT,
  _selfie_image TEXT,
  _ip TEXT,
  _user_agent TEXT,
  _pdf_path TEXT DEFAULT NULL,
  _signed_hash TEXT DEFAULT NULL,
  _doc_front TEXT DEFAULT NULL,
  _doc_back TEXT DEFAULT NULL,
  _video_kyc TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _contract public.contracts;
  _serial TEXT;
  _server_hash TEXT;
  _existing_signatures jsonb;
  _is_already_signed_by_this_person boolean := false;
  _item jsonb;
BEGIN
  SELECT * INTO _contract FROM public.contracts WHERE public_token = _token;
  IF _contract.id IS NULL THEN RAISE EXCEPTION 'Contrato não encontrado'; END IF;

  _existing_signatures := coalesce(_contract.signatures, '[]'::jsonb);

  -- Verifica se este documento já assinou
  IF jsonb_typeof(_existing_signatures) = 'array' THEN
    FOR _item IN SELECT jsonb_array_elements(_existing_signatures) LOOP
      IF _item->>'signer_document' = _signer_document THEN
        _is_already_signed_by_this_person := true;
      END IF;
    END LOOP;
  END IF;

  IF _is_already_signed_by_this_person THEN 
    RAISE EXCEPTION 'Contrato já assinado por este documento (%)', _signer_document; 
  END IF;

  -- Geração de serial randômico seguro
  _serial := upper(encode(gen_random_bytes(6), 'hex'));

  -- Re-calcular hash criptográfico no Server-Side
  _server_hash := encode(digest(_contract.id::text || COALESCE(_contract.package_summary, '') || _contract.total_value::text, 'sha256'), 'hex');

  UPDATE public.contracts
  SET
    status = 'signed',
    signed_at = coalesce(signed_at, now()),
    content_hash = coalesce(content_hash, _server_hash),
    signed_hash = coalesce(signed_hash, encode(digest(_signature_image, 'sha256'), 'hex')),
    pdf_url = coalesce(_pdf_path, pdf_url),
    certificate = coalesce(certificate, jsonb_build_object('serial', _serial, 'issued_at', now(), 'client_hash', _signed_hash)),
    signatures = _existing_signatures || jsonb_build_object(
      'signer_name', _signer_name,
      'signer_document', _signer_document,
      'signed_at', now(),
      'ip', _ip,
      'user_agent', _user_agent,
      'signature_image', _signature_image,
      'selfie_image', _selfie_image,
      'doc_front', _doc_front,
      'doc_back', _doc_back,
      'video_kyc', _video_kyc
    )
  WHERE id = _contract.id;

  -- Insere o registro blockchain do contrato principal assinado
  INSERT INTO public.contract_audit_chain (contract_id, action, metadata)
  VALUES (
    _contract.id,
    'CONTRACT_SIGNED',
    jsonb_build_object(
      'signer_name', _signer_name,
      'signer_document', _signer_document,
      'serial', _serial,
      'ip', _ip
    )
  );

  RETURN _serial;
END;
$$;

GRANT EXECUTE ON FUNCTION public.sign_contract_with_token(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
