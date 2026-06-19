-- Migration: 20260626000002_payment_receipts_bucket
-- Objetivo: Criar bucket de armazenamento de comprovantes de pagamento e configurar políticas de acesso RLS públicas para upload anônimo/autenticado

INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-receipts', 'payment-receipts', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public Select Payment Receipts" ON storage.objects;
CREATE POLICY "Public Select Payment Receipts"
ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'payment-receipts');

DROP POLICY IF EXISTS "Public Insert Payment Receipts" ON storage.objects;
CREATE POLICY "Public Insert Payment Receipts"
ON storage.objects FOR INSERT TO anon, authenticated
WITH CHECK (bucket_id = 'payment-receipts');
