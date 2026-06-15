-- Migration: 20260615000005_support_tickets_zendesk
-- Expande o modelo de Tickets para suportar Kanban de estágios, SLA estrito, responsáveis e Thread de E-mail

ALTER TABLE public.support_tickets
ADD COLUMN IF NOT EXISTS trip_id uuid REFERENCES public.trips(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS email_thread_id text,
ADD COLUMN IF NOT EXISTS assignee_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS stage text DEFAULT 'new' CHECK (stage IN ('new', 'open', 'pending_supplier', 'pending_client', 'resolved', 'closed'));

-- Índices de performance
CREATE INDEX IF NOT EXISTS idx_support_tickets_trip ON public.support_tickets(trip_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assignee ON public.support_tickets(assignee_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_stage ON public.support_tickets(stage);
