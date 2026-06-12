-- Migration: 20260609000014_admin_billing_rpc.sql
-- Propósito: Substituir a agregação feita no navegador (com hard limit perigoso) 
--            por agregação no lado do servidor (PostgreSQL).

CREATE OR REPLACE FUNCTION public.admin_calculate_billing_summary()
RETURNS TABLE (
    agency_id uuid,
    agency_name text,
    income numeric,
    expense numeric,
    pending numeric,
    net numeric
)
LANGUAGE plpgsql
SECURITY DEFINER -- Necessário para burlar o RLS e ler as finanças de todas as agências, mas protegido pela validação de super_admin abaixo
AS $$
DECLARE
    v_is_super_admin boolean;
BEGIN
    -- 1. Verificar se o usuário logado é super_admin
    SELECT (role = 'super_admin') INTO v_is_super_admin
    FROM public.user_roles
    WHERE user_id = auth.uid()
    LIMIT 1;

    IF NOT v_is_super_admin THEN
        RAISE EXCEPTION 'Acesso negado. Apenas super_admin pode visualizar o faturamento global.';
    END IF;

    -- 2. Agregação no banco de dados
    RETURN QUERY
    SELECT 
        a.id AS agency_id,
        a.name AS agency_name,
        COALESCE(SUM(fr.amount) FILTER (WHERE fr.type = 'income' AND fr.status = 'paid'), 0) AS income,
        COALESCE(SUM(fr.amount) FILTER (WHERE fr.type = 'expense' AND fr.status = 'paid'), 0) AS expense,
        COALESCE(SUM(fr.amount) FILTER (WHERE fr.status = 'pending'), 0) AS pending,
        COALESCE(SUM(fr.amount) FILTER (WHERE fr.type = 'income' AND fr.status = 'paid'), 0) - COALESCE(SUM(fr.amount) FILTER (WHERE fr.type = 'expense' AND fr.status = 'paid'), 0) AS net
    FROM public.agencies a
    LEFT JOIN public.financial_records fr ON fr.agency_id = a.id AND fr.deleted_at IS NULL
    GROUP BY a.id, a.name
    ORDER BY income DESC;
END;
$$;
