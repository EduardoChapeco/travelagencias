ALTER TABLE public.support_tickets
ADD COLUMN IF NOT EXISTS cancellation_penalty_pct numeric,
ADD COLUMN IF NOT EXISTS cancellation_penalty_value numeric,
ADD COLUMN IF NOT EXISTS cancellation_credit_remaining numeric,
ADD COLUMN IF NOT EXISTS cancellation_refund_method text;
