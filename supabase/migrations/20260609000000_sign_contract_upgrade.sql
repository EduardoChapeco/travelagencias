-- Migration para adicionar PDF e Hash na função de assinatura de contrato
CREATE OR REPLACE FUNCTION public.sign_contract_with_token(
  _token text,
  _signer_name text,
  _signer_document text,
  _signature_image text,
  _selfie_image text,
  _ip text,
  _user_agent text,
  _pdf_data text DEFAULT NULL,
  _signed_hash text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _contract public.contracts;
  _serial text;
BEGIN
  SELECT * INTO _contract FROM public.contracts WHERE public_token = _token;
  IF _contract.id IS NULL THEN RAISE EXCEPTION 'Contrato não encontrado'; END IF;
  IF _contract.signed_at IS NOT NULL THEN RAISE EXCEPTION 'Contrato já assinado'; END IF;

  _serial := upper(substr(md5(random()::text), 1, 12));

  UPDATE public.contracts
  SET
    status = 'signed',
    signed_at = now(),
    content_hash = coalesce(_signed_hash, md5(_contract.package_summary)),
    signed_hash = md5(_signature_image),
    pdf_url = _pdf_data, -- Salvando a base64 diretamente (num cenario real isso vai para o Storage bucket, mas por simplicidade mantemos na coluna de teste se for base64)
    certificate = jsonb_build_object('serial', _serial, 'issued_at', now()),
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
