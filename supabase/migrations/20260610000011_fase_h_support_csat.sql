-- Fase H.4: Adicionando CSAT ao Ticket de Suporte

ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS csat_score int CHECK (csat_score >= 1 AND csat_score <= 5);
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS csat_comment text;
