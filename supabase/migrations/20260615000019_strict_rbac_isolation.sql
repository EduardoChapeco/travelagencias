-- =========================================================================
-- Turis 3.0 — Strict RBAC Isolation (Agents vs Gestores)
-- =========================================================================

-- ─── 1. LEADS ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "agency members read leads" ON public.leads;
DROP POLICY IF EXISTS "agency members update leads" ON public.leads;

CREATE POLICY "agency members read leads" ON public.leads
  FOR SELECT TO authenticated
  USING (
    public.is_agency_member(auth.uid(), agency_id) AND (
      owner_id = auth.uid() OR
      owner_id IS NULL OR -- "sem dono vistos por todos"
      public.has_role(auth.uid(), 'agency_admin', agency_id)
    )
  );

CREATE POLICY "agency members update leads" ON public.leads
  FOR UPDATE TO authenticated
  USING (
    public.is_agency_member(auth.uid(), agency_id) AND (
      owner_id = auth.uid() OR
      owner_id IS NULL OR
      public.has_role(auth.uid(), 'agency_admin', agency_id)
    )
  );

-- ─── 2. TRIPS ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "agency members read trips" ON public.trips;
DROP POLICY IF EXISTS "agency members update trips" ON public.trips;

CREATE POLICY "agency members read trips" ON public.trips
  FOR SELECT TO authenticated
  USING (
    public.is_agency_member(auth.uid(), agency_id) AND (
      owner_id = auth.uid() OR
      owner_id IS NULL OR -- viagens sem dono visíveis na esteira comum
      public.has_role(auth.uid(), 'agency_admin', agency_id)
    )
  );

CREATE POLICY "agency members update trips" ON public.trips
  FOR UPDATE TO authenticated
  USING (
    public.is_agency_member(auth.uid(), agency_id) AND (
      owner_id = auth.uid() OR
      owner_id IS NULL OR
      public.has_role(auth.uid(), 'agency_admin', agency_id)
    )
  );

-- ─── 3. SUPPORT TICKETS ──────────────────────────────────────────────────
-- O nome original da policy no MVP foi "tk read" e "tk update"
DROP POLICY IF EXISTS "tk read" ON public.support_tickets;
DROP POLICY IF EXISTS "tk update" ON public.support_tickets;

CREATE POLICY "tk read" ON public.support_tickets
  FOR SELECT TO authenticated
  USING (
    public.is_agency_member(auth.uid(), agency_id) AND (
      assignee_id = auth.uid() OR
      assignee_id IS NULL OR -- Tickets novos na piscina comum vistos por todos até alguém puxar
      public.has_role(auth.uid(), 'agency_admin', agency_id)
    )
  );

CREATE POLICY "tk update" ON public.support_tickets
  FOR UPDATE TO authenticated
  USING (
    public.is_agency_member(auth.uid(), agency_id) AND (
      assignee_id = auth.uid() OR
      assignee_id IS NULL OR
      public.has_role(auth.uid(), 'agency_admin', agency_id)
    )
  );

-- ─── 4. AGENT TASKS (MEU DIA) ────────────────────────────────────────────
-- O nome original da policy foi "agent_tasks_select" e "agent_tasks_update"
DROP POLICY IF EXISTS "agent_tasks_select" ON public.agent_tasks;
DROP POLICY IF EXISTS "agent_tasks_update" ON public.agent_tasks;

CREATE POLICY "agent_tasks_select" ON public.agent_tasks
  FOR SELECT TO authenticated
  USING (
    public.is_agency_member(auth.uid(), agency_id) AND (
      agent_id = auth.uid() OR
      public.has_role(auth.uid(), 'agency_admin', agency_id)
    )
  );

CREATE POLICY "agent_tasks_update" ON public.agent_tasks
  FOR UPDATE TO authenticated
  USING (
    public.is_agency_member(auth.uid(), agency_id) AND (
      agent_id = auth.uid() OR
      public.has_role(auth.uid(), 'agency_admin', agency_id)
    )
  );
