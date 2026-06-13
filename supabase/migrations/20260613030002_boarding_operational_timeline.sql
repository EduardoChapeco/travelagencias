-- Adiciona colunas para controle de Briefing operacional de embarque
ALTER TABLE public.boarding_cards
ADD COLUMN IF NOT EXISTS briefing_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS briefing_url TEXT;

-- Tabela de Atividades/Timeline do Kanban de Embarque
CREATE TABLE IF NOT EXISTS public.boarding_card_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES public.boarding_cards(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexadores para otimização
CREATE INDEX IF NOT EXISTS boarding_activities_card_idx ON public.boarding_card_activities(card_id);
GRANT SELECT, INSERT ON public.boarding_card_activities TO authenticated;
GRANT ALL ON public.boarding_card_activities TO service_role;
ALTER TABLE public.boarding_card_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "activities_select" ON public.boarding_card_activities FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.boarding_cards bc
    WHERE bc.id = card_id AND public.is_agency_member(auth.uid(), bc.agency_id)
  ));

CREATE POLICY "activities_insert" ON public.boarding_card_activities FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.boarding_cards bc
    WHERE bc.id = card_id AND public.is_agency_member(auth.uid(), bc.agency_id)
  ));

-- Trigger para registrar mudanças de status no Kanban automaticamente
CREATE OR REPLACE FUNCTION public.log_boarding_card_status_change()
RETURNS TRIGGER AS $$
DECLARE
  _old_label TEXT;
  _new_label TEXT;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    _old_label := CASE OLD.status 
      WHEN 'pending' THEN 'Pendente' 
      WHEN 'action_needed' THEN 'Atenção' 
      WHEN 'checked_in' THEN 'Check-in Emitido' 
      WHEN 'completed' THEN 'Embarcado' 
      ELSE OLD.status END;
    _new_label := CASE NEW.status 
      WHEN 'pending' THEN 'Pendente' 
      WHEN 'action_needed' THEN 'Atenção' 
      WHEN 'checked_in' THEN 'Check-in Emitido' 
      WHEN 'completed' THEN 'Embarcado' 
      ELSE NEW.status END;

    INSERT INTO public.boarding_card_activities (card_id, action, description)
    VALUES (
      NEW.id,
      'status_changed',
      'Etapa alterada de "' || _old_label || '" para "' || _new_label || '"'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS boarding_card_status_change_trigger ON public.boarding_cards;
CREATE TRIGGER boarding_card_status_change_trigger
AFTER UPDATE ON public.boarding_cards
FOR EACH ROW EXECUTE FUNCTION public.log_boarding_card_status_change();
