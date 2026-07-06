-- Migration: 20260900000007_client_app_builder.sql
-- Description: Creates the client_portal_settings table for the Wix-Style App Builder

CREATE TABLE IF NOT EXISTS public.client_portal_settings (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    theme_colors JSONB DEFAULT '{"primary": "#0f172a", "background": "#ffffff"}',
    home_blocks JSONB DEFAULT '[{"id": "hero_1", "type": "hero", "hidden": false}, {"id": "trips_1", "type": "my_trips", "hidden": false}, {"id": "store_1", "type": "store", "hidden": false}, {"id": "support_1", "type": "support", "hidden": false}]',
    enable_pwa BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(agency_id)
);

-- Habilitar RLS
ALTER TABLE public.client_portal_settings ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
-- Admins da agência podem tudo
CREATE POLICY "Admins podem gerenciar portal do cliente" ON public.client_portal_settings
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.agency_members
            WHERE agency_members.agency_id = client_portal_settings.agency_id
            AND agency_members.user_id = auth.uid()
            AND agency_members.role = 'agency_admin'
        )
    );

-- Clientes do portal podem ver as configs de suas agências logadas
CREATE POLICY "Clientes podem ver configs de sua agencia" ON public.client_portal_settings
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.contacts
            WHERE contacts.agency_id = client_portal_settings.agency_id
            AND contacts.client_id = auth.uid()
        )
    );

-- Trigger de Updated At
CREATE TRIGGER update_client_portal_settings_modtime
    BEFORE UPDATE ON public.client_portal_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
