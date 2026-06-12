-- TravelOS — Financial & Internal Roles Isolation
-- Migration: 20260609000013_financial_isolation

-- =========================================================================
-- FUNÇÃO AUXILIAR DE AUTORIDADE INTERNA
-- =========================================================================
-- Verifica se o usuário tem poderes administrativos sobre a agência 
-- (seja Dono da Agência ou Super Admin da plataforma).

CREATE OR REPLACE FUNCTION public.can_manage_agency_finances(_agency_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND (
        ur.role = 'super_admin'
        OR (ur.agency_id = _agency_id AND ur.role = 'agency_admin')
      )
  );
$$;

-- =========================================================================
-- FASE 1: ISOLAMENTO FINANCEIRO RIGOROSO (financial_records & booking_installments)
-- =========================================================================

-- Destruindo RLS antigo e cego
DROP POLICY IF EXISTS "fin read" ON public.financial_records;
DROP POLICY IF EXISTS "fin insert" ON public.financial_records;
DROP POLICY IF EXISTS "fin update" ON public.financial_records;
DROP POLICY IF EXISTS "fin delete" ON public.financial_records;

-- LEITURA: Admins veem tudo do Caixa. Agentes veem apenas os records que criaram ou de viagens que venderam.
CREATE POLICY "fin strict read" ON public.financial_records FOR SELECT TO authenticated
  USING (
    public.can_manage_agency_finances(agency_id) OR
    (
      public.is_agency_member(auth.uid(), agency_id) AND (
        created_by = auth.uid() OR 
        trip_id IN (SELECT id FROM public.trips WHERE owner_id = auth.uid())
      )
    )
  );

-- INSERÇÃO: Agente só insere se estiver atrelando à sua viagem, ou inserindo "loose" pra si próprio.
CREATE POLICY "fin strict insert" ON public.financial_records FOR INSERT TO authenticated
  WITH CHECK (
    public.can_manage_agency_finances(agency_id) OR
    (
      public.is_agency_member(auth.uid(), agency_id) AND (
        (trip_id IS NULL AND created_by = auth.uid()) OR 
        (trip_id IN (SELECT id FROM public.trips WHERE owner_id = auth.uid()))
      )
    )
  );

-- EDIÇÃO: Agente só atualiza o que é dele ou da viagem dele.
CREATE POLICY "fin strict update" ON public.financial_records FOR UPDATE TO authenticated
  USING (
    public.can_manage_agency_finances(agency_id) OR
    (
      public.is_agency_member(auth.uid(), agency_id) AND (
        created_by = auth.uid() OR 
        trip_id IN (SELECT id FROM public.trips WHERE owner_id = auth.uid())
      )
    )
  );

-- EXCLUSÃO: Agente não pode apagar registros financeiros. Isso exige estorno e governança. 
-- Apenas Admins podem apagar.
CREATE POLICY "fin strict delete" ON public.financial_records FOR DELETE TO authenticated
  USING (public.can_manage_agency_finances(agency_id));


-- Aplicando as mesmas regras para booking_installments (que contêm links de pagamento de clientes)
DROP POLICY IF EXISTS "booking_installments read" ON public.booking_installments;
DROP POLICY IF EXISTS "booking_installments insert" ON public.booking_installments;
DROP POLICY IF EXISTS "booking_installments update" ON public.booking_installments;
DROP POLICY IF EXISTS "booking_installments delete" ON public.booking_installments;
DROP POLICY IF EXISTS "Super Admins access all installments" ON public.booking_installments;

CREATE POLICY "booking strict read" ON public.booking_installments FOR SELECT TO authenticated
  USING (
    public.can_manage_agency_finances((SELECT t.agency_id FROM public.trips t WHERE t.id = booking_installments.trip_id)) OR
    (
      public.is_agency_member(auth.uid(), (SELECT t.agency_id FROM public.trips t WHERE t.id = booking_installments.trip_id)) AND (
        trip_id IN (SELECT id FROM public.trips WHERE owner_id = auth.uid())
      )
    )
  );

CREATE POLICY "booking strict insert" ON public.booking_installments FOR INSERT TO authenticated
  WITH CHECK (
    public.can_manage_agency_finances((SELECT t.agency_id FROM public.trips t WHERE t.id = booking_installments.trip_id)) OR
    (
      public.is_agency_member(auth.uid(), (SELECT t.agency_id FROM public.trips t WHERE t.id = booking_installments.trip_id)) AND (
        trip_id IN (SELECT id FROM public.trips WHERE owner_id = auth.uid())
      )
    )
  );

CREATE POLICY "booking strict update" ON public.booking_installments FOR UPDATE TO authenticated
  USING (
    public.can_manage_agency_finances((SELECT t.agency_id FROM public.trips t WHERE t.id = booking_installments.trip_id)) OR
    (
      public.is_agency_member(auth.uid(), (SELECT t.agency_id FROM public.trips t WHERE t.id = booking_installments.trip_id)) AND (
        trip_id IN (SELECT id FROM public.trips WHERE owner_id = auth.uid())
      )
    )
  );

CREATE POLICY "booking strict delete" ON public.booking_installments FOR DELETE TO authenticated
  USING (public.can_manage_agency_finances((SELECT t.agency_id FROM public.trips t WHERE t.id = booking_installments.trip_id)));


-- =========================================================================
-- FASE 2: BLINDAGEM DE MARKUPS E CONFIGURAÇÕES DE JUROS
-- =========================================================================

-- payment_plans
DROP POLICY IF EXISTS "plans read" ON public.payment_plans;
DROP POLICY IF EXISTS "plans insert" ON public.payment_plans;
DROP POLICY IF EXISTS "plans update" ON public.payment_plans;
DROP POLICY IF EXISTS "plans delete" ON public.payment_plans;

CREATE POLICY "plans global read" ON public.payment_plans FOR SELECT TO authenticated
  USING (public.is_agency_member(auth.uid(), agency_id));

CREATE POLICY "plans admin write" ON public.payment_plans FOR ALL TO authenticated
  USING (public.can_manage_agency_finances(agency_id))
  WITH CHECK (public.can_manage_agency_finances(agency_id));


-- payment_installments
DROP POLICY IF EXISTS "installments read" ON public.payment_installments;
DROP POLICY IF EXISTS "installments insert" ON public.payment_installments;
DROP POLICY IF EXISTS "installments update" ON public.payment_installments;
DROP POLICY IF EXISTS "installments delete" ON public.payment_installments;

CREATE POLICY "installments global read" ON public.payment_installments FOR SELECT TO authenticated
  USING (
    public.is_agency_member(
      auth.uid(), 
      (SELECT agency_id FROM public.payment_plans WHERE id = payment_installments.payment_plan_id)
    )
  );

CREATE POLICY "installments admin write" ON public.payment_installments FOR ALL TO authenticated
  USING (
    public.can_manage_agency_finances(
      (SELECT agency_id FROM public.payment_plans WHERE id = payment_installments.payment_plan_id)
    )
  );


-- =========================================================================
-- FASE 3: ISOLAMENTO DE CONTRATOS
-- =========================================================================

DROP POLICY IF EXISTS "contracts read" ON public.contracts;
DROP POLICY IF EXISTS "contracts insert" ON public.contracts;
DROP POLICY IF EXISTS "contracts update" ON public.contracts;
DROP POLICY IF EXISTS "contracts delete" ON public.contracts;

-- Agente só lê contratos atrelados às viagens/propostas das quais ele é dono.
CREATE POLICY "contracts strict read" ON public.contracts FOR SELECT TO authenticated
  USING (
    public.can_manage_agency_finances(agency_id) OR
    (
      public.is_agency_member(auth.uid(), agency_id) AND (
        trip_id IN (
          SELECT id FROM public.trips 
          WHERE owner_id = auth.uid() OR 
                proposal_id IN (SELECT id FROM public.proposals WHERE owner_id = auth.uid())
        )
      )
    )
  );

CREATE POLICY "contracts strict insert" ON public.contracts FOR INSERT TO authenticated
  WITH CHECK (
    public.can_manage_agency_finances(agency_id) OR
    (
      public.is_agency_member(auth.uid(), agency_id) AND (
        trip_id IN (
          SELECT id FROM public.trips 
          WHERE owner_id = auth.uid() OR 
                proposal_id IN (SELECT id FROM public.proposals WHERE owner_id = auth.uid())
        )
      )
    )
  );

CREATE POLICY "contracts strict update" ON public.contracts FOR UPDATE TO authenticated
  USING (
    public.can_manage_agency_finances(agency_id) OR
    (
      public.is_agency_member(auth.uid(), agency_id) AND (
        trip_id IN (
          SELECT id FROM public.trips 
          WHERE owner_id = auth.uid() OR 
                proposal_id IN (SELECT id FROM public.proposals WHERE owner_id = auth.uid())
        )
      )
    )
  );

-- Deleção de contratos exige auditoria e poder gerencial.
CREATE POLICY "contracts strict delete" ON public.contracts FOR DELETE TO authenticated
  USING (public.can_manage_agency_finances(agency_id));

