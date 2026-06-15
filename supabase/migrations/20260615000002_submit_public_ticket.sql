-- Migration: 20260615000002_submit_public_ticket
-- Objetivo: Criar RPC para permitir que visitantes (anon) criem chamados na Landing Page de forma segura sem furar RLS

CREATE OR REPLACE FUNCTION public.submit_public_ticket(
  _agency_slug text,
  _email text,
  _subject text,
  _description text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER -- Permite bypass de RLS de forma controlada
SET search_path = public
AS $$
DECLARE
  v_agency_id uuid;
  v_ticket_id uuid;
BEGIN
  -- 1. Resolver o Agency ID
  SELECT id INTO v_agency_id
  FROM public.agencies
  WHERE slug = _agency_slug
  LIMIT 1;

  IF v_agency_id IS NULL THEN
    RAISE EXCEPTION 'Agency not found';
  END IF;

  -- 2. Inserir o ticket
  INSERT INTO public.support_tickets (
    agency_id,
    title,
    description,
    status,
    priority,
    metadata
  ) VALUES (
    v_agency_id,
    _subject,
    _description,
    'open',
    'medium',
    jsonb_build_object('source', 'landing_page', 'contact_email', _email)
  )
  RETURNING id INTO v_ticket_id;

  RETURN v_ticket_id;
END;
$$;

-- Garantir que anonimos possam chamar a função
GRANT EXECUTE ON FUNCTION public.submit_public_ticket(text, text, text, text) TO anon, authenticated;
