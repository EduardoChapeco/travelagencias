-- Migration: 20260615000007_db_schema_reconcile
-- Reconcliação do schema do banco de dados (constraints de suporte e view de membros)

-- 1. Adicionar constraints de chave estrangeira à tabela support_tickets
ALTER TABLE public.support_tickets
  DROP CONSTRAINT IF EXISTS fk_support_tickets_client,
  DROP CONSTRAINT IF EXISTS fk_support_tickets_trip,
  DROP CONSTRAINT IF EXISTS fk_support_tickets_assignee;

ALTER TABLE public.support_tickets
  ADD CONSTRAINT fk_support_tickets_client FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_support_tickets_trip FOREIGN KEY (trip_id) REFERENCES public.trips(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_support_tickets_assignee FOREIGN KEY (assignee_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Criar a view public.agency_members baseada em user_roles
CREATE OR REPLACE VIEW public.agency_members AS
SELECT 
  id,
  user_id,
  agency_id,
  role,
  created_at
FROM public.user_roles;

GRANT SELECT ON public.agency_members TO authenticated;
GRANT SELECT ON public.agency_members TO service_role;
