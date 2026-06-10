-- Fase H: Revitalização Operacional (Vistos, Corporativo RFP, Suporte)

-- 1. Modificações em Vistos (visa_requests)
-- Conectar o pedido de visto ao requisito catalogado
ALTER TABLE public.visa_requests 
ADD COLUMN IF NOT EXISTS requirement_id UUID REFERENCES public.visa_requirements(id) ON DELETE SET NULL;

-- 2. Modificações em Suporte (support_tickets e ticket_messages)
ALTER TABLE public.support_tickets 
ADD COLUMN IF NOT EXISTS csat_score INTEGER CHECK (csat_score >= 1 AND csat_score <= 5),
ADD COLUMN IF NOT EXISTS sla_breach_at TIMESTAMPTZ;

ALTER TABLE public.ticket_messages
ADD COLUMN IF NOT EXISTS is_internal BOOLEAN DEFAULT false;

-- 3. Modificações na tabela de RFPs Corporativas (corporate_rfps) para fluxo B2B Complexo
ALTER TABLE public.corporate_rfps 
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS proposed_options JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS approved_option_id TEXT,
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS approval_token TEXT DEFAULT md5(random()::text);

-- Se status anterior tinha check simples, atualizar
ALTER TABLE public.corporate_rfps DROP CONSTRAINT IF EXISTS corporate_rfps_status_check;
ALTER TABLE public.corporate_rfps ADD CONSTRAINT corporate_rfps_status_check CHECK (status IN ('pending', 'new', 'scoping', 'quoting', 'negotiating', 'approved', 'lost', 'sent_for_approval', 'rejected', 'converted'));





-- Adicionar permissões ao bucket 'voucher-pdfs' para a geração de stories, se não existir
INSERT INTO storage.buckets (id, name, public) 
VALUES ('voucher-pdfs', 'voucher-pdfs', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Liberar acesso a membros da agência para salvar e listar PDFs de vouchers
CREATE POLICY "Agency members can insert voucher pdfs"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'voucher-pdfs');

CREATE POLICY "Agency members can update voucher pdfs"
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'voucher-pdfs');

CREATE POLICY "Agency members can select voucher pdfs"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'voucher-pdfs');

CREATE POLICY "Public can view voucher pdfs"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'voucher-pdfs');
