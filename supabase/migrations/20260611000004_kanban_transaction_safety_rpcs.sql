-- Migration: 20260611000004_kanban_transaction_safety_rpcs
-- Objetivo: Implementar RPCs de transação única para resolver o anti-padrão de N-writes concorrentes REST em reordenações de Kanban e estágios.

-- 1. Persistir movimento e reordenação de Leads (CRM)
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

-- 2. Persistir movimento e reordenação de Vistos (Visas)
CREATE OR REPLACE FUNCTION public.persist_visa_move(
  _visa_id uuid,
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
    SELECT 1 FROM public.visas v
    WHERE v.id = _visa_id
      AND public.is_agency_member(auth.uid(), v.agency_id)
  ) THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  UPDATE public.visas
  SET stage_id = _to_stage_id,
      position = array_position(_reordered_ids, id) - 1,
      updated_at = now()
  WHERE id = any(_reordered_ids);
END;
$$;

GRANT EXECUTE ON FUNCTION public.persist_visa_move(uuid, uuid, uuid[]) TO authenticated;

-- 3. Persistir movimento e reordenação de Embarques (Boarding Cards)
CREATE OR REPLACE FUNCTION public.persist_boarding_card_move(
  _card_id uuid,
  _to_status text,
  _reordered_ids uuid[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.boarding_cards b
    WHERE b.id = _card_id
      AND public.is_agency_member(auth.uid(), b.agency_id)
  ) THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  UPDATE public.boarding_cards
  SET status = _to_status,
      position = array_position(_reordered_ids, id) - 1,
      updated_at = now()
  WHERE id = any(_reordered_ids);
END;
$$;

GRANT EXECUTE ON FUNCTION public.persist_boarding_card_move(uuid, text, uuid[]) TO authenticated;

-- 4. Atualizar estágios de Leads (CRM Stages) em lote
CREATE OR REPLACE FUNCTION public.save_lead_stages_updates(
  _agency_id uuid,
  _stages jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _stage jsonb;
  _id uuid;
  _name text;
  _color text;
  _position int;
  _is_won boolean;
  _is_lost boolean;
BEGIN
  IF NOT public.is_agency_member(auth.uid(), _agency_id) THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  FOR _stage IN SELECT * FROM jsonb_array_elements(_stages) LOOP
    _name := _stage->>'name';
    _color := _stage->>'color';
    _position := (_stage->>'position')::int;
    _is_won := coalesce((_stage->>'is_won')::boolean, false);
    _is_lost := coalesce((_stage->>'is_lost')::boolean, false);

    IF _stage->>'id' LIKE 'temp_%' OR _stage->>'id' IS NULL THEN
      INSERT INTO public.lead_stages (agency_id, name, color, position, is_won, is_lost)
      VALUES (_agency_id, _name, _color, _position, _is_won, _is_lost);
    ELSE
      _id := (_stage->>'id')::uuid;
      UPDATE public.lead_stages
      SET name = _name,
          color = _color,
          position = _position,
          is_won = _is_won,
          is_lost = _is_lost,
          updated_at = now()
      WHERE id = _id AND agency_id = _agency_id;
    END IF;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_lead_stages_updates(uuid, jsonb) TO authenticated;
