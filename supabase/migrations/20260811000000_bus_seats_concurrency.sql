-- ============================================================
-- Migration: Bus Seats Concurrency (Phase 3.5)
-- Adiciona bloqueios contra Overbooking de Poltronas em tempo real
-- ============================================================

-- 1. Unique Index Parcial
-- Garante a nível de banco que não existirão duas poltronas iguais na mesma viagem,
-- a menos que uma delas esteja cancelada ou a poltrona seja nula (bebês no colo).
CREATE UNIQUE INDEX IF NOT EXISTS idx_group_tours_enrollments_seat 
ON public.group_tour_enrollments (group_tour_id, seat_number) 
WHERE status != 'cancelled' AND seat_number IS NOT NULL;

-- 2. Atualização da RPC com Pessimistic Lock e Check
CREATE OR REPLACE FUNCTION public.enroll_public_tour(
  _agency_id uuid,
  _tour_id uuid,
  _passenger_name text,
  _passenger_cpf text,
  _email text,
  _phone text,
  _notes text,
  _source text,
  _selected_seats text[],
  _unit_price numeric,
  _pax_count integer,
  _destination text,
  _receipt_url text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_stage_id uuid;
  v_lead_id uuid;
  v_seat text;
  v_enrollment_id uuid;
  v_reserved_seats integer;
BEGIN
  -- VALIDAR COMPROVANTE OBRIGATÓRIO E NÃO VAZIO
  IF _receipt_url IS NULL OR TRIM(_receipt_url) = '' THEN
    RAISE EXCEPTION 'O comprovante de pagamento Pix é obrigatório para confirmar a inscrição.';
  END IF;

  -- LOCK PESSIMISTA NA EXCURSÃO (Enfileira transações simultâneas de poltronas na mesma viagem)
  PERFORM 1 FROM public.group_tours WHERE id = _tour_id FOR UPDATE;

  -- VERIFICAR CONCORRÊNCIA DE POLTRONAS APÓS OBTER O LOCK
  IF array_length(_selected_seats, 1) IS NOT NULL AND array_length(_selected_seats, 1) > 0 THEN
    IF EXISTS (
      SELECT 1 FROM public.group_tour_enrollments
      WHERE group_tour_id = _tour_id
        AND status != 'cancelled'
        AND seat_number = ANY(_selected_seats)
    ) THEN
      RAISE EXCEPTION 'ALERTA DE CONCORRÊNCIA: Uma ou mais poltronas selecionadas acabaram de ser reservadas por outra pessoa. Atualize a página e escolha poltronas diferentes.';
    END IF;
  END IF;

  -- Obter primeiro estágio do funil de vendas
  SELECT id INTO v_stage_id FROM public.lead_stages WHERE agency_id = _agency_id ORDER BY position ASC LIMIT 1;
  IF v_stage_id IS NULL THEN
    RAISE EXCEPTION 'O funil desta agência não possui estágios configurados.';
  END IF;

  -- Inserir Lead
  INSERT INTO public.leads (
    agency_id, stage_id, name, email, phone, destination, estimated_value, source, notes
  ) VALUES (
    _agency_id, v_stage_id, _passenger_name, _email, _phone, 'Interesse: ' || _destination, _unit_price * _pax_count, _source, _notes
  ) RETURNING id INTO v_lead_id;

  -- Inserir registros de inscrição (um por poltrona ou único sem poltrona)
  IF array_length(_selected_seats, 1) IS NOT NULL AND array_length(_selected_seats, 1) > 0 THEN
    FOREACH v_seat IN ARRAY _selected_seats LOOP
      INSERT INTO public.group_tour_enrollments (
        agency_id, group_tour_id, passenger_name, passenger_cpf, seat_number, total_paid, status, notes, receipt_url, email, phone
      ) VALUES (
        _agency_id, _tour_id, _passenger_name, _passenger_cpf, v_seat, 0, 'pending', _notes, _receipt_url, _email, _phone
      ) RETURNING id INTO v_enrollment_id;
    END LOOP;
  ELSE
    INSERT INTO public.group_tour_enrollments (
      agency_id, group_tour_id, passenger_name, passenger_cpf, seat_number, total_paid, status, notes, receipt_url, email, phone
    ) VALUES (
      _agency_id, _tour_id, _passenger_name, _passenger_cpf, NULL, 0, 'pending', _notes, _receipt_url, _email, _phone
    ) RETURNING id INTO v_enrollment_id;
  END IF;

  -- Incrementar poltronas reservadas na excursão
  SELECT COALESCE(reserved_seats, 0) INTO v_reserved_seats FROM public.group_tours WHERE id = _tour_id;
  UPDATE public.group_tours
  SET reserved_seats = v_reserved_seats + _pax_count
  WHERE id = _tour_id;

  RETURN json_build_object(
    'success', true,
    'lead_id', v_lead_id,
    'enrollment_id', v_enrollment_id
  );
END;
$$;
