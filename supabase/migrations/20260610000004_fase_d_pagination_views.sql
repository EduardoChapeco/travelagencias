-- Fase D: Views para Server-Side Pagination e Filtros Nativos no Admin

-- 1. View de Agentes (user_roles + profiles + agencies)
-- Une as informações essenciais para a listagem performática de milhares de agentes.
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

-- 2. View de Auditoria (audit_log + profiles + agencies)
-- Abordagem Big Tech: mantém log imutável, mas une metadados ricos em tempo de leitura.
CREATE OR REPLACE VIEW public.vw_admin_audit AS
SELECT 
  al.id,
  al.agency_id,
  al.actor_id,
  al.actor_type,
  al.action,
  al.entity_type,
  al.entity_id,
  al.metadata,
  al.ip_address,
  al.created_at,
  a.name as agency_name,
  a.slug as agency_slug,
  p.full_name as actor_name
FROM public.audit_log al
LEFT JOIN public.agencies a ON al.agency_id = a.id
LEFT JOIN public.profiles p ON al.actor_id = p.id;

GRANT SELECT ON public.vw_admin_audit TO authenticated;
GRANT SELECT ON public.vw_admin_audit TO service_role;
