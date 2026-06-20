-- Migration: 20260629000000_production_security_hardening
-- Objetivo: Tornar o bucket payment-receipts privado, configurar RLS restrita, criar trigger de imutabilidade para contratos assinados e expor agency_id no public_contract_by_token.

-- 1. Configurar bucket payment-receipts como PRIVADO
UPDATE storage.buckets
SET public = false
WHERE id = 'payment-receipts';

-- 2. Limpar políticas antigas do bucket payment-receipts
DROP POLICY IF EXISTS "Public Select Payment Receipts" ON storage.objects;
DROP POLICY IF EXISTS "Public Insert Payment Receipts" ON storage.objects;
DROP POLICY IF EXISTS "payment_receipts_public_read" ON storage.objects;
DROP POLICY IF EXISTS "payment_receipts_public_insert" ON storage.objects;

-- 3. Criar política de INSERT segura (permite upload anônimo e autenticado em caminhos válidos)
CREATE POLICY "payment_receipts_insert" ON storage.objects
  FOR INSERT TO public
  WITH CHECK (
    bucket_id = 'payment-receipts' AND
    (
      -- Permite na pasta receipts (compatibilidade legada)
      ((storage.foldername(name))[1] = 'receipts') OR
      -- Ou se a primeira pasta for o UUID de uma agência
      ((storage.foldername(name))[1] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$')
    )
  );

-- 4. Criar política de SELECT restrita (sem listagem pública)
CREATE POLICY "payment_receipts_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'payment-receipts' AND (
      -- Caso 1: Usuário é agente/admin da agência dona da pasta
      (
        (storage.foldername(name))[1] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' AND
        public.is_agency_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
      ) OR
      -- Caso 2: Cliente autenticado visualiza recibo do seu próprio parcelamento (pasta com o ID da parcela no segundo nível)
      (
        EXISTS (
          SELECT 1 FROM public.payment_installments pi
          JOIN public.payment_plans pp ON pp.id = pi.payment_plan_id
          JOIN public.trips t ON t.id = pp.trip_id
          JOIN public.clients c ON c.id = t.client_id
          WHERE pi.id::text = (storage.foldername(name))[2]
            AND c.user_id = auth.uid()
        )
      ) OR
      -- Caso 3: Compatibilidade com uploads antigos na pasta receipts/
      (
        (storage.foldername(name))[1] = 'receipts' AND
        EXISTS (
          SELECT 1 FROM public.payment_installments pi
          JOIN public.payment_plans pp ON pp.id = pi.payment_plan_id
          JOIN public.trips t ON t.id = pp.trip_id
          WHERE pi.id::text = split_part(storage.filename(name), '_', 1)
            AND public.is_agency_member(auth.uid(), t.agency_id)
        )
      )
    )
  );

-- 5. Criar política de DELETE para agentes e administradores da agência
CREATE POLICY "payment_receipts_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'payment-receipts' AND
    (storage.foldername(name))[1] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' AND
    public.is_agency_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

-- 6. Adicionar restrição de imutabilidade (Trigger) para contratos assinados
CREATE OR REPLACE FUNCTION public.check_contract_signed_immutability()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = 'signed' THEN
    -- Bloquear modificação de campos críticos de valor, termos, e dados de signatários
    IF NEW.total_value IS DISTINCT FROM OLD.total_value OR
       NEW.package_summary IS DISTINCT FROM OLD.package_summary OR
       NEW.payment_terms IS DISTINCT FROM OLD.payment_terms OR
       NEW.fixed_clauses IS DISTINCT FROM OLD.fixed_clauses OR
       NEW.custom_clauses IS DISTINCT FROM OLD.custom_clauses OR
       NEW.client_data IS DISTINCT FROM OLD.client_data OR
       NEW.passengers_data IS DISTINCT FROM OLD.passengers_data OR
       NEW.agency_id IS DISTINCT FROM OLD.agency_id OR
       NEW.trip_id IS DISTINCT FROM OLD.trip_id OR
       NEW.signed_at IS DISTINCT FROM OLD.signed_at OR
       NEW.content_hash IS DISTINCT FROM OLD.content_hash OR
       NEW.signed_hash IS DISTINCT FROM OLD.signed_hash OR
       NEW.certificate IS DISTINCT FROM OLD.certificate
    THEN
      RAISE EXCEPTION 'Os termos financeiros, cláusulas e dados de um contrato assinado são imutáveis.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_contract_immutability ON public.contracts;
CREATE TRIGGER enforce_contract_immutability
  BEFORE UPDATE ON public.contracts
  FOR EACH ROW
  EXECUTE FUNCTION public.check_contract_signed_immutability();

-- 7. Redefinir public_contract_by_token para retornar agency_id uuid (DROP primeiro para mudar a assinatura de retorno)
DROP FUNCTION IF EXISTS public.public_contract_by_token(text);

CREATE OR REPLACE FUNCTION public.public_contract_by_token(_token text)
RETURNS TABLE(
  id uuid,
  status text,
  agency_name text,
  agency_logo text,
  package_summary text,
  total_value numeric,
  payment_terms text,
  fixed_clauses jsonb,
  custom_clauses jsonb,
  client_data jsonb,
  passengers_data jsonb,
  signed_at timestamptz,
  content_hash text,
  agency_id uuid
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.id, c.status,
    a.name, a.logo_url,
    c.package_summary, c.total_value, c.payment_terms,
    c.fixed_clauses, c.custom_clauses, c.client_data, c.passengers_data,
    c.signed_at, c.content_hash,
    c.agency_id
  FROM public.contracts c
  JOIN public.agencies a ON a.id = c.agency_id
  WHERE c.public_token = _token
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.public_contract_by_token(text) TO anon, authenticated;
