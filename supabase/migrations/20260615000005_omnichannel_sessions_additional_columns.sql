-- Migration: 20260615000005_omnichannel_sessions_additional_columns.sql
-- Descrição: Adiciona colunas faltantes de UI/state na tabela omnichannel_sessions

ALTER TABLE public.omnichannel_sessions
  ADD COLUMN IF NOT EXISTS contact_name text,
  ADD COLUMN IF NOT EXISTS contact_avatar_url text,
  ADD COLUMN IF NOT EXISTS unread_count integer DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS last_message_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_message_preview text,
  ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}'::text[] NOT NULL;

COMMENT ON COLUMN public.omnichannel_sessions.contact_name IS 'Nome do contato vindo da rede social/provedor';
COMMENT ON COLUMN public.omnichannel_sessions.contact_avatar_url IS 'URL da foto do contato';
COMMENT ON COLUMN public.omnichannel_sessions.unread_count IS 'Número de mensagens não lidas';
COMMENT ON COLUMN public.omnichannel_sessions.last_message_at IS 'Data/hora da última mensagem para ordenação';
COMMENT ON COLUMN public.omnichannel_sessions.last_message_preview IS 'Preview da última mensagem enviada ou recebida';
COMMENT ON COLUMN public.omnichannel_sessions.assigned_to IS 'Agente responsável pelo atendimento';
COMMENT ON COLUMN public.omnichannel_sessions.tags IS 'Tags de organização do chat';
