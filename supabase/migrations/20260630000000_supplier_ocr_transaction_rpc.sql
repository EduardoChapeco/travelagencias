-- Migration: 20260630000000_supplier_ocr_transaction_rpc
-- Objetivo: Criar RPC para persistência atômica de dados extraídos por OCR de fornecedores, garantindo integridade transacional.

CREATE OR REPLACE FUNCTION public.confirm_ocr_supplier_data(
  _supplier_id uuid,
  _agency_id uuid,
  _file_id uuid,
  _contacts jsonb,
  _products jsonb,
  _phone text,
  _email text,
  _website text,
  _payment_terms text,
  _commission_rate numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item jsonb;
BEGIN
  -- 1. Inserir contatos
  IF _contacts IS NOT NULL AND jsonb_array_length(_contacts) > 0 THEN
    FOR item IN SELECT * FROM jsonb_array_elements(_contacts) LOOP
      IF item->>'name' IS NOT NULL AND (item->>'name') <> '' THEN
        INSERT INTO public.supplier_contacts (supplier_id, agency_id, name, role, email, phone)
        VALUES (
          _supplier_id, 
          _agency_id, 
          item->>'name', 
          COALESCE(item->>'role', 'Outro'), 
          item->>'email', 
          item->>'phone'
        );
      END IF;
    END LOOP;
  END IF;

  -- 2. Inserir produtos
  IF _products IS NOT NULL AND jsonb_array_length(_products) > 0 THEN
    FOR item IN SELECT * FROM jsonb_array_elements(_products) LOOP
      IF item->>'name' IS NOT NULL AND (item->>'name') <> '' THEN
        INSERT INTO public.supplier_products (
          supplier_id, 
          agency_id, 
          name, 
          kind, 
          destination, 
          price_from, 
          currency, 
          duration_days, 
          description, 
          is_active
        )
        VALUES (
          _supplier_id, 
          _agency_id, 
          item->>'name', 
          COALESCE(item->>'kind', 'other'), 
          item->>'destination', 
          (item->>'price_from')::numeric, 
          COALESCE(item->>'currency', 'BRL'), 
          (item->>'duration_days')::integer, 
          item->>'description', 
          true
        );
      END IF;
    END LOOP;
  END IF;

  -- 3. Atualizar metadados do fornecedor
  UPDATE public.suppliers
  SET phone = COALESCE(NULLIF(_phone, ''), phone),
      email = COALESCE(NULLIF(_email, ''), email),
      website = COALESCE(NULLIF(_website, ''), website),
      payment_terms = COALESCE(NULLIF(_payment_terms, ''), payment_terms),
      commission_rate = COALESCE(_commission_rate, commission_rate)
  WHERE id = _supplier_id;

  -- 4. Marcar arquivo como revisado
  UPDATE public.supplier_files
  SET ocr_reviewed = true,
      ocr_reviewed_at = now()
  WHERE id = _file_id;

END;
$$;

GRANT EXECUTE ON FUNCTION public.confirm_ocr_supplier_data(uuid, uuid, uuid, jsonb, jsonb, text, text, text, text, numeric) TO authenticated;
