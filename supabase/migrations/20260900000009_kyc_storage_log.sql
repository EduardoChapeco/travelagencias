-- Migration: 20260900000009_kyc_storage_log.sql
-- Description: Creates the client_signatures table and the Storage Bucket for KYC photos

CREATE TABLE IF NOT EXISTS public.client_signatures (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    client_id UUID NOT NULL, -- UUID do auth.users do viajante
    document_type TEXT NOT NULL, -- 'proposal' ou 'contract'
    document_id UUID NOT NULL, -- ID da proposal ou contract
    latitude NUMERIC,
    longitude NUMERIC,
    ip_address TEXT,
    photo_url TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.client_signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins podem ver as assinaturas da sua agencia" ON public.client_signatures
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.agency_members
            WHERE agency_members.agency_id = client_signatures.agency_id
            AND agency_members.user_id = auth.uid()
            AND agency_members.role = 'agency_admin'
        )
    );

CREATE POLICY "Clientes podem ver suas proprias assinaturas" ON public.client_signatures
    FOR SELECT
    USING (client_id = auth.uid());

CREATE POLICY "Clientes podem criar suas proprias assinaturas" ON public.client_signatures
    FOR INSERT
    WITH CHECK (client_id = auth.uid());

-- Criar bucket no Supabase Storage se nao existir
INSERT INTO storage.buckets (id, name, public) 
VALUES ('identity_proofs', 'identity_proofs', false)
ON CONFLICT (id) DO NOTHING;

-- Policies do Storage (Bucket identity_proofs)
-- Clientes podem fazer upload de fotos apenas para a própria pasta (userId/)
CREATE POLICY "Qualquer cliente autenticado pode subir provas de vida" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'identity_proofs' AND name LIKE (auth.uid()::text || '/%'));

-- Clientes podem ver suas próprias fotos de KYC
CREATE POLICY "Clientes podem ler suas proprias fotos do KYC" 
ON storage.objects FOR SELECT 
TO authenticated 
USING (bucket_id = 'identity_proofs' AND name LIKE (auth.uid()::text || '/%'));

-- Admins da agência podem visualizar fotos de KYC de assinaturas da agência
CREATE POLICY "Apenas admin pode ler fotos do KYC" 
ON storage.objects FOR SELECT 
TO authenticated 
USING (
    bucket_id = 'identity_proofs' 
    AND EXISTS (
        SELECT 1 FROM public.client_signatures cs
        JOIN public.agency_members am ON am.agency_id = cs.agency_id
        WHERE am.user_id = auth.uid()
        AND am.role = 'agency_admin'
        AND cs.photo_url LIKE '%' || name
    )
);
