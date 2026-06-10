-- Fase I: Infraestrutura para Web Push

CREATE TABLE IF NOT EXISTS public.web_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  agency_id uuid references public.agencies(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  device_info text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Garantir que não existam endpoints duplicados
CREATE UNIQUE INDEX IF NOT EXISTS web_push_endpoint_idx ON public.web_push_subscriptions(endpoint);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.web_push_subscriptions TO authenticated;
GRANT ALL ON public.web_push_subscriptions TO service_role;

ALTER TABLE public.web_push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Usuários só podem ler e escrever suas próprias assinaturas
CREATE POLICY "push_sub read" ON public.web_push_subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "push_sub insert" ON public.web_push_subscriptions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "push_sub delete" ON public.web_push_subscriptions FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER push_sub_touch BEFORE UPDATE ON public.web_push_subscriptions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
