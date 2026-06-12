-- =========================================================================================
-- SQL PARA FIXAR O BANCO DE DADOS EM PRODUÇÃO (LOVABLE)
-- Copie e cole todo este código na aba "SQL Editor" do seu Supabase em produção e clique em "Run".
-- =========================================================================================

-- 1. Resolve erro do CRM: "column leads.deleted_at does not exist"
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- 2. Resolve erro de Embarques: "column boarding_cards.departure_date does not exist"
ALTER TABLE public.boarding_cards 
ADD COLUMN IF NOT EXISTS departure_date TIMESTAMP WITH TIME ZONE;

-- 3. Resolve erro do CRM: "Could not find the table 'public.vw_admin_agents'"
CREATE OR REPLACE VIEW public.vw_admin_agents AS
SELECT 
  ur.id as role_id,
  ur.user_id,
  ur.role,
  ur.created_at,
  ur.agency_id,
  p.full_name as user_name,
  a.name as agency_name,
  a.slug as agency_slug
FROM public.user_roles ur
LEFT JOIN public.profiles p ON ur.user_id = p.id
LEFT JOIN public.agencies a ON ur.agency_id = a.id
WHERE ur.role IN ('agency_admin', 'agent');

GRANT SELECT ON public.vw_admin_agents TO authenticated;
GRANT SELECT ON public.vw_admin_agents TO service_role;

-- Obs: Todos os erros reportados nos prints são corrigidos por este script.
