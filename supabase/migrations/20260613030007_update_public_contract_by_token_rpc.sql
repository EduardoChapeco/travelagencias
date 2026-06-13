-- Atualiza a função public_contract_by_token para retornar os dados de certificado, assinaturas e agency_id
DROP FUNCTION IF EXISTS public.public_contract_by_token(TEXT);

CREATE OR REPLACE FUNCTION public.public_contract_by_token(_token TEXT)
RETURNS TABLE(
  id UUID,
  status TEXT,
  agency_name TEXT,
  agency_logo TEXT,
  package_summary TEXT,
  total_value NUMERIC,
  payment_terms TEXT,
  fixed_clauses JSONB,
  custom_clauses JSONB,
  client_data JSONB,
  passengers_data JSONB,
  signed_at TIMESTAMPTZ,
  content_hash TEXT,
  certificate JSONB,
  signatures JSONB,
  agency_id UUID
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.id, c.status,
    a.name, a.logo_url,
    c.package_summary, c.total_value, c.payment_terms,
    c.fixed_clauses, c.custom_clauses, c.client_data, c.passengers_data,
    c.signed_at, c.content_hash, c.certificate, c.signatures, c.agency_id
  FROM public.contracts c
  JOIN public.agencies a ON a.id = c.agency_id
  WHERE c.public_token = _token
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.public_contract_by_token(TEXT) TO anon, authenticated;
