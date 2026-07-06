# 05. Banco de Dados, Migrações e Políticas RLS

Este documento detalha o estado real da modelagem física do banco de dados do Turis, analisando a integridade das migrações, consistência de chaves estrangeiras, gatilhos (triggers) e a robustez do isolamento por Row Level Security (RLS).

---

## 1. Integridade das Migrações e Banco de Dados

O banco de dados do Supabase compreende 190 migrações sequenciais que constroem a estrutura física de produção de forma determinística. A auditoria forense das migrações recém-aplicadas indica:

- **Sequência de Migrações Contábeis**: As migrações `20260716000000_financial_rearchitecture_core.sql` a `20260719000000_financial_ledger_triggers.sql` estruturam o Plano de Contas, Brackets de Comissão, Fechamentos Mensais, e as regras do Razão Imutável Contábil.
- **Vista SQL Corretiva**: A migração `20260720000000_group_tours_financial_summary_view.sql` cria a vista `group_tours_financial_summary` com `security_invoker = true`, forçando o banco de dados a respeitar as políticas de RLS das tabelas subjacentes ao ler a vista (prevenindo bypass de segurança).
- **Workflow de Alteração Aérea**: A migração `20260722000000_flight_reaccommodation_workflow.sql` estabelece as 5 novas tabelas de reacomodação com chaves estrangeiras (`trip_id`, `original_itinerary_id`, `selected_alternative_id`) configuradas com cláusulas de eliminação em cascata (`ON DELETE CASCADE`) ou nulas (`ON DELETE SET NULL`) adequadas, prevenindo registros órfãos.

---

## 2. Auditoria de Tabelas Críticas e Normalização

Ao contrário de estruturas legadas que dependiam de colunas de metadados JSONB genéricas para armazenar lógica relacional, as novas tabelas do Turis estão normalizadas:

- **Livro-Razão Contábil (`financial_ledger_entries`)**:
  - _Finalidade_: Armazenar os débitos e créditos consolidados.
  - _Integridade_: Colunas `debit_amount` e `credit_amount` possuem restrições numéricas rígidas e não nulas. Não utiliza JSONB para dados de transações.
  - _RLS_: Blindagem append-only de segurança (Fase P0).
- **Rooming List (`boarding_rooming_list`)**:
  - _Finalidade_: Alocação de leitos de grupos de viagens.
  - _Normalização_: Totalmente normalizada de JSONB legado para colunas físicas (`room_number`, `room_type`, `hotel_name`, `checkin_date`, `checkout_date`), permitindo junções eficientes de ocupantes por passageiro.
- **Controle de Períodos Contábeis (`monthly_closing_periods`)**:
  - _Finalidade_: Bloqueio de meses contábeis por agência.
  - _Constraint_: Possui restrição de unicidade (`UNIQUE(agency_id, year, month)`) que impede a duplicação ou sobreposição de períodos contábeis para a mesma tenant.

---

## 3. Row Level Security (RLS) e Políticas de Isolamento

Toda a infraestrutura de segurança de dados reside no motor do PostgreSQL. A auditoria das políticas RLS confirma:

1.  **Imutabilidade do Razão Contábil (Ledger Hardening)**:
    - A política antiga `ledger_entries_access` sob `FOR ALL` foi removida.
    - Implementou-se a política `ledger_entries_select` restringindo conexões autenticadas comuns exclusivamente à leitura (`SELECT`) dos dados de sua agência via `public.is_agency_member(auth.uid(), agency_id)`.
    - Tentativas de exclusão (`DELETE`), atualização (`UPDATE`) ou inserção direta (`INSERT`) de lançamentos contábeis são abortadas e bloqueadas fisicamente pelo banco, mantendo o ledger imutável e gravado unicamente por gatilhos do servidor.
2.  **Isolamento Multi-Tenant Geral**:
    - Todas as novas tabelas ativam `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`.
    - As consultas baseiam-se na função de validação de tenant `public.is_agency_member(auth.uid(), agency_id)` ou `public.has_role(auth.uid(), 'agency_admin', agency_id)`. Um operador da Agência A que tentar alterar o payload de um visto, contrato ou voo da Agência B receberá negação de acesso direta do Supabase.
3.  **Acesso do Cliente B2C (Isolamento do Passageiro)**:
    - Para permitir que o cliente final assine e visualize a reacomodação na área do cliente sem pertencer ao quadro de funcionários da agência, foram criadas políticas especiais em `customer_travel_decisions` e `flight_change_cases` que realizam a validação cruzada:
      `USING (trip_id IN (SELECT id FROM public.trips WHERE client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())))`
    - Isso concede permissão segura e restrita apenas à viagem e às alternativas do passageiro ativo, impedindo-o de ler ou adulterar dados de outros passageiros do grupo.
