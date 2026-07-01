-- Migration: 20260701000000_multi_signer_rpc.sql
-- Goal: Update sign_contract_with_token to support multi-signers

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
  _expected_signatures_count INT := 1;
  _current_signatures_count INT;
  _new_signatures jsonb;
  _new_status TEXT := 'pending_signature';
  _new_signed_at TIMESTAMPTZ := NULL;
  _certificate jsonb := NULL;
  _clean_signer_doc TEXT;
  _clean_item_doc TEXT;
BEGIN
  SELECT * INTO _contract FROM public.contracts WHERE public_token = _token;
  IF _contract.id IS NULL THEN RAISE EXCEPTION 'Contrato não encontrado'; END IF;

  _existing_signatures := coalesce(_contract.signatures, '[]'::jsonb);
  _clean_signer_doc := regexp_replace(_signer_document, '\D', '', 'g');

  -- Verifica se este documento já assinou
  IF jsonb_typeof(_existing_signatures) = 'array' THEN
    FOR _item IN SELECT jsonb_array_elements(_existing_signatures) LOOP
      _clean_item_doc := regexp_replace(_item->>'signer_document', '\D', '', 'g');
      IF _clean_item_doc = _clean_signer_doc THEN
        _is_already_signed_by_this_person := true;
      END IF;
    END LOOP;
  END IF;

  IF _is_already_signed_by_this_person THEN 
    RAISE EXCEPTION 'Contrato já assinado por este documento (%)', _signer_document; 
  END IF;

  -- Determinar número esperado de assinaturas com base no client_data
  IF jsonb_typeof(_contract.client_data) = 'array' THEN
    _expected_signatures_count := jsonb_array_length(_contract.client_data);
    IF _expected_signatures_count = 0 THEN
      _expected_signatures_count := 1;
    END IF;
  END IF;

  -- Geração de serial randômico seguro
  _serial := upper(encode(gen_random_bytes(6), 'hex'));

  -- Re-calcular hash criptográfico no Server-Side
  _server_hash := encode(digest(_contract.id::text || COALESCE(_contract.package_summary, '') || _contract.total_value::text, 'sha256'), 'hex');

  _new_signatures := _existing_signatures || jsonb_build_object(
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
  );

  _current_signatures_count := jsonb_array_length(_new_signatures);

  IF _current_signatures_count >= _expected_signatures_count THEN
    _new_status := 'signed';
    _new_signed_at := now();
    _certificate := jsonb_build_object('serial', _serial, 'issued_at', now(), 'client_hash', _signed_hash);
  ELSE
    _new_status := 'pending_signature';
    _new_signed_at := NULL;
    _certificate := NULL;
  END IF;

  UPDATE public.contracts
  SET
    status = _new_status,
    signed_at = _new_signed_at,
    content_hash = coalesce(content_hash, _server_hash),
    signed_hash = coalesce(signed_hash, encode(digest(_signature_image, 'sha256'), 'hex')),
    pdf_url = coalesce(_pdf_path, pdf_url),
    certificate = coalesce(_certificate, certificate),
    signatures = _new_signatures
  WHERE id = _contract.id;

  -- Insere o registro blockchain do contrato principal assinado
  INSERT INTO public.contract_audit_chain (contract_id, action, metadata)
  VALUES (
    _contract.id,
    CASE WHEN _new_status = 'signed' THEN 'CONTRACT_SIGNED' ELSE 'CONTRACT_PARTIALLY_SIGNED' END,
    jsonb_build_object(
      'signer_name', _signer_name,
      'signer_document', _signer_document,
      'serial', _serial,
      'ip', _ip,
      'signatures_collected', _current_signatures_count,
      'signatures_expected', _expected_signatures_count
    )
  );

  RETURN _serial;
END;
$$;

GRANT EXECUTE ON FUNCTION public.sign_contract_with_token(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
