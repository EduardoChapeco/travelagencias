-- Migração Fase D: Carnês Digitais (Booking Installments)

CREATE TABLE IF NOT EXISTS public.booking_installments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  client_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  amount numeric(10, 2) NOT NULL,
  due_date date NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- pending, paid, overdue, cancelled
  payment_method text, -- pix, boleto, credit_card
  external_link text, -- link do gateway de pagamento ou PIX Copia e Cola
  paid_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.booking_installments ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
CREATE POLICY "Super Admins access all installments" ON public.booking_installments FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.global_role = 'super_admin')
);

CREATE POLICY "Agency users access their own trip installments" ON public.booking_installments FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.trips t
    WHERE t.id = booking_installments.trip_id AND t.agency_id IN (
      SELECT agency_id FROM public.users WHERE id = auth.uid()
    )
  )
);

CREATE POLICY "Clients access their own installments" ON public.booking_installments FOR SELECT USING (
  client_id = auth.uid()
);

-- Trigger Function para atualizar total pago da Viagem (Trips)
CREATE OR REPLACE FUNCTION public.update_trip_total_paid()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE public.trips
    SET total_paid = (
      SELECT COALESCE(SUM(amount), 0)
      FROM public.booking_installments
      WHERE trip_id = NEW.trip_id AND status = 'paid'
    )
    WHERE id = NEW.trip_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.trips
    SET total_paid = (
      SELECT COALESCE(SUM(amount), 0)
      FROM public.booking_installments
      WHERE trip_id = OLD.trip_id AND status = 'paid'
    )
    WHERE id = OLD.trip_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Associar a trigger na tabela de installments
DROP TRIGGER IF EXISTS trigger_update_trip_total_paid ON public.booking_installments;
CREATE TRIGGER trigger_update_trip_total_paid
AFTER INSERT OR UPDATE OF status OR DELETE ON public.booking_installments
FOR EACH ROW EXECUTE FUNCTION public.update_trip_total_paid();
