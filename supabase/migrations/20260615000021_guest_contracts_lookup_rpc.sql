-- Migração para consulta de contratos pública por pagantes/viajantes sem login
CREATE OR REPLACE FUNCTION public.get_contracts_by_payer_info(
  p_email TEXT,
  p_document TEXT,
  p_agency_id UUID
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  public_token TEXT,
  status TEXT,
  total_value NUMERIC,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  clean_doc TEXT;
BEGIN
  -- Se ambos os parâmetros estiverem vazios, não retorna nada
  IF (p_email IS NULL OR p_email = '') AND (p_document IS NULL OR p_document = '') THEN
    RETURN;
  END IF;

  -- Normaliza o documento removendo caracteres não numéricos
  clean_doc := regexp_replace(p_document, '\D', '', 'g');
  IF clean_doc = '' THEN
    clean_doc := p_document;
  END IF;

  RETURN QUERY
  SELECT 
    c.id,
    COALESCE(c.package_summary, 'Contrato de Viagem') as title,
    c.public_token,
    c.status,
    c.total_value,
    c.created_at
  FROM public.contracts c
  LEFT JOIN public.trips t ON t.id = c.trip_id AND t.deleted_at IS NULL
  LEFT JOIN public.clients cl ON cl.id = t.client_id
  WHERE c.agency_id = p_agency_id
    AND (
      -- 1. Combinação de Email no client_data do contrato
      (p_email IS NOT NULL AND p_email <> '' AND EXISTS (
        SELECT 1 FROM jsonb_array_elements(c.client_data) AS cd
        WHERE LOWER(cd->>'email') = LOWER(p_email)
      ))
      OR
      -- 2. Combinação de Documento no client_data do contrato
      (p_document IS NOT NULL AND p_document <> '' AND EXISTS (
        SELECT 1 FROM jsonb_array_elements(c.client_data) AS cd
        WHERE regexp_replace(cd->>'cpf', '\D', '', 'g') = clean_doc
           OR regexp_replace(cd->>'cnpj', '\D', '', 'g') = clean_doc
           OR cd->>'document' = p_document
           OR cd->>'cpf' = p_document
      ))
      OR
      -- 3. Combinação de Email no cliente associado à viagem
      (p_email IS NOT NULL AND p_email <> '' AND LOWER(cl.email) = LOWER(p_email))
      OR
      -- 4. Combinação de CPF/CNPJ no cliente associado à viagem
      (p_document IS NOT NULL AND p_document <> '' AND (
        regexp_replace(cl.cpf, '\D', '', 'g') = clean_doc
        OR regexp_replace(cl.cnpj, '\D', '', 'g') = clean_doc
        OR cl.cpf = p_document
      ))
    )
  ORDER BY c.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_contracts_by_payer_info(TEXT, TEXT, UUID) TO anon, authenticated;
