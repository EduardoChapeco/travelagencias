-- Sobrescreve a função sign_contract_with_token com suporte a documentos e vídeo de KYC
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
BEGIN
  SELECT * INTO _contract FROM public.contracts WHERE public_token = _token;
  IF _contract.id IS NULL THEN RAISE EXCEPTION 'Contrato não encontrado'; END IF;
  IF _contract.signed_at IS NOT NULL THEN RAISE EXCEPTION 'Contrato já assinado'; END IF;

  -- Geração de serial randômico seguro
  _serial := upper(encode(gen_random_bytes(6), 'hex'));

  -- Re-calcular hash criptográfico no Server-Side
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
