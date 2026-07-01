-- Migration: 20260900000003_verify_contract_multi_signer.sql
-- Goal: Update verify_contract RPC to correctly extract names from multi-signer array schema

DROP FUNCTION IF EXISTS public.verify_contract(text);

CREATE OR REPLACE FUNCTION public.verify_contract(_serial text)
RETURNS TABLE (
  parties_masked text,
  signed_at timestamptz,
  content_hash text,
  signed_hash text,
  issuer text,
  status text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _contract public.contracts;
  _parties TEXT := '';
  _item jsonb;
BEGIN
  SELECT * INTO _contract FROM public.contracts WHERE certificate->>'serial' = _serial LIMIT 1;
  IF _contract.id IS NULL THEN
    RETURN;
  END IF;

  IF jsonb_typeof(_contract.client_data) = 'array' THEN
    FOR _item IN SELECT jsonb_array_elements(_contract.client_data) LOOP
      IF coalesce(_item->>'name', _item->>'full_name', '') <> '' THEN
        IF _parties <> '' THEN
          _parties := _parties || ', ';
        END IF;
        _parties := _parties || coalesce(_item->>'name', _item->>'full_name', '');
      END IF;
    END LOOP;
  ELSE
    _parties := coalesce(_contract.client_data->>'name', _contract.client_data->>'full_name', 'Cliente');
  END IF;

  IF _parties IS NULL OR _parties = '' THEN
    _parties := 'Cliente';
  END IF;

  parties_masked := _parties;
  signed_at := _contract.signed_at;
  content_hash := _contract.content_hash;
  signed_hash := _contract.signed_hash;
  issuer := 'TravelOS Assinaturas';
  status := _contract.status;

  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_contract(text) TO anon, authenticated;
