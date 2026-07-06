-- Migration: 20260615000004_agent_tasks_and_productivity
-- Criação da arquitetura de Produtividade e Tarefas do Dia (Kanban)

CREATE TABLE IF NOT EXISTS public.agent_tasks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    agent_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    title text NOT NULL,
    description text,
    status text NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'waiting', 'done')),
    type text NOT NULL DEFAULT 'manual' CHECK (type IN ('lead', 'trip', 'ticket', 'manual')),
    reference_id uuid, -- Pode apontar para trips.id, leads.id, support_tickets.id
    difficulty_score integer NOT NULL DEFAULT 1 CHECK (difficulty_score >= 1 AND difficulty_score <= 10),
    due_date date NOT NULL DEFAULT CURRENT_DATE,
    resolved_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS Policies
ALTER TABLE public.agent_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agent tasks read" ON public.agent_tasks
    FOR SELECT TO authenticated
    USING (public.is_agency_member(auth.uid(), agency_id));

CREATE POLICY "Agent tasks insert" ON public.agent_tasks
    FOR INSERT TO authenticated
    WITH CHECK (public.is_agency_member(auth.uid(), agency_id));

CREATE POLICY "Agent tasks update" ON public.agent_tasks
    FOR UPDATE TO authenticated
    USING (public.is_agency_member(auth.uid(), agency_id));

CREATE POLICY "Agent tasks delete" ON public.agent_tasks
    FOR DELETE TO authenticated
    USING (public.is_agency_member(auth.uid(), agency_id));

-- Trigger for updated_at
CREATE TRIGGER set_agent_tasks_updated_at
    BEFORE UPDATE ON public.agent_tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- Quando um task é movido para done, seta o resolved_at
CREATE OR REPLACE FUNCTION public.set_task_resolved_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'done' AND OLD.status != 'done' THEN
    NEW.resolved_at = now();
  ELSIF NEW.status != 'done' THEN
    NEW.resolved_at = NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_agent_tasks_resolved
    BEFORE UPDATE ON public.agent_tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.set_task_resolved_at();

-- Webhook trigger for AI Task Evaluator
CREATE OR REPLACE FUNCTION public.trigger_ai_task_evaluator()
RETURNS trigger AS $$
BEGIN
  -- We rely on pg_net or Supabase webhooks natively, but since we can't easily mock net.http_post here without knowing the anon key,
  -- we will assume the Supabase Dashboard Webhooks feature is used or we can use pg_net if enabled.
  -- For now, this is a placeholder or we can just call it from the frontend when a task is created.
  -- Actually, the best practice in Turis has been to call the edge function from the frontend when manually creating a task.
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

