-- Migration: 20260615000004_omnichannel_sessions_channel_contact_id.sql
-- Descrição: Adiciona colunas faltantes channel e contact_id para a tabela omnichannel_sessions

ALTER TABLE public.omnichannel_sessions
  ADD COLUMN IF NOT EXISTS channel text NOT NULL DEFAULT 'whatsapp',
  ADD COLUMN IF NOT EXISTS contact_id text;

COMMENT ON COLUMN public.omnichannel_sessions.channel IS 'Canal de comunicação da sessão: whatsapp, instagram, email';
COMMENT ON COLUMN public.omnichannel_sessions.contact_id IS 'Identificador do contato externo (ex: número do telefone ou username)';
