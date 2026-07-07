-- Fix wrong foreign key constraint on payment_plans.client_id
-- It was incorrectly pointing to auth.users(id) instead of public.clients(id)

ALTER TABLE public.payment_plans
DROP CONSTRAINT IF EXISTS payment_plans_client_id_fkey;

ALTER TABLE public.payment_plans
ADD CONSTRAINT payment_plans_client_id_fkey 
FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL;
