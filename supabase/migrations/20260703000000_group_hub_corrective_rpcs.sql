-- Migration: 20260703000000_group_hub_corrective_rpcs
-- Objetivo: Garantir atomicidade na aprovação de inscrições, isolamento de privacidade da rooming list para o portal do cliente, e persistência estática de recibos.

-- 1. Adicionar group_tour_id na tabela de propostas para ligação estruturada com Proposal Studio
ALTER TABLE public.proposals
  ADD COLUMN IF NOT EXISTS group_tour_id UUID REFERENCES public.group_tours(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS proposals_group_tour_idx 
  ON public.proposals(group_tour_id);

-- 2. Tabela de Snapshots de Recibos
CREATE TABLE IF NOT EXISTS public.payment_receipt_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  enrollment_id UUID REFERENCES public.group_tour_enrollments(id) ON DELETE SET NULL,
  receipt_id TEXT NOT NULL UNIQUE,
  payer_name TEXT NOT NULL,
  payer_cpf TEXT,
  amount NUMERIC(12,2) NOT NULL,
  payment_method TEXT,
  payment_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  trip_title TEXT NOT NULL,
  seat_number TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Habilitar RLS nos snapshots de recibos
ALTER TABLE public.payment_receipt_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agents read snapshots" ON public.payment_receipt_snapshots
  FOR SELECT TO authenticated
  USING (public.is_agency_member(auth.uid(), agency_id));

CREATE POLICY "agents insert snapshots" ON public.payment_receipt_snapshots
  FOR INSERT TO authenticated
  WITH CHECK (public.is_agency_member(auth.uid(), agency_id));

CREATE POLICY "clients read own snapshots" ON public.payment_receipt_snapshots
  FOR SELECT TO authenticated
  USING (
    enrollment_id IN (
      SELECT id FROM public.group_tour_enrollments
      WHERE client_id IN (
        SELECT id FROM public.clients
        WHERE user_id = auth.uid()
      )
    )
  );

-- 3. RPC: Aprovação Atômica de Inscrição com Transação e Locks de Concorrência
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

  -- 7. Inserir Lançamento de Caixa
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

-- 4. RPC: Consulta Segura de Alocação de Quarto no Portal (Evitar vazamento de dados de terceiros)
CREATE OR REPLACE FUNCTION public.get_my_room_allocation(
  _trip_id UUID
)
RETURNS TABLE (
  id UUID,
  room_number TEXT,
  room_type TEXT,
  hotel_name TEXT,
  checkin_date DATE,
  checkout_date DATE,
  notes TEXT,
  is_confirmed BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _trip_rec RECORD;
  _client_user_id UUID;
  _enrollment_id UUID;
BEGIN
  -- 1. Obter a viagem e validar privilégio de posse
  SELECT * INTO _trip_rec FROM public.trips WHERE id = _trip_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Buscar a associação user_id do cliente
  SELECT user_id INTO _client_user_id FROM public.clients WHERE id = _trip_rec.client_id;
  
  -- Verificar se é o proprietário da viagem ou membro da agência
  IF _client_user_id <> auth.uid() AND NOT public.is_agency_member(auth.uid(), _trip_rec.agency_id) THEN
    RAISE EXCEPTION 'Acesso não autorizado.';
  END IF;

  -- 2. Localizar a inscrição deste cliente nesta excursão
  SELECT id INTO _enrollment_id 
    FROM public.group_tour_enrollments
   WHERE group_tour_id = _trip_rec.group_tour_id
     AND client_id = _trip_rec.client_id
   LIMIT 1;

  IF _enrollment_id IS NULL THEN
    RETURN;
  END IF;

  -- 3. Retornar apenas a linha do quarto onde o passageiro correspondente está alocado
  RETURN QUERY
  SELECT r.id, r.room_number, r.room_type, r.hotel_name, r.checkin_date, r.checkout_date, r.notes, r.is_confirmed
    FROM public.boarding_rooming_list r
   WHERE r.group_tour_id = _trip_rec.group_tour_id
     AND EXISTS (
       SELECT 1 
         FROM jsonb_array_elements(r.passengers) AS p
        WHERE p->>'passenger_id' = _enrollment_id::text
     )
   LIMIT 1;
END;
$$;

-- Grants das novas RPCs para usuários autenticados
GRANT EXECUTE ON FUNCTION public.approve_group_enrollment(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_room_allocation(UUID) TO authenticated;
