-- Migration: 20260615000001_leads_public_form_custom_fields
-- Objetivo: Atualizar funções de formulário público para ler e gravar custom_fields (Período Flexível de Interesse) mantendo os campos de acessibilidade e acompanhantes

CREATE OR REPLACE FUNCTION public.public_lead_by_id(_lead_id uuid)
RETURNS TABLE (
  id uuid,
  name text,
  destination text,
  email text,
  phone text,
  travel_start date,
  travel_end date,
  pax_adults integer,
  pax_children integer,
  pax_infants integer,
  pax_ages jsonb,
  pax_list jsonb,
  interest_type text,
  notes text,
  lgpd_accepted boolean,
  pcd boolean,
  reduced_mobility boolean,
  autism boolean,
  health_notes text,
  agency_name text,
  agency_logo text,
  custom_fields jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id,
    l.name,
    l.destination,
    l.email,
    l.phone,
    l.travel_start,
    l.travel_end,
    l.pax_adults,
    l.pax_children,
    l.pax_infants,
    l.pax_ages,
    l.pax_list,
    l.interest_type,
    l.notes,
    l.lgpd_accepted,
    l.pcd,
    l.reduced_mobility,
    l.autism,
    l.health_notes,
    a.name as agency_name,
    a.logo_url as agency_logo,
    l.custom_fields
  FROM public.leads l
  JOIN public.agencies a ON a.id = l.agency_id
  WHERE l.id = _lead_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.public_lead_by_id(uuid) TO anon, authenticated;


CREATE OR REPLACE FUNCTION public.public_save_lead(_lead_id uuid, _payload jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.leads
  SET
    name = COALESCE((_payload->>'name'), name),
    email = COALESCE((_payload->>'email'), email),
    phone = COALESCE((_payload->>'phone'), phone),
    destination = COALESCE((_payload->>'destination'), destination),
    travel_start = CASE WHEN (_payload->>'travel_start') IS NOT NULL AND (_payload->>'travel_start') <> '' THEN (_payload->>'travel_start')::date ELSE travel_start END,
    travel_end = CASE WHEN (_payload->>'travel_end') IS NOT NULL AND (_payload->>'travel_end') <> '' THEN (_payload->>'travel_end')::date ELSE travel_end END,
    pax_adults = COALESCE((_payload->>'pax_adults')::integer, pax_adults),
    pax_children = COALESCE((_payload->>'pax_children')::integer, pax_children),
    pax_infants = COALESCE((_payload->>'pax_infants')::integer, pax_infants),
    pax_ages = COALESCE((_payload->'pax_ages'), pax_ages),
    pax_list = COALESCE((_payload->'pax_list'), pax_list),
    interest_type = COALESCE((_payload->>'interest_type'), interest_type),
    notes = COALESCE((_payload->>'notes'), notes),
    lgpd_accepted = COALESCE((_payload->>'lgpd_accepted')::boolean, lgpd_accepted),
    lgpd_accepted_at = CASE WHEN (_payload->>'lgpd_accepted')::boolean = true THEN now() ELSE lgpd_accepted_at END,
    pcd = COALESCE((_payload->>'pcd')::boolean, pcd),
    reduced_mobility = COALESCE((_payload->>'reduced_mobility')::boolean, reduced_mobility),
    autism = COALESCE((_payload->>'autism')::boolean, autism),
    health_notes = COALESCE((_payload->>'health_notes'), health_notes),
    custom_fields = COALESCE((_payload->'custom_fields'), custom_fields),
    updated_at = now()
  WHERE id = _lead_id;

  -- Registrar a atividade no histórico do lead
  INSERT INTO public.lead_activities (
    lead_id,
    agency_id,
    type,
    content
  )
  SELECT 
    l.id,
    l.agency_id,
    'note',
    'Lead preencheu o formulário de preferências personalizado via link público.'
  FROM public.leads l
  WHERE l.id = _lead_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.public_save_lead(uuid, jsonb) TO anon, authenticated;
