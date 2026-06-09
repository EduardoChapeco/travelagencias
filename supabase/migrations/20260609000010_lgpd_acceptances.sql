-- TravelOS — LGPD & Legal Acceptances Governance
-- Migration: 20260609000010_lgpd_acceptances

-- =========================================================================
-- 1. TABELA DE RASTREABILIDADE DE CONSENTIMENTOS (LGPD)
-- =========================================================================
-- Registra de forma imutável a prova de que um usuário ou cliente aceitou
-- uma versão específica de um documento legal (Termos, Privacidade, etc).

CREATE TABLE IF NOT EXISTS public.legal_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.policy_documents(id) ON DELETE RESTRICT,
  agency_id uuid REFERENCES public.agencies(id) ON DELETE CASCADE,
  
  -- Quem aceitou (Pode ser um usuário interno/agente ou um cliente/viajante externo)
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  
  -- Metadados Forenses e de Compliance
  ip_address text,
  user_agent text,
  accepted_at timestamptz NOT NULL DEFAULT now(),

  -- O contexto de onde o aceite ocorreu (ex: "signup", "proposal_checkout", "contract_signature")
  context text
);

-- Índices para facilitar auditorias e validações
CREATE INDEX IF NOT EXISTS legal_acceptances_user_idx ON public.legal_acceptances(user_id);
CREATE INDEX IF NOT EXISTS legal_acceptances_client_idx ON public.legal_acceptances(client_id);
CREATE INDEX IF NOT EXISTS legal_acceptances_doc_idx ON public.legal_acceptances(document_id);

-- Restrição Lógica: O aceite precisa estar vinculado a um usuário OU a um cliente.
ALTER TABLE public.legal_acceptances
  ADD CONSTRAINT legal_acceptances_actor_check 
  CHECK (user_id IS NOT NULL OR client_id IS NOT NULL);


-- =========================================================================
-- 2. SEGURANÇA E IMUTABILIDADE (RLS)
-- =========================================================================
GRANT SELECT, INSERT ON public.legal_acceptances TO authenticated;
GRANT ALL ON public.legal_acceptances TO service_role;
ALTER TABLE public.legal_acceptances ENABLE ROW LEVEL SECURITY;

-- LEITURA: Super Admins veem tudo. Membros da agência veem aceites da sua agência.
-- Usuários comuns só veem os próprios aceites.
CREATE POLICY "la read" ON public.legal_acceptances FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() OR
    public.is_agency_member(auth.uid(), agency_id)
  );

-- INSERÇÃO: Somente via a RPC abaixo, ou backend service. Nunca direto pelo cliente sem bypass.
-- Nós vamos fechar a porta de INSERT direto do client (frontend não envia INSERT).
CREATE POLICY "la insert backend only" ON public.legal_acceptances FOR INSERT TO authenticated
  WITH CHECK (false);

-- Sem permissões de UPDATE ou DELETE. Consentimento é imutável! Se for revogado, 
-- não se apaga o registro de aceite passado. (Revogação deve ser tratada em outra tabela de status se necessário).


-- =========================================================================
-- 3. RPC PARA REGISTRAR ACEITE (SERVER-SIDE INJECTION)
-- =========================================================================
-- Esta função é chamada pelo frontend. O Supabase automaticamente injeta
-- os Headers (x-forwarded-for) nas variáveis request.headers, permitindo
-- que o banco grave o IP e o User-Agent verdadeiros de forma inviolável.

CREATE OR REPLACE FUNCTION public.record_legal_acceptance(
  _document_id uuid,
  _agency_id uuid DEFAULT NULL,
  _client_id uuid DEFAULT NULL,
  _context text DEFAULT 'generic'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _new_id uuid;
  _ip text;
  _user_agent text;
  _user_id uuid;
BEGIN
  _user_id := auth.uid();
  
  -- Coleta IP e User Agent direto da camada de transporte do Supabase Edge
  _ip := current_setting('request.headers', true)::json->>'x-forwarded-for';
  _user_agent := current_setting('request.headers', true)::json->>'user-agent';

  INSERT INTO public.legal_acceptances (
    document_id, agency_id, user_id, client_id, ip_address, user_agent, context
  ) VALUES (
    _document_id, _agency_id, _user_id, _client_id, _ip, _user_agent, _context
  )
  RETURNING id INTO _new_id;

  RETURN _new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_legal_acceptance(uuid, uuid, uuid, text) TO authenticated;
