-- Imutabilidade do Rastro Financeiro: Trigger para auditoria de mudança de valor em trips
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID REFERENCES public.agencies(id),
    actor_id UUID,
    action VARCHAR(255) NOT NULL,
    entity VARCHAR(255) NOT NULL,
    entity_id UUID NOT NULL,
    old_data JSONB,
    new_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE OR REPLACE FUNCTION public.log_financial_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- Verifica se o preço ou total de venda mudou
    IF (OLD.total_sale IS DISTINCT FROM NEW.total_sale) OR 
       (OLD.total_cost IS DISTINCT FROM NEW.total_cost) OR
       (OLD.currency IS DISTINCT FROM NEW.currency) THEN
       
        INSERT INTO public.audit_logs (
            agency_id,
            actor_id,
            action,
            entity,
            entity_id,
            old_data,
            new_data
        ) VALUES (
            NEW.agency_id,
            auth.uid(),
            'financial_update',
            'trips',
            NEW.id,
            jsonb_build_object(
                'total_sale', OLD.total_sale,
                'total_cost', OLD.total_cost,
                'currency', OLD.currency
            ),
            jsonb_build_object(
                'total_sale', NEW.total_sale,
                'total_cost', NEW.total_cost,
                'currency', NEW.currency
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_audit_trip_financials ON public.trips;

CREATE TRIGGER trg_audit_trip_financials
AFTER UPDATE ON public.trips
FOR EACH ROW
EXECUTE FUNCTION public.log_financial_changes();
