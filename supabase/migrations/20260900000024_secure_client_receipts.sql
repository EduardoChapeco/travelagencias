-- =========================================================================================
-- Microfase 7: Autoridade em Upload de Comprovantes (Payment Installments)
-- O cliente final precisava atualizar o status da parcela para anexar o comprovante, mas
-- a RLS bloqueia corretamente o UPDATE na tabela por não-agentes. O frontend tentava
-- burlar isso fazendo o update direto, o que falhava silenciosamente ou com erro de RLS.
-- Criamos um gateway (RPC) restrito para o cliente subir o comprovante de forma autorizada.
-- =========================================================================================

CREATE OR REPLACE FUNCTION public.client_upload_receipt(_installment_id uuid, _receipt_url text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trip_client_id uuid;
BEGIN
  -- Validar se o cliente logado é de fato o dono da viagem associada à parcela
  SELECT t.client_id INTO v_trip_client_id
  FROM public.payment_installments pi
  JOIN public.payment_plans pp ON pp.id = pi.payment_plan_id
  JOIN public.trips t ON t.id = pp.trip_id
  WHERE pi.id = _installment_id;

  IF v_trip_client_id IS NULL THEN
    RAISE EXCEPTION 'Parcela não encontrada ou não vinculada a uma viagem.';
  END IF;

  IF v_trip_client_id <> auth.uid() THEN
    RAISE EXCEPTION 'Acesso Negado: Você não é o titular desta viagem.';
  END IF;

  -- Realizar a atualização restrita (apenas colunas de comprovante)
  UPDATE public.payment_installments
  SET receipt_url = _receipt_url,
      receipt_status = 'pending',
      receipt_uploaded_at = now()
  WHERE id = _installment_id;

END;
$$;

GRANT EXECUTE ON FUNCTION public.client_upload_receipt(uuid, text) TO authenticated;
