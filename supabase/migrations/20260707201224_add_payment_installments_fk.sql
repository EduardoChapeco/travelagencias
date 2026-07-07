-- Add missing foreign key for payment_plan_id
ALTER TABLE public.payment_installments
ADD CONSTRAINT payment_installments_payment_plan_id_fkey 
FOREIGN KEY (payment_plan_id) REFERENCES public.payment_plans(id) ON DELETE CASCADE;

-- Add missing foreign key for agency_id
ALTER TABLE public.payment_installments
ADD CONSTRAINT payment_installments_agency_id_fkey 
FOREIGN KEY (agency_id) REFERENCES public.agencies(id) ON DELETE CASCADE;
