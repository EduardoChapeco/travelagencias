-- Migration: 20260612000008_meta_integrations.sql
-- Descrição: Tabelas para suporte Omnichannel, Tracking de Anúncios e IA Hunter

-- 1. Tracking Fields on Leads
ALTER TABLE leads 
  ADD COLUMN IF NOT EXISTS click_id text,
  ADD COLUMN IF NOT EXISTS utm_source text,
  ADD COLUMN IF NOT EXISTS utm_medium text,
  ADD COLUMN IF NOT EXISTS utm_campaign text,
  ADD COLUMN IF NOT EXISTS utm_term text;

-- 2. Integrations Config on Agencies
ALTER TABLE agencies 
  ADD COLUMN IF NOT EXISTS integrations_config jsonb DEFAULT '{}'::jsonb;

-- 3. Omnichannel Sessions (Conexões do WhatsApp Web interno/Evolution API)
CREATE TABLE IF NOT EXISTS omnichannel_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid REFERENCES agencies(id) ON DELETE CASCADE,
  session_name text NOT NULL,
  provider text NOT NULL DEFAULT 'evolution_api', -- evolution_api, wwebjs, meta_official
  status text NOT NULL DEFAULT 'disconnected', -- disconnected, qrcode, connected
  qr_code text,
  phone_number text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Habilitar RLS e Policies para omnichannel_sessions
ALTER TABLE omnichannel_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage sessions of their agency" ON omnichannel_sessions
  FOR ALL USING (is_agency_member(auth.uid(), agency_id));

-- 4. Omnichannel Messages (Caixa de Entrada Unificada)
CREATE TABLE IF NOT EXISTS omnichannel_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid REFERENCES agencies(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE,
  session_id uuid REFERENCES omnichannel_sessions(id) ON DELETE SET NULL,
  
  channel text NOT NULL DEFAULT 'whatsapp', -- whatsapp, instagram, messenger
  direction text NOT NULL, -- inbound (cliente -> agencia), outbound (agencia -> cliente)
  
  content text,
  media_url text,
  media_type text, -- image, audio, document, video
  
  status text NOT NULL DEFAULT 'sent', -- pending, sent, delivered, read, failed
  external_message_id text, -- ID da mensagem na provedora para tracking
  
  sender_id uuid REFERENCES auth.users(id) ON DELETE SET NULL, -- Se outbound, quem enviou
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Habilitar RLS e Policies para omnichannel_messages
ALTER TABLE omnichannel_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read/write messages of their agency" ON omnichannel_messages
  FOR ALL USING (is_agency_member(auth.uid(), agency_id));

-- 5. AI Hunter Insights (Base de Conhecimento do Lead)
CREATE TABLE IF NOT EXISTS lead_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE,
  agency_id uuid REFERENCES agencies(id) ON DELETE CASCADE,
  
  fears jsonb DEFAULT '[]'::jsonb, -- Array of strings (medos, receios ocultos)
  desires jsonb DEFAULT '[]'::jsonb, -- Array of strings (sonhos, anseios)
  objections jsonb DEFAULT '[]'::jsonb, -- Array of strings (objeções comerciais)
  budget_signals jsonb DEFAULT '[]'::jsonb, -- Array of strings (capacidade financeira)
  
  general_profile text, -- Perfil psicológico gerado pela IA
  next_best_action text, -- Sugestão do Hunter para o vendedor
  
  last_analyzed_message_id uuid REFERENCES omnichannel_messages(id) ON DELETE SET NULL,
  
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Habilitar RLS e Policies para lead_insights
ALTER TABLE lead_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read insights of their agency" ON lead_insights
  FOR SELECT USING (is_agency_member(auth.uid(), agency_id));
CREATE POLICY "System can manage insights" ON lead_insights
  FOR ALL USING (is_agency_member(auth.uid(), agency_id));

-- Trigger para atualizar timestamps
CREATE TRIGGER update_omnichannel_sessions_updated_at BEFORE UPDATE ON omnichannel_sessions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER update_omnichannel_messages_updated_at BEFORE UPDATE ON omnichannel_messages FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER update_lead_insights_updated_at BEFORE UPDATE ON lead_insights FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 6. Atualizar a RPC de captura pública para salvar rastreamentos (fbclid, utm)
DROP FUNCTION IF EXISTS public.public_save_lead(uuid, jsonb);
CREATE OR REPLACE FUNCTION public.public_save_lead(_lead_id uuid, _payload jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.leads
  SET
    name = COALESCE((_payload->>'name'), name),
    email = COALESCE((_payload->>'email'), email),
    phone = COALESCE((_payload->>'phone'), phone),
    destination = COALESCE((_payload->>'destination'), destination),
    travel_start = CASE WHEN (_payload->>'travel_start') IS NOT NULL AND (_payload->>'travel_start') <> '' THEN (_payload->>'travel_start')::date ELSE travel_start END,
    travel_end = CASE WHEN (_payload->>'travel_end') IS NOT NULL AND (_payload->>'travel_end') <> '' THEN (_payload->>'travel_end')::date ELSE travel_end END,
    pax_adults = COALESCE((_payload->>'pax_adults')::integer, pax_adults),
    pax_children = COALESCE((_payload->>'pax_children')::integer, pax_children),
    pax_infants = COALESCE((_payload->>'pax_infants')::integer, pax_infants),
    pax_ages = COALESCE((_payload->'pax_ages'), pax_ages),
    pax_list = COALESCE((_payload->'pax_list'), pax_list),
    interest_type = COALESCE((_payload->>'interest_type'), interest_type),
    notes = COALESCE((_payload->>'notes'), notes),
    lgpd_accepted = COALESCE((_payload->>'lgpd_accepted')::boolean, lgpd_accepted),
    lgpd_accepted_at = CASE WHEN (_payload->>'lgpd_accepted')::boolean = true THEN now() ELSE lgpd_accepted_at END,
    pcd = COALESCE((_payload->>'pcd')::boolean, pcd),
    reduced_mobility = COALESCE((_payload->>'reduced_mobility')::boolean, reduced_mobility),
    autism = COALESCE((_payload->>'autism')::boolean, autism),
    health_notes = COALESCE((_payload->>'health_notes'), health_notes),
    click_id = COALESCE((_payload->>'click_id'), click_id),
    utm_source = COALESCE((_payload->>'utm_source'), utm_source),
    utm_medium = COALESCE((_payload->>'utm_medium'), utm_medium),
    utm_campaign = COALESCE((_payload->>'utm_campaign'), utm_campaign),
    utm_term = COALESCE((_payload->>'utm_term'), utm_term),
    updated_at = now()
  WHERE id = _lead_id;

  INSERT INTO public.lead_activities (lead_id, agency_id, type, content)
  SELECT l.id, l.agency_id, 'note', 'Lead atualizou suas preferências e viajantes acompanhantes via formulário público (Tracking atualizado).'
  FROM public.leads l WHERE l.id = _lead_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.public_save_lead(uuid, jsonb) TO anon, authenticated;
