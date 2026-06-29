-- ============================================================
-- Migration: Group Tours Remediation Fixes (F011)
-- Integrates B2C group tour approvals with cash_transactions
-- ============================================================

CREATE OR REPLACE FUNCTION public.approve_group_enrollment(
  _enrollment_id UUID,
  _agent_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _enrol_rec RECORD;
  _tour_rec RECORD;
  _client_id UUID;
  _new_trip_id UUID;
  _new_plan_id UUID;
  _trip_code TEXT;
  _seats_confirmed INTEGER;
  v_register_id UUID;
  v_session_id UUID;
BEGIN
  -- 1. Lock do registro de inscrição para evitar concorrência/clique duplo
  SELECT * INTO _enrol_rec
    FROM public.group_tour_enrollments
   WHERE id = _enrollment_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inscrição % não encontrada.', _enrollment_id;
  END IF;

  IF _enrol_rec.status = 'confirmed' THEN
    RAISE EXCEPTION 'Inscrição já está confirmada.';
  END IF;

  -- 2. Lock do registro de excursão para cálculo de vagas e assentos
  SELECT * INTO _tour_rec
    FROM public.group_tours
   WHERE id = _enrol_rec.group_tour_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Excursão associada não encontrada.';
  END IF;

  -- Verificar vagas disponíveis (Prevenir overbooking)
  SELECT COUNT(*) INTO _seats_confirmed
    FROM public.group_tour_enrollments
   WHERE group_tour_id = _enrol_rec.group_tour_id
     AND status = 'confirmed';

  IF _tour_rec.total_seats IS NOT NULL AND _seats_confirmed >= _tour_rec.total_seats THEN
    RAISE EXCEPTION 'A excursão já atingiu o limite máximo de vagas (% assentos).', _tour_rec.total_seats;
  END IF;

  -- Verificar conflito de poltrona se houver assento escolhido
  IF _enrol_rec.seat_number IS NOT NULL AND _enrol_rec.seat_number <> '' THEN
    IF EXISTS (
      SELECT 1 
        FROM public.group_tour_enrollments
       WHERE group_tour_id = _enrol_rec.group_tour_id
         AND status = 'confirmed'
         AND seat_number = _enrol_rec.seat_number
    ) THEN
      RAISE EXCEPTION 'A poltrona % já está ocupada por outro passageiro confirmado.', _enrol_rec.seat_number;
    END IF;
  END IF;

  -- 3. Resolver/Criar cliente
  _client_id := _enrol_rec.client_id;
  IF _client_id IS NULL THEN
    IF _enrol_rec.passenger_cpf IS NOT NULL AND _enrol_rec.passenger_cpf <> '' THEN
      SELECT id INTO _client_id 
        FROM public.clients 
       WHERE document = _enrol_rec.passenger_cpf
       LIMIT 1;
    END IF;

    IF _client_id IS NULL AND _enrol_rec.email IS NOT NULL AND _enrol_rec.email <> '' THEN
      SELECT id INTO _client_id 
        FROM public.clients 
       WHERE email = LOWER(_enrol_rec.email)
       LIMIT 1;
    END IF;

    IF _client_id IS NULL THEN
      INSERT INTO public.clients (
        agency_id,
        full_name,
        email,
        phone,
        document,
        kind
      ) VALUES (
        _tour_rec.agency_id,
        _enrol_rec.passenger_name,
        LOWER(_enrol_rec.email),
        _enrol_rec.phone,
        _enrol_rec.passenger_cpf,
        'individual'
      ) RETURNING id INTO _client_id;
    END IF;

    UPDATE public.group_tour_enrollments
       SET client_id = _client_id
     WHERE id = _enrollment_id;
  END IF;

  -- 4. Criar Viagem Individual
  _trip_code := 'GRP-' || (FLOOR(RANDOM() * 9000) + 1000)::text;
  INSERT INTO public.trips (
    agency_id,
    client_id,
    group_tour_id,
    code,
    title,
    destination,
    travel_start,
    travel_end,
    status,
    total_sale,
    total_paid
  ) VALUES (
    _tour_rec.agency_id,
    _client_id,
    _tour_rec.id,
    _trip_code,
    _tour_rec.title || ' - ' || _enrol_rec.passenger_name,
    _tour_rec.destination,
    _tour_rec.departure_date,
    _tour_rec.return_date,
    'confirmed',
    COALESCE(_tour_rec.base_price, 0),
    COALESCE(_enrol_rec.total_paid, _tour_rec.base_price, 0)
  ) RETURNING id INTO _new_trip_id;

  -- 5. Criar Plano de Pagamento
  INSERT INTO public.payment_plans (
    agency_id,
    trip_id,
    client_id,
    total_amount,
    installments_count,
    status
  ) VALUES (
    _tour_rec.agency_id,
    _new_trip_id,
    _client_id,
    COALESCE(_tour_rec.base_price, 0),
    1,
    'active'
  ) RETURNING id INTO _new_plan_id;

  -- 6. Criar Parcela Recebida
  INSERT INTO public.payment_installments (
    payment_plan_id,
    number,
    amount,
    due_date,
    status,
    paid_at,
    payment_method,
    amount_paid
  ) VALUES (
    _new_plan_id,
    1,
    COALESCE(_tour_rec.base_price, 0),
    COALESCE(_tour_rec.departure_date, now()::date),
    'paid',
    now(),
    CASE WHEN _enrol_rec.payment_routing = 'operator' THEN 'bank_transfer' ELSE 'pix' END,
    COALESCE(_enrol_rec.total_paid, _tour_rec.base_price, 0)
  );

  -- 7. Inserir Lançamento de Caixa (Ledger)
  INSERT INTO public.financial_records (
    agency_id,
    trip_id,
    client_id,
    amount,
    type,
    category,
    status,
    paid_at,
    payment_method,
    description,
    currency,
    installments
  ) VALUES (
    _tour_rec.agency_id,
    _new_trip_id,
    _client_id,
    COALESCE(_enrol_rec.total_paid, _tour_rec.base_price, 0),
    'income',
    'excursoes',
    'paid',
    now(),
    'pix',
    'Inscrição aprovada: ' || _enrol_rec.passenger_name || ' na excursão ' || _tour_rec.title || '.',
    'BRL',
    1
  );

  -- 7.1. Inserir Lançamento de Caixa (Caixa Diário/Bancário)
  -- Localizar sessão aberta ativa
  SELECT id, cash_register_id INTO v_session_id, v_register_id
    FROM public.cash_sessions
   WHERE cash_register_id IN (
     SELECT id FROM public.cash_registers WHERE agency_id = _tour_rec.agency_id AND is_active = true
   )
     AND status = 'open'
   LIMIT 1;

  -- Se não encontrar sessão aberta, pegar primeiro banco ou caixa da agência
  IF v_register_id IS NULL THEN
    SELECT id INTO v_register_id
      FROM public.cash_registers
     WHERE agency_id = _tour_rec.agency_id AND is_active = true
     ORDER BY type = 'bank_account' DESC, created_at ASC
     LIMIT 1;
  END IF;

  -- Inserir no caixa se houver
  IF v_register_id IS NOT NULL THEN
    INSERT INTO public.cash_transactions (
      agency_id,
      cash_register_id,
      cash_session_id,
      trip_id,
      payment_installment_id,
      amount,
      type,
      payment_method,
      notes,
      transaction_date
    ) VALUES (
      _tour_rec.agency_id,
      v_register_id,
      v_session_id,
      _new_trip_id,
      NULL,
      COALESCE(_enrol_rec.total_paid, _tour_rec.base_price, 0),
      'receipt',
      'pix',
      'Inscrição aprovada: ' || _enrol_rec.passenger_name || ' na excursão ' || _tour_rec.title || '.',
      now()
    );
  END IF;

  -- 8. Confirmar Inscrição
  UPDATE public.group_tour_enrollments
     SET status = 'confirmed',
         total_paid = COALESCE(_enrol_rec.total_paid, _tour_rec.base_price, 0)
   WHERE id = _enrollment_id;

  RETURN jsonb_build_object(
    'success', true,
    'client_id', _client_id,
    'trip_id', _new_trip_id,
    'trip_code', _trip_code
  );
END;
$$;
