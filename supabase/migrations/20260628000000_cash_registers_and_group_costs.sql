-- ============================================================
-- Migration: Cash Register System + Group Tour Costs
-- Eliminates mock data from agency.$slug.financial.cash.tsx
-- and agency.$slug.group-tours.$id.tsx
-- ============================================================

-- ─── 1. Cash Registers ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cash_registers (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id   uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  name        text NOT NULL,
  type        text NOT NULL CHECK (type IN ('physical', 'bank_account')),
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cash_registers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agency_cash_registers" ON public.cash_registers
  FOR ALL USING (
    agency_id IN (
      SELECT agency_id FROM public.user_roles WHERE user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_cash_registers_agency ON public.cash_registers(agency_id);

-- ─── 2. Cash Sessions (Abertura/Fechamento de Caixa) ─────────
CREATE TABLE IF NOT EXISTS public.cash_sessions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cash_register_id uuid NOT NULL REFERENCES public.cash_registers(id) ON DELETE CASCADE,
  agency_id        uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  opened_by        uuid REFERENCES public.profiles(id),
  closed_by        uuid REFERENCES public.profiles(id),
  opened_at        timestamptz NOT NULL DEFAULT now(),
  closed_at        timestamptz,
  opening_balance  numeric(14,2) NOT NULL DEFAULT 0,
  closing_balance  numeric(14,2),
  reported_balance numeric(14,2),
  status           text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  notes            text
);

ALTER TABLE public.cash_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agency_cash_sessions" ON public.cash_sessions
  FOR ALL USING (
    agency_id IN (
      SELECT agency_id FROM public.user_roles WHERE user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_cash_sessions_register ON public.cash_sessions(cash_register_id);
CREATE INDEX IF NOT EXISTS idx_cash_sessions_agency ON public.cash_sessions(agency_id);
CREATE INDEX IF NOT EXISTS idx_cash_sessions_status ON public.cash_sessions(status);

-- ─── 3. Cash Transactions ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cash_transactions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cash_session_id  uuid REFERENCES public.cash_sessions(id) ON DELETE SET NULL,
  cash_register_id uuid NOT NULL REFERENCES public.cash_registers(id) ON DELETE CASCADE,
  agency_id        uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  amount           numeric(14,2) NOT NULL,
  type             text NOT NULL CHECK (type IN ('payment', 'receipt', 'withdrawal', 'deposit', 'vale')),
  payment_method   text NOT NULL DEFAULT 'cash',
  transaction_date timestamptz NOT NULL DEFAULT now(),
  notes            text,
  category         text,
  receipt_url      text,
  employee_id      uuid REFERENCES public.profiles(id),
  operator_id      uuid REFERENCES public.suppliers(id),
  created_by       uuid REFERENCES public.profiles(id),
  created_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cash_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agency_cash_transactions" ON public.cash_transactions
  FOR ALL USING (
    agency_id IN (
      SELECT agency_id FROM public.user_roles WHERE user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_cash_transactions_session  ON public.cash_transactions(cash_session_id);
CREATE INDEX IF NOT EXISTS idx_cash_transactions_register ON public.cash_transactions(cash_register_id);
CREATE INDEX IF NOT EXISTS idx_cash_transactions_agency   ON public.cash_transactions(agency_id);
CREATE INDEX IF NOT EXISTS idx_cash_transactions_date     ON public.cash_transactions(transaction_date DESC);

-- ─── 4. Group Tour Costs (replaces mockCosts state) ──────────
CREATE TABLE IF NOT EXISTS public.group_tour_costs (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_tour_id     uuid NOT NULL REFERENCES public.group_tours(id) ON DELETE CASCADE,
  agency_id         uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  description       text NOT NULL,
  amount            numeric(14,2) NOT NULL DEFAULT 0,
  type              text NOT NULL DEFAULT 'fixed' CHECK (type IN ('fixed', 'variable')),
  allocated_per_pax boolean NOT NULL DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.group_tour_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agency_group_tour_costs" ON public.group_tour_costs
  FOR ALL USING (
    agency_id IN (
      SELECT agency_id FROM public.user_roles WHERE user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_group_tour_costs_tour   ON public.group_tour_costs(group_tour_id);
CREATE INDEX IF NOT EXISTS idx_group_tour_costs_agency ON public.group_tour_costs(agency_id);

-- ─── 5. Add missing columns to group_tours ───────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'group_tours' AND column_name = 'target_poupanca_balance'
  ) THEN
    ALTER TABLE public.group_tours ADD COLUMN target_poupanca_balance numeric(14,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'group_tours' AND column_name = 'ads_budget'
  ) THEN
    ALTER TABLE public.group_tours ADD COLUMN ads_budget numeric(14,2) DEFAULT 0;
  END IF;
END $$;

-- ─── 6. Add missing columns to notifications ─────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'read_at'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN read_at timestamptz;
  END IF;
END $$;

-- ─── 7. Add missing columns to trip_memories ─────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'trip_memories') THEN
    CREATE TABLE public.trip_memories (
      id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      trip_id    uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
      image_url  text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    ALTER TABLE public.trip_memories ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "trip_memories_agency" ON public.trip_memories
      FOR ALL USING (
        trip_id IN (
          SELECT t.id FROM public.trips t
          JOIN public.user_roles au ON au.agency_id = t.agency_id
          WHERE au.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- ─── 8. Knowledge Playbooks (removes mock fallback) ──────────
CREATE TABLE IF NOT EXISTS public.knowledge_playbooks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id   uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  title       text NOT NULL,
  description text,
  category    text DEFAULT 'Geral',
  created_at  timestamptz NOT NULL DEFAULT now(),
  created_by  uuid REFERENCES public.profiles(id)
);

ALTER TABLE public.knowledge_playbooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agency_knowledge_playbooks" ON public.knowledge_playbooks
  FOR ALL USING (
    agency_id IN (
      SELECT agency_id FROM public.user_roles WHERE user_id = auth.uid()
    )
  );

CREATE TABLE IF NOT EXISTS public.knowledge_playbook_steps (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  playbook_id uuid NOT NULL REFERENCES public.knowledge_playbooks(id) ON DELETE CASCADE,
  step_number int NOT NULL DEFAULT 1,
  title       text NOT NULL,
  description text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.knowledge_playbook_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agency_playbook_steps" ON public.knowledge_playbook_steps
  FOR ALL USING (
    playbook_id IN (
      SELECT kp.id FROM public.knowledge_playbooks kp
      JOIN public.user_roles au ON au.agency_id = kp.agency_id
      WHERE au.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_playbooks_agency   ON public.knowledge_playbooks(agency_id);
CREATE INDEX IF NOT EXISTS idx_playbook_steps_pb  ON public.knowledge_playbook_steps(playbook_id);

-- ─── 9. RPC: open_cash_session ───────────────────────────────
CREATE OR REPLACE FUNCTION public.open_cash_session(
  p_register_id    uuid,
  p_agency_id      uuid,
  p_opening_balance numeric,
  p_notes          text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session_id uuid;
BEGIN
  -- Close any existing open session for this register
  UPDATE public.cash_sessions
  SET status = 'closed', closed_at = now(), notes = COALESCE(notes, 'Auto-fechado ao abrir nova sessão')
  WHERE cash_register_id = p_register_id AND status = 'open';

  INSERT INTO public.cash_sessions (
    cash_register_id, agency_id, opened_by, opening_balance, notes, status
  ) VALUES (
    p_register_id, p_agency_id, auth.uid(), p_opening_balance, p_notes, 'open'
  )
  RETURNING id INTO v_session_id;

  RETURN v_session_id;
END;
$$;

-- ─── 10. RPC: close_cash_session ─────────────────────────────
CREATE OR REPLACE FUNCTION public.close_cash_session(
  p_session_id      uuid,
  p_reported_balance numeric,
  p_notes           text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_closing_balance numeric;
BEGIN
  SELECT opening_balance +
    COALESCE((
      SELECT SUM(CASE WHEN type IN ('receipt','deposit') THEN amount ELSE -amount END)
      FROM public.cash_transactions WHERE cash_session_id = p_session_id
    ), 0)
  INTO v_closing_balance
  FROM public.cash_sessions WHERE id = p_session_id;

  UPDATE public.cash_sessions SET
    status = 'closed',
    closed_at = now(),
    closed_by = auth.uid(),
    closing_balance = v_closing_balance,
    reported_balance = p_reported_balance,
    notes = COALESCE(p_notes, notes)
  WHERE id = p_session_id AND status = 'open';
END;
$$;

GRANT EXECUTE ON FUNCTION public.open_cash_session TO authenticated;
GRANT EXECUTE ON FUNCTION public.close_cash_session TO authenticated;
