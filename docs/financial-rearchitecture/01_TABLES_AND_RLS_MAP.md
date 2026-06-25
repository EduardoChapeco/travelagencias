# Mapa de Tabelas e RLS (TravelOS)

Este documento descreve detalhadamente o modelo físico de dados, chaves estrangeiras, restrições (constraints) e políticas de segurança em nível de linha (Row Level Security - RLS) de todas as tabelas do subsistema financeiro no TravelOS.

---

## 1. Mapeamento de Entidades e Chaves

### 1.1 `public.financial_records`

- **Descrição**: Lançamentos operacionais de despesas, receitas ou transferências.
- **Chaves e Relações**:
  - `id`: `uuid` (PK)
  - `agency_id`: `uuid` (FK -> `public.agencies.id` ON DELETE CASCADE)
  - `trip_id`: `uuid` (FK -> `public.trips.id` ON DELETE SET NULL)
  - `created_by`: `uuid` (FK -> `auth.users.id` ON DELETE SET NULL)
- **Constraints**:
  - `financial_records_type_check`: `type` deve ser um de: `('income', 'expense', 'transfer')`
  - `financial_records_status_check`: `status` deve ser um de: `('pending', 'confirmed', 'cancelled')`
- **Políticas RLS**:
  - **Select/Insert/Update**: Permitido para membros da agência via `public.is_agency_member(auth.uid(), agency_id)`.
  - **Delete**: Permitido apenas para administradores da agência (`public.has_role(auth.uid(), 'agency_admin', agency_id)`).

### 1.2 `public.payment_plans` e `public.payment_installments`

- **Descrição**: Controle de parcelamento e quitações financeiras das propostas fechadas dos clientes.
- **Chaves e Relações**:
  - `payment_plans.trip_id`: `uuid` (FK -> `public.trips.id` ON DELETE CASCADE)
  - `payment_installments.payment_plan_id`: `uuid` (FK -> `public.payment_plans.id` ON DELETE CASCADE)
- **Constraints**:
  - `payment_plans.status`: `('active', 'paid', 'defaulted', 'cancelled')`
  - `payment_installments.status`: `('pending', 'paid', 'late', 'waived')`
  - `payment_installments.receipt_status`: `('none', 'pending', 'approved', 'rejected')`
- **Políticas RLS**:
  - Ambas as tabelas herdam políticas de membro da agência baseadas em `agency_id` (`public.is_agency_member(auth.uid(), agency_id)`). Exclusão reservada ao administrador (`agency_admin`).

### 1.3 `public.cash_registers`, `public.cash_sessions` e `public.cash_transactions`

- **Descrição**: Caixas operacionais (físicos e contas bancárias) e logs de transações de entrada/saída de caixa.
- **Chaves e Relações**:
  - `cash_registers.agency_id`: `uuid` (FK -> `public.agencies.id`)
  - `cash_sessions.cash_register_id`: `uuid` (FK -> `public.cash_registers.id`)
  - `cash_transactions.cash_session_id`: `uuid` (FK -> `public.cash_sessions.id`)
  - `cash_transactions.cash_register_id`: `uuid` (FK -> `public.cash_registers.id`)
- **Políticas RLS**:
  - RLS ativado com política uniforme de isolamento por `agency_id`. Consulta simplificada verifica se o `user_id` possui algum papel ativo associado àquela agência na tabela `public.user_roles`.

### 1.4 `public.trip_commissions` e `public.agent_commission_rules`

- **Descrição**: Parâmetros de comissionamento de vendas por viagem e faixas personalizadas de comissão por agente.
- **Chaves e Relações**:
  - `trip_commissions.trip_id`: `uuid` (FK -> `public.trips.id` - UNIQUE constraint)
  - `agent_commission_rules.user_id`: `uuid` (FK -> `public.profiles.id` - UNIQUE por agência)
- **Políticas RLS**:
  - **Regras de Comissão (`agent_commission_rules`)**:
    - Alteração e inserção: Apenas administradores (`agency_admin`).
    - Leitura: O próprio agente pode ver a sua regra específica (`user_id = auth.uid()`).
  - **Comissões por Viagem (`trip_commissions`)**:
    - Leitura e escrita: Membros ativos da agência.

---

## 2. Diagrama de Políticas RLS do Subsistema Financeiro

```mermaid
graph TD
    User((Usuário Autenticado)) -->|is_agency_member| DB[Tabelas Financeiras]
    User -->|has_role = agency_admin| AdminOnly[Configuração de Regras / Deleção]
    User -->|owner_id / user_id = auth.uid| AgentOnly[Visualizar Própria Regra / Extrato]

    subgraph Isolamento Multi-tenant (RLS)
        DB -->|financial_records| AgencyFilter[Filtrado por agency_id]
        DB -->|cash_transactions| AgencyFilter
        DB -->|trip_commissions| AgencyFilter
    end
```

---

## 3. Vulnerabilidades e Gaps de RLS Identificados

> [!WARNING]
>
> 1. **Políticas de Leitura de Contratos Públicos e Recibos**: RPCs como `public_payment_by_token` e `public_passenger_by_token` usam `SECURITY DEFINER` e expõem registros de forma anônima com base em `public_token`. É imperativo garantir que esses tokens sejam criptograficamente seguros (ex: gerados por UUID v4 de alta entropia) e que nenhuma rota ou tabela permita vazamento em massa.
> 2. **Isolamento de Views e RPCs Customizadas**: Algumas RPCs antigas podem omitir o filtro implícito de segurança de RLS se criadas com `SECURITY INVOKER` sem validação expressa do `agency_id` vindo de parâmetros validados. As novas RPCs devem adotar exclusivamente `SECURITY DEFINER` com validação de permissões no corpo da função de forma explícita.
