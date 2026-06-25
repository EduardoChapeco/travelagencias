-- Estende destination_info com metadados de inteligência e escopo por agência
ALTER TABLE public.destination_info
  ADD COLUMN IF NOT EXISTS agency_id uuid REFERENCES public.agencies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS source_url text,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS confidence_level text;

-- Cria log de auditoria para revisões de destino
CREATE TABLE IF NOT EXISTS public.destination_review_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  destination_id uuid NOT NULL REFERENCES public.destination_info(id) ON DELETE CASCADE,
  agency_id uuid REFERENCES public.agencies(id) ON DELETE CASCADE,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL, -- 'review', 'unreview', 'ai_generate', 'manual_edit'
  details text,
  created_at timestamptz DEFAULT now()
);

-- Ativa RLS
ALTER TABLE public.destination_review_logs ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para logs
CREATE POLICY "Users can view review logs of their agency" ON public.destination_review_logs
  FOR SELECT USING (
    agency_id IS NULL OR 
    EXISTS (
      SELECT 1 FROM public.agency_members 
      WHERE agency_members.agency_id = destination_review_logs.agency_id 
      AND agency_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Agency members can insert review logs" ON public.destination_review_logs
  FOR INSERT WITH CHECK (
    agency_id IS NULL OR 
    EXISTS (
      SELECT 1 FROM public.agency_members 
      WHERE agency_members.agency_id = destination_review_logs.agency_id 
      AND agency_members.user_id = auth.uid()
    )
  );
