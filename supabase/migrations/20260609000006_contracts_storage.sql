-- =============================================================================
-- TravelOS — Storage for Contracts and Server-Side Hash
-- Migration: 20260609000004_contracts_storage
-- =============================================================================

-- 1. Permitir que clientes anônimos façam upload do PDF assinado para o bucket 'contract-pdfs'
-- O path do arquivo deve ser da forma: {agency_id}/{public_token}/{filename.pdf}
DROP POLICY IF EXISTS "contract_pdfs_anon_insert" ON storage.objects;
CREATE POLICY "contract_pdfs_anon_insert" ON storage.objects
FOR INSERT TO anon
WITH CHECK (
  bucket_id = 'contract-pdfs' AND
  -- Verifica se o segundo nível da pasta é um token público válido e a agência bate
  EXISTS (
    SELECT 1 FROM public.contracts
    WHERE public_token::text = (storage.foldername(name))[2]
      AND agency_id::text = (storage.foldername(name))[1]
      AND status = 'pending_signature' -- Só permite upload se ainda estiver aguardando
  )
);

-- Permitir que anônimos leiam APENAS o seu próprio contrato assinado, usando o token
DROP POLICY IF EXISTS "contract_pdfs_anon_read" ON storage.objects;
CREATE POLICY "contract_pdfs_anon_read" ON storage.objects
FOR SELECT TO anon
USING (
  bucket_id = 'contract-pdfs' AND
  EXISTS (
    SELECT 1 FROM public.contracts
    WHERE public_token::text = (storage.foldername(name))[2]
      AND agency_id::text = (storage.foldername(name))[1]
  )
);

-- 2. Atualizar RPC de Assinatura para fazer hash server-side e receber path
CREATE OR REPLACE FUNCTION public.sign_contract_with_token(
  _token text,
  _signer_name text,
  _signer_document text,
  _signature_image text,
  _selfie_image text,
  _ip text,
  _user_agent text,
  _pdf_path text DEFAULT NULL, -- Agora recebe o path no bucket ao invés de base64 gigante
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

  _serial := upper(substr(md5(random()::text), 1, 12));

  -- Re-calcular hash criptográfico rigoroso no Server-Side para o conteúdo (WORM proof)
  -- Usamos sha256 no pacote+id como digest
  _server_hash := encode(digest(_contract.id::text || COALESCE(_contract.package_summary, '') || _contract.total_value::text, 'sha256'), 'hex');

  UPDATE public.contracts
  SET
    status = 'signed',
    signed_at = now(),
    -- Guarda o hash do servidor + o hash assinado pelo cliente como garantia dupla
    content_hash = _server_hash,
    signed_hash = encode(digest(_signature_image, 'sha256'), 'hex'), -- Hash forte da assinatura grafica
    pdf_url = _pdf_path, -- Aqui será guardado o caminho do storage, ex: "agency_id/token/arquivo.pdf"
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
