-- Função RPC Pública (Security Definer) para exibir Parcelas ao Cliente via Token.
-- Elimina a necessidade de Mocks no Frontend e contorna as políticas de RLS das tabelas financeiras para clientes anônimos via Link.

CREATE OR REPLACE FUNCTION public_installments_by_token(_token text)
RETURNS TABLE (
    id uuid,
    amount numeric,
    due_date date,
    status text,
    payment_method text,
    external_link text,
    paid_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _trip_id uuid;
BEGIN
    -- 1. Tentamos achar de qual Trip (Viagem) é este Token. 
    -- A tabela de contratos costuma ter um invite_token ou serial_number atrelado a um trip_id.
    SELECT trip_id INTO _trip_id FROM contracts WHERE token = _token OR serial_number = _token LIMIT 1;
    
    -- Se não achou em contratos, talvez seja de um Passageiro individual (Fase D)
    IF _trip_id IS NULL THEN
       SELECT trip_id INTO _trip_id FROM passengers WHERE magic_token = _token LIMIT 1;
    END IF;

    -- Se for nulo ainda, a pessoa não tem acesso.
    IF _trip_id IS NULL THEN
        RETURN;
    END IF;

    -- 2. Retorna faturas baseadas no Trip ID.
    RETURN QUERY
    SELECT 
        fi.id,
        fi.amount,
        fi.due_date,
        fi.status,
        fi.payment_method,
        fi.external_link,
        fi.paid_at
    FROM financial_installments fi
    WHERE fi.trip_id = _trip_id OR fi.booking_id IN (
       SELECT gb.id FROM group_bookings gb WHERE gb.group_trip_id = _trip_id
    )
    ORDER BY fi.due_date ASC;

END;
$$;
