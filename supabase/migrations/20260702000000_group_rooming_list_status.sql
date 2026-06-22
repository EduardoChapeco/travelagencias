-- Migration: 20260702000000_group_rooming_list_status
-- Objetivo: Adicionar campos de controle e status da Rooming List para as Excursões em Grupo

ALTER TABLE public.group_tours
  ADD COLUMN IF NOT EXISTS rooming_list_status TEXT DEFAULT 'open' CHECK (rooming_list_status IN ('open', 'closed')),
  ADD COLUMN IF NOT EXISTS rooming_list_sent_hotel BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS rooming_list_sent_bus BOOLEAN DEFAULT false;

-- Comentários explicativos
COMMENT ON COLUMN public.group_tours.rooming_list_status IS 'Status da rooming list do grupo (open ou closed)';
COMMENT ON COLUMN public.group_tours.rooming_list_sent_hotel IS 'Indica se a rooming list foi enviada para o hotel';
COMMENT ON COLUMN public.group_tours.rooming_list_sent_bus IS 'Indica se a rooming list foi enviada para a empresa de ônibus';
