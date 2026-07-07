-- Add missing foreign key for trips
ALTER TABLE public.payment_plans
ADD CONSTRAINT payment_plans_trip_id_fkey 
FOREIGN KEY (trip_id) REFERENCES public.trips(id) ON DELETE CASCADE;

-- Add missing foreign key for agency
ALTER TABLE public.payment_plans
ADD CONSTRAINT payment_plans_agency_id_fkey 
FOREIGN KEY (agency_id) REFERENCES public.agencies(id) ON DELETE CASCADE;

-- Add missing foreign key for client (auth.users)
ALTER TABLE public.payment_plans
ADD CONSTRAINT payment_plans_client_id_fkey 
FOREIGN KEY (client_id) REFERENCES auth.users(id) ON DELETE SET NULL;
