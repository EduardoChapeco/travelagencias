-- Migration: 20260614000003_advanced_financials
-- Objetivo: Preparar a infraestrutura do banco de dados para Caixa, NFS-e, Múltiplos Pagamentos, Abertura/Fechamento de Caixa.

-- 1. Caixas (Cash Registers)
CREATE TABLE IF NOT EXISTS public.cash_registers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid REFERENCES public.agencies(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL, -- ex: "Caixa Loja 1", "Conta Digital Banco Cora"
  type text NOT NULL DEFAULT 'physical', -- 'physical', 'bank_account'
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- 2. Sessões de Caixa (Abertura e Fechamento Diário para Caixas Físicos)
CREATE TABLE IF NOT EXISTS public.cash_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid REFERENCES public.agencies(id) ON DELETE CASCADE NOT NULL,
  cash_register_id uuid REFERENCES public.cash_registers(id) ON DELETE RESTRICT NOT NULL,
  opened_by uuid REFERENCES auth.users(id) NOT NULL,
  closed_by uuid REFERENCES auth.users(id),
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  opening_balance numeric NOT NULL DEFAULT 0,
  closing_balance numeric,
  reported_balance numeric, -- Saldo informado pelo operador no fechamento
  status text NOT NULL DEFAULT 'open', -- 'open', 'closed'
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- 3. Transações Financeiras / Múltiplos Pagamentos (Baixas)
-- Uma Conta a Pagar/Receber (financial_records) pode ter múltiplas transações (ex: 50% Pix, 50% Cartão)
CREATE TABLE IF NOT EXISTS public.financial_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid REFERENCES public.agencies(id) ON DELETE CASCADE NOT NULL,
  record_id uuid REFERENCES public.financial_records(id) ON DELETE CASCADE, -- Conta original
  cash_session_id uuid REFERENCES public.cash_sessions(id) ON DELETE RESTRICT, -- Opcional, atrelado a um caixa aberto
  cash_register_id uuid REFERENCES public.cash_registers(id) ON DELETE RESTRICT, -- Onde o dinheiro efetivamente caiu
  amount numeric NOT NULL,
  type text NOT NULL, -- 'payment', 'receipt', 'withdrawal' (Sangria), 'deposit' (Aporte)
  payment_method text NOT NULL, -- 'pix', 'credit_card', 'cash', 'bank_transfer'
  transaction_date timestamptz NOT NULL DEFAULT now(),
  receipt_url text, -- Comprovante da transação
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- 4. Notas Fiscais (Invoices)
CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid REFERENCES public.agencies(id) ON DELETE CASCADE NOT NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE RESTRICT,
  financial_record_id uuid REFERENCES public.financial_records(id) ON DELETE SET NULL, -- A nota pode emitir sobre uma conta
  trip_id uuid REFERENCES public.trips(id) ON DELETE SET NULL, -- Ou sobre uma viagem como um todo
  invoice_number text, -- Número da RPS ou NFS-e retornada pela prefeitura
  amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'draft', -- 'draft', 'pending_issue', 'issued', 'canceled', 'failed'
  issue_date timestamptz,
  cancellation_date timestamptz,
  xml_url text,
  pdf_url text,
  tax_amount numeric,
  iss_retido boolean NOT NULL DEFAULT false,
  error_message text, -- Caso a prefeitura rejeite
  provider_data jsonb NOT NULL DEFAULT '{}'::jsonb, -- Retornos da API do emissor (ex: eNotas, Focus NFe)
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- 5. RLS Policies
ALTER TABLE public.cash_registers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cash_registers_policy" ON public.cash_registers FOR ALL TO authenticated USING (public.is_agency_member(auth.uid(), agency_id));
CREATE POLICY "cash_sessions_policy" ON public.cash_sessions FOR ALL TO authenticated USING (public.is_agency_member(auth.uid(), agency_id));
CREATE POLICY "financial_transactions_policy" ON public.financial_transactions FOR ALL TO authenticated USING (public.is_agency_member(auth.uid(), agency_id));
CREATE POLICY "invoices_policy" ON public.invoices FOR ALL TO authenticated USING (public.is_agency_member(auth.uid(), agency_id));

-- Triggers for updated_at
CREATE TRIGGER trg_cash_registers_updated_at BEFORE UPDATE ON public.cash_registers FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_cash_sessions_updated_at BEFORE UPDATE ON public.cash_sessions FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_financial_transactions_updated_at BEFORE UPDATE ON public.financial_transactions FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Nota: Todas as tabelas agora suportam soft-delete via deleted_at. Exclusão física (DELETE) é bloqueada em nível de arquitetura do servidor, recomendando update {deleted_at: now()}
