-- Migration: 20260900000008_client_wallet_passes.sql
-- Description: Creates the client_wallet_passes table for the digital wallet feature

CREATE TABLE IF NOT EXISTS public.client_wallet_passes (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    client_id UUID NOT NULL, -- UUID from auth.users (the traveler)
    trip_id UUID REFERENCES public.trips(id) ON DELETE SET NULL,
    pass_type TEXT NOT NULL DEFAULT 'voucher', -- voucher, boarding_pass, ticket, insurance
    title TEXT NOT NULL,
    subtitle TEXT,
    barcode_value TEXT,
    color TEXT DEFAULT '#0f172a',
    status TEXT NOT NULL DEFAULT 'active', -- active, used, expired
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.client_wallet_passes ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
-- Admins da agência podem tudo
CREATE POLICY "Admins podem gerenciar passes" ON public.client_wallet_passes
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.agency_members
            WHERE agency_members.agency_id = client_wallet_passes.agency_id
            AND agency_members.user_id = auth.uid()
            AND agency_members.role = 'agency_admin'
        )
    );

-- Clientes do portal podem ver seus próprios passes
CREATE POLICY "Clientes podem ver seus proprios passes" ON public.client_wallet_passes
    FOR SELECT
    USING (client_id = auth.uid());

-- Trigger de Updated At
CREATE TRIGGER update_client_wallet_passes_modtime
    BEFORE UPDATE ON public.client_wallet_passes
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
