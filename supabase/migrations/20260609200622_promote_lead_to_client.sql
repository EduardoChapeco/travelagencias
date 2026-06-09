CREATE OR REPLACE FUNCTION public.promote_lead_to_client(_lead_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _lead record;
  _client_id uuid;
BEGIN
  -- 1. Get the lead
  SELECT * INTO _lead
  FROM public.leads
  WHERE id = _lead_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lead not found';
  END IF;

  -- If it already has a client_id, just return it (idempotent)
  IF _lead.client_id IS NOT NULL THEN
    RETURN _lead.client_id;
  END IF;

  -- 2. Insert into clients
  INSERT INTO public.clients (
    agency_id,
    kind,
    full_name,
    email,
    phone,
    notes,
    owner_id
  ) VALUES (
    _lead.agency_id,
    'individual',
    _lead.name,
    _lead.email,
    _lead.phone,
    'Convertido a partir do CRM - Destino de interesse: ' || COALESCE(_lead.destination, 'Não especificado') || '. ' || COALESCE(_lead.notes, ''),
    _lead.owner_id
  ) RETURNING id INTO _client_id;

  -- 3. Update the lead
  UPDATE public.leads
  SET client_id = _client_id,
      converted_at = now()
  WHERE id = _lead_id;

  -- 4. Create an activity in the lead to register the conversion
  INSERT INTO public.lead_activities (
    lead_id,
    agency_id,
    author_id,
    type,
    content
  ) VALUES (
    _lead.id,
    _lead.agency_id,
    auth.uid(),
    'note',
    'Lead convertido com sucesso para Cliente (ID: ' || _client_id || ')'
  );

  RETURN _client_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.promote_lead_to_client(uuid) TO authenticated;
