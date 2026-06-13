-- Migration: 20260613030005_whatsapp_operational_triggers.sql
-- FASE 9: Notificações Automáticas via WhatsApp

-- 1. Helper para obter ou criar uma lead compatível com o whatsapp-sender
CREATE OR REPLACE FUNCTION public.get_lead_id_for_whatsapp(
  _agency_id uuid,
  _trip_id uuid,
  _client_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _lead_id uuid;
  _client_phone text;
  _client_name text;
BEGIN
  -- A. Tentar encontrar a lead pela proposta associada à viagem
  IF _trip_id IS NOT NULL THEN
    SELECT p.lead_id INTO _lead_id
    from public.trips t
    join public.proposals p on p.id = t.proposal_id
    where t.id = _trip_id
    LIMIT 1;
  END IF;

  -- B. Tentar encontrar a lead pelo client_id diretamente
  IF _lead_id IS NULL AND _client_id IS NOT NULL THEN
    SELECT id INTO _lead_id
    FROM public.leads
    WHERE client_id = _client_id
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;

  -- C. Se não houver lead mas houver client com telefone, resolver por telefone ou criar lead virtual
  IF _lead_id IS NULL AND _client_id IS NOT NULL THEN
    SELECT phone, full_name INTO _client_phone, _client_name
    FROM public.clients
    WHERE id = _client_id;

    IF _client_phone IS NOT NULL AND _client_phone <> '' THEN
      -- Buscar lead com mesmo telefone
      SELECT id INTO _lead_id
      FROM public.leads
      WHERE phone = _client_phone AND agency_id = _agency_id
      ORDER BY created_at DESC
      LIMIT 1;

      -- Se não existir, criar lead de integração
      IF _lead_id IS NULL THEN
        INSERT INTO public.leads (agency_id, name, phone, client_id, status)
        VALUES (_agency_id, _client_name, _client_phone, _client_id, 'converted')
        RETURNING id INTO _lead_id;
      END IF;
    END IF;
  END IF;

  RETURN _lead_id;
END;
$$;

-- 2. Gatilho para Contrato Assinado
CREATE OR REPLACE FUNCTION public.trigger_contract_signed_whatsapp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _lead_id uuid;
  _trip_title text;
  _serial text;
  _client_name text;
BEGIN
  -- Executar apenas se o status mudar para 'signed'
  IF NEW.status = 'signed' AND (OLD.status IS DISTINCT FROM 'signed') THEN
    -- Obter detalhes da viagem
    SELECT title INTO _trip_title FROM public.trips WHERE id = NEW.trip_id;
    
    -- Obter serial do certificado
    _serial := COALESCE(NEW.certificate->>'serial', 'N/A');
    
    -- Obter nome do cliente
    _client_name := COALESCE(NEW.client_data->>'full_name', 'Cliente');

    -- Obter ou criar lead ID para o whatsapp-sender
    _lead_id := public.get_lead_id_for_whatsapp(NEW.agency_id, NEW.trip_id, NEW.client_data->>'id');

    IF _lead_id IS NOT NULL THEN
      -- Inserir mensagem de outbound pendente para o whatsapp-sender disparar
      INSERT INTO public.omnichannel_messages (
        agency_id,
        lead_id,
        channel,
        direction,
        status,
        content
      ) VALUES (
        NEW.agency_id,
        _lead_id,
        'whatsapp',
        'outbound',
        'pending',
        'Olá, ' || _client_name || '! Seu contrato para a viagem "' || _trip_title || '" foi assinado com sucesso. A chancela de validade jurídica foi gerada com o Serial: ' || _serial || '.'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS contract_signed_whatsapp_trig ON public.contracts;
CREATE TRIGGER contract_signed_whatsapp_trig
  AFTER UPDATE ON public.contracts
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_contract_signed_whatsapp();

-- 3. Gatilho para Novo Aditivo Criado (Aguardando Assinatura)
CREATE OR REPLACE FUNCTION public.trigger_addendum_created_whatsapp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _lead_id uuid;
  _trip_title text;
  _client_name text;
  _public_token text;
BEGIN
  -- Obter informações do contrato principal
  SELECT public_token, client_data->>'full_name', client_data->>'id'
  INTO _public_token, _client_name, _lead_id
  FROM public.contracts
  WHERE id = NEW.contract_id;

  SELECT title INTO _trip_title
  FROM public.trips t
  JOIN public.contracts c ON c.trip_id = t.id
  WHERE c.id = NEW.contract_id;

  -- Obter lead_id correto
  _lead_id := public.get_lead_id_for_whatsapp(NEW.agency_id, NULL, _lead_id);

  IF _lead_id IS NOT NULL AND _public_token IS NOT NULL THEN
    INSERT INTO public.omnichannel_messages (
      agency_id,
      lead_id,
      channel,
      direction,
      status,
      content
    ) VALUES (
      NEW.agency_id,
      _lead_id,
      'whatsapp',
      'outbound',
      'pending',
      'Olá, ' || COALESCE(_client_name, 'Cliente') || '! Um aditivo de contrato (renegociação) foi gerado para a sua viagem "' || COALESCE(_trip_title, 'Viagem') || '". Por favor, acesse o link para assinar: /m/contract/' || _public_token
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS addendum_created_whatsapp_trig ON public.contract_addendums;
CREATE TRIGGER addendum_created_whatsapp_trig
  AFTER INSERT ON public.contract_addendums
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_addendum_created_whatsapp();

-- 4. Gatilho para Alerta de Vencimento de Passaporte (< 6 meses do embarque)
CREATE OR REPLACE FUNCTION public.trigger_passport_expiry_whatsapp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _lead_id uuid;
  _trip_start date;
  _trip_title text;
  _passenger_name text;
  _days_before_expiry integer;
BEGIN
  -- Apenas se for passaporte e tiver expiration_date
  IF NEW.document_type = 'passport' AND NEW.expiration_date IS NOT NULL THEN
    -- Obter data de embarque e título da viagem
    SELECT travel_start, title INTO _trip_start, _trip_title
    FROM public.trips
    WHERE id = NEW.trip_id;

    -- Obter nome do passageiro
    SELECT full_name INTO _passenger_name
    FROM public.trip_passengers
    WHERE id = NEW.passenger_id;

    IF _trip_start IS NOT NULL AND _passenger_name IS NOT NULL THEN
      -- Se a validade do passaporte for menor que 6 meses a partir da data da viagem
      IF NEW.expiration_date < (_trip_start + interval '6 months') THEN
        -- Obter lead_id do comprador principal da viagem para avisá-lo
        SELECT client_id INTO _lead_id FROM public.trips WHERE id = NEW.trip_id;
        _lead_id := public.get_lead_id_for_whatsapp(NEW.agency_id, NEW.trip_id, _lead_id);

        IF _lead_id IS NOT NULL THEN
          INSERT INTO public.omnichannel_messages (
            agency_id,
            lead_id,
            channel,
            direction,
            status,
            content
          ) VALUES (
            NEW.agency_id,
            _lead_id,
            'whatsapp',
            'outbound',
            'pending',
            '⚠️ Alerta Importante! O passaporte do passageiro ' || _passenger_name || ' para a viagem "' || _trip_title || '" expira em ' || to_char(NEW.expiration_date, 'DD/MM/YYYY') || '. Por ter validade menor que 6 meses no embarque (' || to_char(_trip_start, 'DD/MM/YYYY') || '), recomendamos providenciar a renovação urgente.'
          );
        END IF;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS passport_expiry_whatsapp_trig ON public.passenger_documents;
CREATE TRIGGER passport_expiry_whatsapp_trig
  AFTER INSERT OR UPDATE ON public.passenger_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_passport_expiry_whatsapp();
