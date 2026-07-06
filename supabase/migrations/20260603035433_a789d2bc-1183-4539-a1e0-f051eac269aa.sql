
-- Public tokens for magic links
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS public_token text UNIQUE DEFAULT replace(gen_random_uuid()::text, '-', '');

ALTER TABLE public.financial_records
  ADD COLUMN IF NOT EXISTS public_token text UNIQUE DEFAULT replace(gen_random_uuid()::text, '-', '');

UPDATE public.contracts SET public_token = replace(gen_random_uuid()::text, '-', '') WHERE public_token IS NULL;
UPDATE public.financial_records SET public_token = replace(gen_random_uuid()::text, '-', '') WHERE public_token IS NULL;

CREATE INDEX IF NOT EXISTS contracts_public_token_idx ON public.contracts(public_token);
CREATE INDEX IF NOT EXISTS financial_records_public_token_idx ON public.financial_records(public_token);

-- Public contract viewer (returns minimal data for signing)
CREATE OR REPLACE FUNCTION public.public_contract_by_token(_token text)
RETURNS TABLE(
  id uuid,
  status text,
  agency_name text,
  agency_logo text,
  package_summary text,
  total_value numeric,
  payment_terms text,
  fixed_clauses jsonb,
  custom_clauses jsonb,
  client_data jsonb,
  passengers_data jsonb,
  signed_at timestamptz,
  content_hash text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.id, c.status,
    a.name, a.logo_url,
    c.package_summary, c.total_value, c.payment_terms,
    c.fixed_clauses, c.custom_clauses, c.client_data, c.passengers_data,
    c.signed_at, c.content_hash
  FROM public.contracts c
  JOIN public.agencies a ON a.id = c.agency_id
  WHERE c.public_token = _token
  LIMIT 1;
$$;

-- Sign contract via token (passenger writes signature payload)
CREATE OR REPLACE FUNCTION public.sign_contract_with_token(
  _token text,
  _signer_name text,
  _signer_document text,
  _signature_image text,
  _selfie_image text,
  _ip text,
  _user_agent text
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _contract public.contracts;
  _hash text;
  _serial text;
  _sig jsonb;
BEGIN
  SELECT * INTO _contract FROM public.contracts WHERE public_token = _token;
  IF _contract.id IS NULL THEN RAISE EXCEPTION 'Contrato não encontrado'; END IF;
  IF _contract.signed_at IS NOT NULL THEN RAISE EXCEPTION 'Contrato já assinado'; END IF;

  _hash := encode(digest(
    coalesce(_contract.package_summary,'') ||
    coalesce(_contract.payment_terms,'') ||
    coalesce(_signer_name,'') ||
    coalesce(_signer_document,'') ||
    now()::text,
    'sha256'
  ), 'hex');

  _serial := upper(substring(replace(gen_random_uuid()::text,'-',''),1,16));

  _sig := jsonb_build_object(
    'signer_name', _signer_name,
    'signer_document', _signer_document,
    'signature_image', _signature_image,
    'selfie_image', _selfie_image,
    'ip', _ip,
    'user_agent', _user_agent,
    'signed_at', now()
  );

  UPDATE public.contracts
  SET status = 'signed',
      signed_at = now(),
      signed_hash = _hash,
      content_hash = coalesce(content_hash, _hash),
      signatures = coalesce(signatures,'[]'::jsonb) || jsonb_build_array(_sig),
      certificate = jsonb_build_object(
        'serial', _serial,
        'issuer', 'Turis Assinaturas',
        'issued_at', now(),
        'verification_url', '/verify/' || _serial
      )
  WHERE id = _contract.id;

  RETURN _contract.id;
END; $$;

-- Public payment viewer
CREATE OR REPLACE FUNCTION public.public_payment_by_token(_token text)
RETURNS TABLE(
  id uuid,
  description text,
  amount numeric,
  currency text,
  due_date date,
  status text,
  agency_name text,
  agency_logo text,
  trip_title text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT f.id, f.description, f.amount, f.currency, f.due_date, f.status,
    a.name, a.logo_url, t.title
  FROM public.financial_records f
  JOIN public.agencies a ON a.id = f.agency_id
  LEFT JOIN public.trips t ON t.id = f.trip_id
  WHERE f.public_token = _token
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.confirm_payment_with_token(
  _token text,
  _payment_method text,
  _receipt_url text
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _rec public.financial_records;
BEGIN
  SELECT * INTO _rec FROM public.financial_records WHERE public_token = _token;
  IF _rec.id IS NULL THEN RAISE EXCEPTION 'Pagamento não encontrado'; END IF;
  IF _rec.paid_at IS NOT NULL THEN RAISE EXCEPTION 'Pagamento já confirmado'; END IF;

  UPDATE public.financial_records
  SET paid_at = now(),
      status = 'confirmed',
      payment_method = coalesce(_payment_method, payment_method),
      receipt_url = coalesce(_receipt_url, receipt_url)
  WHERE id = _rec.id;
  RETURN _rec.id;
END; $$;

-- Public passenger update via magic-link token (used by /m/passenger/:token)
CREATE OR REPLACE FUNCTION public.public_passenger_by_token(_token text)
RETURNS TABLE(
  id uuid,
  trip_title text,
  agency_name text,
  agency_logo text,
  full_name text,
  document text,
  document_type text,
  cpf text,
  passport_number text,
  passport_expiry date,
  birth_date date,
  nationality text,
  email text,
  phone text,
  meal_preference text,
  disabilities text,
  data_complete boolean,
  filled_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, t.title, a.name, a.logo_url,
    p.full_name, p.document, p.document_type, p.cpf, p.passport_number, p.passport_expiry,
    p.birth_date, p.nationality, p.email, p.phone, p.meal_preference, p.disabilities,
    p.data_complete, p.magic_link_filled_at
  FROM public.trip_passengers p
  JOIN public.trips t ON t.id = p.trip_id
  JOIN public.agencies a ON a.id = p.agency_id
  WHERE p.magic_link_token = _token
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.save_passenger_with_token(
  _token text,
  _payload jsonb
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _row public.trip_passengers;
BEGIN
  SELECT * INTO _row FROM public.trip_passengers WHERE magic_link_token = _token;
  IF _row.id IS NULL THEN RAISE EXCEPTION 'Passageiro não encontrado'; END IF;

  UPDATE public.trip_passengers SET
    full_name = coalesce(_payload->>'full_name', full_name),
    document = coalesce(_payload->>'document', document),
    document_type = coalesce(_payload->>'document_type', document_type),
    cpf = coalesce(_payload->>'cpf', cpf),
    passport_number = coalesce(_payload->>'passport_number', passport_number),
    passport_expiry = nullif(_payload->>'passport_expiry','')::date,
    birth_date = nullif(_payload->>'birth_date','')::date,
    nationality = coalesce(_payload->>'nationality', nationality),
    email = coalesce(_payload->>'email', email),
    phone = coalesce(_payload->>'phone', phone),
    meal_preference = coalesce(_payload->>'meal_preference', meal_preference),
    disabilities = coalesce(_payload->>'disabilities', disabilities),
    data_complete = true,
    magic_link_filled_at = now()
  WHERE id = _row.id;
  RETURN _row.id;
END; $$;

-- Grant only the public RPCs to anon/authenticated
REVOKE ALL ON FUNCTION public.public_contract_by_token(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sign_contract_with_token(text,text,text,text,text,text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.public_payment_by_token(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.confirm_payment_with_token(text,text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.public_passenger_by_token(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.save_passenger_with_token(text,jsonb) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.public_contract_by_token(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sign_contract_with_token(text,text,text,text,text,text,text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_payment_by_token(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_payment_with_token(text,text,text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_passenger_by_token(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_passenger_with_token(text,jsonb) TO anon, authenticated;
