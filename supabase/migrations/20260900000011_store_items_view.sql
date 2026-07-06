-- ==============================================================================================
-- FASE 3: TRAVELOS V2 - STORE ITEMS VIEW
-- ==============================================================================================

-- Drop the view if it exists
DROP VIEW IF EXISTS public.public_store_items;

-- 1. Create a desnormalized view that unions both group_tours and proposals
-- Only shows items where visible_in_store is true.
CREATE VIEW public.public_store_items AS
SELECT
    gt.id AS item_id,
    'group_tour' AS item_type,
    gt.agency_id,
    gt.title AS title,
    gt.description,
    gt.store_cover AS image_url,
    gt.store_price AS price,
    gt.status::TEXT AS status,
    gt.created_at
FROM public.group_tours gt
WHERE gt.visible_in_store = true AND gt.status = 'active'

UNION ALL

SELECT
    p.id AS item_id,
    'proposal' AS item_type,
    p.agency_id,
    p.title AS title,
    NULL::text AS description,
    p.store_cover AS image_url,
    p.store_price AS price,
    p.status::TEXT AS status,
    p.created_at
FROM public.proposals p
WHERE p.visible_in_store = true AND p.status = 'accepted';

-- Habilitar RLS não é diretamente aplicável em VIEWS normais no PostgreSQL, 
-- mas a view herda as políticas de acesso das tabelas base (group_tours, proposals).
-- Grant select to anon role for public store view
GRANT SELECT ON public.public_store_items TO anon, authenticated, service_role;
