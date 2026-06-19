-- ============================================================
-- Migration: 20260623000003_contract_clause_library.sql
-- Fase 3: Biblioteca de Cláusulas + Snapshot + Audit Trail em Contratos
-- ============================================================

-- 1. Biblioteca de cláusulas reutilizáveis (padrão + customizável por agência)
CREATE TABLE IF NOT EXISTS public.contract_clauses (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id   uuid REFERENCES public.agencies(id) ON DELETE CASCADE, -- NULL = cláusula global da plataforma
  title       text NOT NULL,
  body        text NOT NULL,
  kind        text NOT NULL CHECK (kind IN ('cancellation','liability','payment','general','lgpd','insurance','custom')),
  is_default  boolean NOT NULL DEFAULT false,
  is_active   boolean NOT NULL DEFAULT true,
  version     int NOT NULL DEFAULT 1,
  order_index int NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS contract_clauses_agency_idx ON public.contract_clauses(agency_id);
CREATE INDEX IF NOT EXISTS contract_clauses_kind_idx ON public.contract_clauses(kind);

ALTER TABLE public.contract_clauses ENABLE ROW LEVEL SECURITY;

-- Leitura: membros da agência + cláusulas globais (agency_id IS NULL)
DROP POLICY IF EXISTS "members read contract_clauses" ON public.contract_clauses;
CREATE POLICY "members read contract_clauses" ON public.contract_clauses
  FOR SELECT TO authenticated
  USING (agency_id IS NULL OR public.is_agency_member(auth.uid(), agency_id));

DROP POLICY IF EXISTS "admin manage contract_clauses" ON public.contract_clauses;
CREATE POLICY "admin manage contract_clauses" ON public.contract_clauses
  FOR ALL TO authenticated
  USING (agency_id IS NOT NULL AND public.is_agency_member(auth.uid(), agency_id))
  WITH CHECK (agency_id IS NOT NULL AND public.is_agency_member(auth.uid(), agency_id));

GRANT SELECT ON public.contract_clauses TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.contract_clauses TO authenticated;
GRANT ALL ON public.contract_clauses TO service_role;

CREATE OR REPLACE TRIGGER contract_clauses_touch
  BEFORE UPDATE ON public.contract_clauses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 2. Enriquecer tabela contracts com snapshot e audit trail
-- ============================================================
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS clause_snapshot   jsonb,     -- snapshot das cláusulas no momento da assinatura
  ADD COLUMN IF NOT EXISTS version           int NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS audit_trail       jsonb NOT NULL DEFAULT '[]', -- registro de todas as alterações
  ADD COLUMN IF NOT EXISTS template_id       uuid,      -- referência ao template base usado
  ADD COLUMN IF NOT EXISTS is_custom_clauses boolean NOT NULL DEFAULT false; -- se o usuário personalizou cláusulas

-- ============================================================
-- 3. Função RPC: registrar edição de cláusula no audit trail
-- ============================================================
CREATE OR REPLACE FUNCTION public.append_contract_audit(
  _contract_id uuid,
  _action text,
  _description text,
  _user_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _entry jsonb;
BEGIN
  _entry := jsonb_build_object(
    'action', _action,
    'description', _description,
    'user_id', _user_id,
    'timestamp', now()
  );
  UPDATE public.contracts
  SET audit_trail = COALESCE(audit_trail, '[]'::jsonb) || _entry,
      version = COALESCE(version, 1) + 1,
      updated_at = now()
  WHERE id = _contract_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.append_contract_audit TO authenticated;

-- ============================================================
-- 4. Seed das cláusulas padrão da plataforma (global, agency_id NULL)
-- ============================================================
INSERT INTO public.contract_clauses (agency_id, title, body, kind, is_default, order_index) VALUES
(NULL, 'Objeto do Contrato', 'O presente contrato tem por objeto a prestação de serviços turísticos pela CONTRATADA conforme detalhado no pacote de viagem acordado, incluindo hospedagem, translados, passeios e demais serviços especificados na proposta comercial aceita pelo CONTRATANTE.', 'general', true, 1),
(NULL, 'Política de Cancelamento', 'O cancelamento deverá ser realizado por escrito com antecedência mínima de 30 (trinta) dias da data de início dos serviços. Cancelamentos realizados com menos de 30 dias estão sujeitos a multa conforme tabela vigente. Cancelamentos com menos de 07 dias da partida: multa de 100% do valor total do pacote.', 'cancellation', true, 2),
(NULL, 'Condições de Pagamento', 'O pagamento deverá ser realizado conforme condições acordadas na proposta comercial. O não pagamento de qualquer parcela na data de vencimento acarretará multa de 2% ao mês e correção pelo IPCA, além de possibilitar a rescisão do contrato pela CONTRATADA.', 'payment', true, 3),
(NULL, 'Responsabilidades da Contratada', 'A CONTRATADA compromete-se a prestar os serviços descritos com qualidade e dentro dos padrões acordados. Em caso de imprevistos de força maior (catástrofes naturais, greves, pandemias), a CONTRATADA não será responsabilizada por eventuais prejuízos, devendo renegociar com o CONTRATANTE alternativas viáveis.', 'liability', true, 4),
(NULL, 'Responsabilidades do Contratante', 'O CONTRATANTE é responsável por manter todos os documentos de viagem válidos (passaportes, vistos, vacinas obrigatórias). A CONTRATADA não se responsabiliza por impedimentos causados por irregularidades documentais do CONTRATANTE ou de seus acompanhantes.', 'liability', true, 5),
(NULL, 'Seguro de Viagem', 'Recomenda-se fortemente a contratação de seguro de viagem completo, cobrindo assistência médica, cancelamento e bagagem. A CONTRATADA pode intermediar a contratação do seguro mediante solicitação do CONTRATANTE.', 'insurance', true, 6),
(NULL, 'Proteção de Dados (LGPD)', 'Os dados pessoais coletados são utilizados exclusivamente para a prestação dos serviços turísticos contratados, em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018). O CONTRATANTE autoriza o compartilhamento de seus dados com fornecedores necessários à execução dos serviços (hotéis, companhias aéreas, seguradoras). Os dados serão armazenados por até 5 anos após o encerramento do contrato.', 'lgpd', true, 7),
(NULL, 'Foro e Jurisdição', 'Fica eleito o foro da comarca onde está registrada a CONTRATADA para dirimir eventuais disputas decorrentes deste contrato, com renúncia de qualquer outro, por mais privilegiado que seja.', 'general', true, 8)
ON CONFLICT DO NOTHING;
