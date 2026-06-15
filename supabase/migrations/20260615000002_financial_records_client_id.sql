ALTER TABLE public.financial_records
ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS fin_client_idx ON public.financial_records(client_id);
