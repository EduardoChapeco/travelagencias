CREATE TABLE IF NOT EXISTS public.chatbot_flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  definition JSONB NOT NULL DEFAULT '{"nodes": [], "edges": []}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chatbot_flows_agency_id_key UNIQUE (agency_id)
);

-- Habilitar RLS
ALTER TABLE public.chatbot_flows ENABLE ROW LEVEL SECURITY;

-- Politicas de acesso
DROP POLICY IF EXISTS "Admins can manage chatbot flows" ON public.chatbot_flows;
DROP POLICY IF EXISTS "Members can view chatbot flows" ON public.chatbot_flows;

CREATE POLICY "Admins can manage chatbot flows" ON public.chatbot_flows
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.agency_members
      WHERE agency_members.agency_id = chatbot_flows.agency_id
        AND agency_members.user_id = auth.uid()
        AND agency_members.role = 'agency_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.agency_members
      WHERE agency_members.agency_id = chatbot_flows.agency_id
        AND agency_members.user_id = auth.uid()
        AND agency_members.role = 'agency_admin'
    )
  );

CREATE POLICY "Members can view chatbot flows" ON public.chatbot_flows
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.agency_members
      WHERE agency_members.agency_id = chatbot_flows.agency_id
        AND agency_members.user_id = auth.uid()
    )
  );
