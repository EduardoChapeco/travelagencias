-- Imutabilidade JSONB: Validação estrita do schema do financial_data na tabela trips
CREATE OR REPLACE FUNCTION public.check_financial_data_schema() 
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.financial_data IS NOT NULL AND jsonb_typeof(NEW.financial_data) = 'object' THEN
    -- Validação de Price
    IF NEW.financial_data ? 'price' AND jsonb_typeof(NEW.financial_data->'price') != 'number' THEN
      RAISE EXCEPTION 'Constraint Violation: financial_data.price must be a numeric value.';
    END IF;
    
    -- Validação de Currency
    IF NEW.financial_data ? 'currency' AND jsonb_typeof(NEW.financial_data->'currency') != 'string' THEN
      RAISE EXCEPTION 'Constraint Violation: financial_data.currency must be a string.';
    END IF;
    
    -- Validação de Custos Totais
    IF NEW.financial_data ? 'total_cost' AND jsonb_typeof(NEW.financial_data->'total_cost') != 'number' THEN
      RAISE EXCEPTION 'Constraint Violation: financial_data.total_cost must be a numeric value.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validate_trips_financial_data ON public.trips;

CREATE TRIGGER validate_trips_financial_data
BEFORE INSERT OR UPDATE ON public.trips
FOR EACH ROW EXECUTE FUNCTION public.check_financial_data_schema();
