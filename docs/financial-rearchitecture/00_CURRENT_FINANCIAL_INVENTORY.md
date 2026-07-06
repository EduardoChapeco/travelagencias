# Inventário Financeiro Atual (Turis)

Este documento apresenta o levantamento forense completo e detalhado de todos os artefatos, rotas, tabelas e arquivos relacionados ao subsistema financeiro no repositório atual do Turis.

---

## 1. Tabelas do Banco de Dados Relacionadas

As seguintes tabelas foram encontradas na estrutura do banco de dados (esquema `public`) através das migrações do Supabase:

- **[financial_records](file:///c:/Users/Excel%C3%AAncia%20Tour%20SMO/.gemini/antigravity-ide/scratch/travelagencias/supabase/migrations/20260603030500_fbc09cae-0fac-48cb-95b4-767c8d8b26e0.sql#L145-L165)**: Registro principal de lançamentos financeiros (receitas, despesas, transferências) vinculados ou não a viagens.
- **[payment_plans](file:///c:/Users/Excel%C3%AAncia%20Tour%20SMO/.gemini/antigravity-ide/scratch/travelagencias/supabase/migrations/20260603030500_fbc09cae-0fac-48cb-95b4-767c8d8b26e0.sql#L180-L188)**: Contratos de financiamento/parcelamento de viagens para os clientes.
- **[payment_installments](file:///c:/Users/Excel%C3%AAncia%20Tour%20SMO/.gemini/antigravity-ide/scratch/travelagencias/supabase/migrations/20260603030500_fbc09cae-0fac-48cb-95b4-767c8d8b26e0.sql#L197-L209)**: Parcelas individuais associadas a um plano de pagamento. Alterada por [20260621000000_recurring_receipts_and_segments.sql](file:///c:/Users/Excel%C3%AAncia%20Tour%20SMO/.gemini/antigravity-ide/scratch/travelagencias/supabase/migrations/20260621000000_recurring_receipts_and_segments.sql) para incluir colunas de controle de comprovantes.
- **[cash_registers](file:///c:/Users/Excel%C3%AAncia%20Tour%20SMO/.gemini/antigravity-ide/scratch/travelagencias/supabase/migrations/20260628000000_cash_registers_and_group_costs.sql#L8-L15)**: Cadastro de caixas físicos da agência ou contas bancárias conectadas.
- **[cash_sessions](file:///c:/Users/Excel%C3%AAncia%20Tour%20SMO/.gemini/antigravity-ide/scratch/travelagencias/supabase/migrations/20260628000000_cash_registers_and_group_costs.sql#L29-L42)**: Controle de abertura, quebras e fechamento de expedientes diários nos caixas físicos.
- **[cash_transactions](file:///c:/Users/Excel%C3%AAncia%20Tour%20SMO/.gemini/antigravity-ide/scratch/travelagencias/supabase/migrations/20260628000000_cash_registers_and_group_costs.sql#L58-L74)**: Transações de baixa, sangria, aporte ou vales associadas a uma sessão de caixa ou depósito bancário direto.
- **[trip_commissions](file:///c:/Users/Excel%C3%AAncia%20Tour%20SMO/.gemini/antigravity-ide/scratch/travelagencias/supabase/migrations/20260614000012_trip_commissions.sql#L13-L38)**: Regras e cálculos consolidados de comissionamento da agência e do agente por viagem.
- **[agent_commission_rules](file:///c:/Users/Excel%C3%AAncia%20Tour%20SMO/.gemini/antigravity-ide/scratch/travelagencias/supabase/migrations/20260614000004_dynamic_commissions.sql#L7-L17)**: Configuração de regras dinâmicas/escalonadas de comissionamento por agente.
- **[group_tour_costs](file:///c:/Users/Excel%C3%AAncia%20Tour%20SMO/.gemini/antigravity-ide/scratch/travelagencias/supabase/migrations/20260628000000_cash_registers_and_group_costs.sql#L91-L100)**: Armazena os custos operacionais (fixos e variáveis) atrelados a excursões/grupos.
- **[invoices](file:///c:/Users/Excel%C3%AAncia%20Tour%20SMO/.gemini/antigravity-ide/scratch/travelagencias/supabase/migrations/20260619100003_advanced_financials.sql#L56-L76)**: Registro de notas fiscais (NFS-e) emitidas sobre lançamentos ou viagens.

---

## 2. Funções de Banco de Dados e RPCs

Foram inventariadas as seguintes rotas de execução do lado do servidor (Database Procedures):

- **[public.open_cash_session](file:///c:/Users/Excel%C3%AAncia%20Tour%20SMO/.gemini/antigravity-ide/scratch/travelagencias/supabase/migrations/20260628000000_cash_registers_and_group_costs.sql#L209-L237)**: Inicia sessão de caixa fechando sessões órfãs anteriores.
- **[public.close_cash_session](file:///c:/Users/Excel%C3%AAncia%20Tour%20SMO/.gemini/antigravity-ide/scratch/travelagencias/supabase/migrations/20260628000000_cash_registers_and_group_costs.sql#L240-L270)**: Encerra expediente calculando automaticamente a diferença de caixa física.
- **[public.calculate_dre_summary](file:///c:/Users/Excel%C3%AAncia%20Tour%20SMO/.gemini/antigravity-ide/scratch/travelagencias/supabase/migrations/20260609000009_financial_rpcs.sql#L43-L107)**: Calcula o demonstrativo agrupado por categoria no período selecionado (mês, trimestre, ano).
- **[public.calculate_cash_summary](file:///c:/Users/Excel%C3%AAncia%20Tour%20SMO/.gemini/antigravity-ide/scratch/travelagencias/supabase/migrations/20260609000009_financial_rpcs.sql#L7-L40)**: Retorna saldo consolidado, entradas, saídas e pendentes.
- **[public.calculate_trip_commission_trigger_fn](file:///c:/Users/Excel%C3%AAncia%20Tour%20SMO/.gemini/antigravity-ide/scratch/travelagencias/supabase/migrations/20260614000004_dynamic_commissions.sql#L42-L134)**: Trigger procedural que calcula dinamicamente a comissão da agência e do agente no banco de dados.
- **[public.sync_trip_total_paid](file:///c:/Users/Excel%C3%AAncia%20Tour%20SMO/.gemini/antigravity-ide/scratch/travelagencias/supabase/migrations/20260605000001_schema_fixes_production.sql#L230-L262)**: Sincroniza o total pago na tabela de viagens a partir de quitações de parcelas.
- **[public.trip_financial_summary](file:///c:/Users/Excel%C3%AAncia%20Tour%20SMO/.gemini/antigravity-ide/scratch/travelagencias/supabase/migrations/20260605000001_schema_fixes_production.sql#L275-L327)**: Consolida custos, receitas e margem percentual de uma viagem específica.

---

## 3. Rotas do Frontend (React Router)

Foram encontradas as seguintes rotas de visualização e manipulação do financeiro no cliente:

- **[agency.$slug.financial.tsx](file:///c:/Users/Excel%C3%AAncia%20Tour%20SMO/.gemini/antigravity-ide/scratch/travelagencias/src/routes/agency.$slug.financial.tsx)**: Layout principal do módulo financeiro que provê as abas de navegação.
- **[agency.$slug.financial.cash.tsx](file:///c:/Users/Excel%C3%AAncia%20Tour%20SMO/.gemini/antigravity-ide/scratch/travelagencias/src/routes/agency.$slug.financial.cash.tsx)**: Interface de fluxo de caixa, caixas diários e lançamentos operacionais rápidos.
- **[agency.$slug.financial.reconciliation.tsx](file:///c:/Users/Excel%C3%AAncia%20Tour%20SMO/.gemini/antigravity-ide/scratch/travelagencias/src/routes/agency.$slug.financial.reconciliation.tsx)**: Painel de conciliação de comprovantes Pix e depósitos enviados pelos viajantes.
- **[agency.$slug.financial.dre.tsx](file:///c:/Users/Excel%C3%AAncia%20Tour%20SMO/.gemini/antigravity-ide/scratch/travelagencias/src/routes/agency.$slug.financial.dre.tsx)**: Demonstrativo de Resultados do Exercício (DRE) gerencial.
- **[agency.$slug.financial.invoices.tsx](file:///c:/Users/Excel%C3%AAncia%20Tour%20SMO/.gemini/antigravity-ide/scratch/travelagencias/src/routes/agency.$slug.financial.invoices.tsx)**: Painel de gestão de Notas Fiscais eletrônicas (NFS-e).
- **[agency.$slug.financial.groups.tsx](file:///c:/Users/Excel%C3%AAncia%20Tour%20SMO/.gemini/antigravity-ide/scratch/travelagencias/src/routes/agency.$slug.financial.groups.tsx)**: Visão consolidada de receitas e custos atrelados a excursões/grupos.
- **[agency.$slug.trips.$id.financial.tsx](file:///c:/Users/Excel%C3%AAncia%20Tour%20SMO/.gemini/antigravity-ide/scratch/travelagencias/src/routes/agency.$slug.trips.$id.financial.tsx)**: Extrato financeiro, KPIs de margem e painel de parcelamento exclusivo de uma viagem.

---

## 4. Componentes Financeiros Específicos

Os componentes encapsulados para a lógica financeira de viagens e dashboards:

- **[RecordTable.tsx](file:///c:/Users/Excel%C3%AAncia%20Tour%20SMO/.gemini/antigravity-ide/scratch/travelagencias/src/components/trips/financial/RecordTable.tsx)**: Tabela de lançamentos de receitas e despesas de uma viagem específica.
- **[FinancialKpis.tsx](file:///c:/Users/Excel%C3%AAncia%20Tour%20SMO/.gemini/antigravity-ide/scratch/travelagencias/src/components/trips/financial/FinancialKpis.tsx)**: Cards indicadores de total vendido, custo direto, receita líquida e margem de uma viagem.
- **[AddRecordSheet.tsx](file:///c:/Users/Excel%C3%AAncia%20Tour%20SMO/.gemini/antigravity-ide/scratch/travelagencias/src/components/trips/financial/AddRecordSheet.tsx)**: Painel deslizante para adicionar lançamentos rápidos manuais (receitas/despesas).
- **[SectionFinancial.tsx](file:///c:/Users/Excel%C3%AAncia%20Tour%20SMO/.gemini/antigravity-ide/scratch/travelagencias/src/components/studio/sections/SectionFinancial.tsx)**: Seção de parâmetros e regras de faturamento nos templates de propostas comerciais.
