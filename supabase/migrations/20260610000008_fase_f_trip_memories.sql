-- Fase F.2: O Super App da Viagem (Memórias e Feedback)

-- 1. Criar a tabela trip_memories
CREATE TABLE IF NOT EXISTS public.trip_memories (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
    client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
    image_url text NOT NULL,
    caption text,
    created_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz
);

-- Indices
CREATE INDEX IF NOT EXISTS trip_memories_trip_idx ON public.trip_memories(trip_id);

-- RLS
ALTER TABLE public.trip_memories ENABLE ROW LEVEL SECURITY;

-- Agente vê tudo da sua agência
CREATE POLICY "agent_trip_memories_select" ON public.trip_memories
    FOR SELECT TO authenticated
    USING (public.is_agency_member(auth.uid(), agency_id) AND deleted_at IS NULL);

-- Cliente vê as memórias da viagem que ele participa (se ele tiver user_id no auth)
-- Usaremos uma política mais tolerante para permitir o cliente ler/postar.
-- Para o cliente ler, ele precisa ser parte do trip_passengers ou ser o dono da trip.
-- Pela simplicidade e segurança (já que estamos no portal logado), vamos garantir
-- que se o usuario logado tiver clientes vinculados àquela trip, ele pode ver.

CREATE POLICY "client_trip_memories_select" ON public.trip_memories
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.clients c
            WHERE c.user_id = auth.uid()
            AND (
                c.id = trip_memories.client_id
                OR
                EXISTS (SELECT 1 FROM public.trips t WHERE t.id = trip_memories.trip_id AND t.client_id = c.id)
            )
        )
        AND deleted_at IS NULL
    );

CREATE POLICY "client_trip_memories_insert" ON public.trip_memories
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.clients c
            WHERE c.user_id = auth.uid()
            AND c.id = trip_memories.client_id
        )
    );

-- 2. Criar o Bucket trip-memories no Storage
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'trip-memories',
    'trip-memories',
    true, -- public bucket because it's easier to render for the app (photos are somewhat private by URL entropy, but we could use signed urls. For now, public is ok for images)
    10485760, -- 10MB
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Storage Policy para upload: authenticated users can upload to trip-memories
DROP POLICY IF EXISTS "trip_memories_upload" ON storage.objects;
CREATE POLICY "trip_memories_upload" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'trip-memories');

DROP POLICY IF EXISTS "trip_memories_read" ON storage.objects;
CREATE POLICY "trip_memories_read" ON storage.objects
    FOR SELECT TO public
    USING (bucket_id = 'trip-memories');

-- 3. Adicionar coluna na tabela support_tickets_messages (se não existir e precisarmos dela? Não, a gente já pode postar ticket. Vamos apenas usar o RPC insert ticket ou insert direto)
-- Na verdade, para criar um ticket de cancelamento, a gente insere no `support_tickets`.
