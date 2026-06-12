-- Migration: 20260612000006_crm_kanban_enrichment
-- Objetivo: Adicionar colunas de enriquecimento no CRM (checklists, tags, anexos, passageiros detalhados, LGPD, tipo de interesse, foto) e atualizar funções SQL.

-- 1. Enriquecimento da tabela leads
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS checklist jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS custom_fields jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS pax_adults integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS pax_children integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pax_infants integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pax_ages jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS lgpd_accepted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS lgpd_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS interest_type text;

-- 2. Enriquecimento da tabela clients
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS avatar_url text;

-- 3. Atualizar a função de conversão de Lead para Cliente
CREATE OR REPLACE FUNCTION public.promote_lead_to_client(_lead_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _lead record;
  _client_id uuid;
  _notes text;
BEGIN
  -- 1. Buscar o lead
  SELECT * INTO _lead
  FROM public.leads
  WHERE id = _lead_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lead não encontrado';
  END IF;

  -- Se já foi convertido, retorna o client_id existente (idempotente)
  IF _lead.client_id IS NOT NULL THEN
    RETURN _lead.client_id;
  END IF;

  -- Construir notas detalhadas da conversão
  _notes := 'Convertido a partir do CRM - Destino de interesse: ' || COALESCE(_lead.destination, 'Não especificado') || '. ' || COALESCE(_lead.notes, '');
  IF _lead.pax_adults > 0 OR _lead.pax_children > 0 OR _lead.pax_infants > 0 THEN
    _notes := _notes || ' | Passageiros: ' || _lead.pax_adults || ' Adulto(s)';
    IF _lead.pax_children > 0 THEN
      _notes := _notes || ', ' || _lead.pax_children || ' Criança(s) (Idades: ' || COALESCE(_lead.pax_ages::text, '[]') || ')';
    END IF;
    IF _lead.pax_infants > 0 THEN
      _notes := _notes || ', ' || _lead.pax_infants || ' Bebê(s)';
    END IF;
  END IF;
  IF _lead.interest_type IS NOT NULL THEN
    _notes := _notes || ' | Tipo de Interesse: ' || _lead.interest_type;
  END IF;

  -- 2. Inserir na tabela de clientes, migrando as fotos e as tags
  INSERT INTO public.clients (
    agency_id,
    kind,
    full_name,
    email,
    phone,
    notes,
    owner_id,
    avatar_url,
    tags
  ) VALUES (
    _lead.agency_id,
    'individual',
    _lead.name,
    _lead.email,
    _lead.phone,
    _notes,
    _lead.owner_id,
    _lead.avatar_url,
    _lead.tags
  ) RETURNING id INTO _client_id;

  -- 3. Atualizar o lead
  UPDATE public.leads
  SET client_id = _client_id,
      converted_at = now()
  WHERE id = _lead_id;

  -- 4. Registrar a atividade de conversão
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

-- 4. Re-garantir a função persist_lead_move
CREATE OR REPLACE FUNCTION public.persist_lead_move(
  _lead_id uuid,
  _to_stage_id uuid,
  _reordered_ids uuid[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.id = _lead_id
      AND public.is_agency_member(auth.uid(), l.agency_id)
  ) THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  UPDATE public.leads
  SET stage_id = _to_stage_id,
      position = array_position(_reordered_ids, id) - 1,
      updated_at = now()
  WHERE id = any(_reordered_ids);
END;
$$;

GRANT EXECUTE ON FUNCTION public.persist_lead_move(uuid, uuid, uuid[]) TO authenticated;

-- 5. Função para buscar detalhes do Lead de forma pública via UUID
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
  interest_type text,
  notes text,
  lgpd_accepted boolean,
  agency_name text,
  agency_logo text
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
    l.interest_type,
    l.notes,
    l.lgpd_accepted,
    a.name as agency_name,
    a.logo_url as agency_logo
  FROM public.leads l
  JOIN public.agencies a ON a.id = l.agency_id
  WHERE l.id = _lead_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.public_lead_by_id(uuid) TO anon, authenticated;

-- 6. Função para salvar as respostas do Lead de forma pública
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
    interest_type = COALESCE((_payload->>'interest_type'), interest_type),
    notes = COALESCE((_payload->>'notes'), notes),
    lgpd_accepted = COALESCE((_payload->>'lgpd_accepted')::boolean, lgpd_accepted),
    lgpd_accepted_at = CASE WHEN (_payload->>'lgpd_accepted')::boolean = true THEN now() ELSE lgpd_accepted_at END,
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

