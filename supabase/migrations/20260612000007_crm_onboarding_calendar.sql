-- Migration: 20260612000007_crm_onboarding_calendar
-- Objetivo: Suporte a acompanhantes, comorbidades/PCD, tráfego Ads, inatividade de leads e agenda de reuniões.

-- 1. Enriquecimento de leads e clientes com dados de saúde, inatividade e fontes de ads
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS pax_list jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS pcd boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reduced_mobility boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS autism boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS health_notes text,
  ADD COLUMN IF NOT EXISTS last_contacted_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS staleness_status text NOT NULL DEFAULT 'active', -- 'active', 'disappeared', 'gave_up', 'no_credit', 'postponed'
  ADD COLUMN IF NOT EXISTS lead_source_detail text; -- 'instagram_ads', 'facebook_ads', 'google_ads', 'organic', etc.

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS pcd boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reduced_mobility boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS autism boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS health_notes text;

-- 2. Tabela de reuniões/compromissos de leads
CREATE TABLE IF NOT EXISTS public.lead_meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  agency_id uuid REFERENCES public.agencies(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  scheduled_at timestamptz NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 30,
  meeting_type text NOT NULL DEFAULT 'call', -- 'call', 'video', 'in_person'
  invite_sent boolean NOT NULL DEFAULT false,
  google_event_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Habilitar RLS nas reuniões
ALTER TABLE public.lead_meetings ENABLE ROW LEVEL SECURITY;

-- Excluir política anterior se existir para evitar conflitos
DROP POLICY IF EXISTS "lead_meetings_policy" ON public.lead_meetings;

CREATE POLICY "lead_meetings_policy" ON public.lead_meetings
  FOR ALL
  TO authenticated
  USING (public.is_agency_member(auth.uid(), agency_id));

-- 3. Tabela de relacionamentos de clientes (família, amigos, casal)
CREATE TABLE IF NOT EXISTS public.client_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  related_client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  relationship_type text NOT NULL, -- 'spouse', 'child', 'parent', 'sibling', 'friend', 'relative', 'other'
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(client_id, related_client_id)
);

-- Habilitar RLS nos relacionamentos
ALTER TABLE public.client_relationships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "client_relationships_policy" ON public.client_relationships;

CREATE POLICY "client_relationships_policy" ON public.client_relationships
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = client_id AND public.is_agency_member(auth.uid(), c.agency_id)
  ));

-- 4. RPC para buscar detalhes do lead de forma pública (atualizada com novos campos)
DROP FUNCTION IF EXISTS public.public_lead_by_id(uuid);
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
  agency_logo text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id, l.name, l.destination, l.email, l.phone,
    l.travel_start, l.travel_end, l.pax_adults, l.pax_children, l.pax_infants,
    l.pax_ages, l.pax_list, l.interest_type, l.notes, l.lgpd_accepted,
    l.pcd, l.reduced_mobility, l.autism, l.health_notes,
    a.name as agency_name, a.logo_url as agency_logo
  FROM public.leads l
  JOIN public.agencies a ON a.id = l.agency_id
  WHERE l.id = _lead_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.public_lead_by_id(uuid) TO anon, authenticated;

-- 5. RPC para salvar de forma pública (atualizada)
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
    updated_at = now()
  WHERE id = _lead_id;

  INSERT INTO public.lead_activities (lead_id, agency_id, type, content)
  SELECT l.id, l.agency_id, 'note', 'Lead atualizou suas preferências e viajantes acompanhantes via formulário público.'
  FROM public.leads l WHERE l.id = _lead_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.public_save_lead(uuid, jsonb) TO anon, authenticated;

-- 6. RPC para conversão otimizada de Lead para Cliente (com comorbidades e acompanhantes)
CREATE OR REPLACE FUNCTION public.promote_lead_to_client_v2(
  _lead_id uuid,
  _client_payload jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _lead record;
  _client_id uuid;
  _related_id uuid;
  _pax jsonb;
  _notes text;
BEGIN
  SELECT * INTO _lead FROM public.leads WHERE id = _lead_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lead não encontrado';
  END IF;

  IF _lead.client_id IS NOT NULL THEN
    RETURN _lead.client_id;
  END IF;

  _notes := 'Convertido do CRM. Notas de saúde e acessibilidade incluídas no cadastro de cliente.';

  -- Inserir cliente principal
  INSERT INTO public.clients (
    agency_id, kind, full_name, email, phone, notes, owner_id, avatar_url, tags,
    document, birth_date, pcd, reduced_mobility, autism, health_notes
  ) VALUES (
    _lead.agency_id, 'individual',
    COALESCE(_client_payload->>'full_name', _lead.name),
    COALESCE(_client_payload->>'email', _lead.email),
    COALESCE(_client_payload->>'phone', _lead.phone),
    _notes, _lead.owner_id, _lead.avatar_url, _lead.tags,
    _client_payload->>'document',
    CASE WHEN (_client_payload->>'birth_date') IS NOT NULL AND (_client_payload->>'birth_date') <> '' THEN (_client_payload->>'birth_date')::date ELSE NULL END,
    COALESCE((_client_payload->>'pcd')::boolean, _lead.pcd),
    COALESCE((_client_payload->>'reduced_mobility')::boolean, _lead.reduced_mobility),
    COALESCE((_client_payload->>'autism')::boolean, _lead.autism),
    COALESCE(_client_payload->>'health_notes', _lead.health_notes)
  ) RETURNING id INTO _client_id;

  -- Inserir acompanhantes como clientes e criar seus relacionamentos
  IF jsonb_array_length(_lead.pax_list) > 0 THEN
    FOR _pax IN SELECT * FROM jsonb_array_elements(_lead.pax_list) LOOP
      INSERT INTO public.clients (
        agency_id, kind, full_name, email, phone, notes, owner_id,
        document, birth_date
      ) VALUES (
        _lead.agency_id, 'individual',
        _pax->>'full_name', _pax->>'email', _pax->>'phone',
        'Cadastrado como acompanhante de ' || COALESCE(_client_payload->>'full_name', _lead.name),
        _lead.owner_id, _pax->>'document',
        CASE WHEN (_pax->>'birth_date') IS NOT NULL AND (_pax->>'birth_date') <> '' THEN (_pax->>'birth_date')::date ELSE NULL END
      ) RETURNING id INTO _related_id;

      INSERT INTO public.client_relationships (
        client_id, related_client_id, relationship_type
      ) VALUES (
        _client_id, _related_id, COALESCE(_pax->>'relationship', 'other')
      ) ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;

  UPDATE public.leads
  SET client_id = _client_id, converted_at = now()
  WHERE id = _lead_id;

  INSERT INTO public.lead_activities (lead_id, agency_id, type, content)
  VALUES (_lead_id, _lead.agency_id, 'note', 'Lead promovido a Cliente Principal com vínculos de acompanhantes no banco.');

  RETURN _client_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.promote_lead_to_client_v2(uuid, jsonb) TO authenticated;
