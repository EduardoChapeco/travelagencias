# Baseline do Sistema — Rodada 2 (TravelOS)

Este documento define a linha de base tecnológica, bibliotecas principais e estado da infraestrutura de código do TravelOS para a rodada 2 da auditoria forense.

---

## 1. Stack Tecnológica Base

- **Frontend**: React 18, TypeScript, Vite, TailwindCSS (configurações do Lovable), TanStack Router & TanStack Query.
- **Backend**: Server Functions do TanStack Start/React Start, Supabase (PostgreSQL), Edge Functions do Supabase.
- **Segurança / Auth**: Supabase Auth com RBAC gerenciado em `public.user_roles` e `public.profiles`.
- **Mime / Storage**: Buckets privados do Supabase Storage gerenciados com assinaturas de curto prazo.

---

## 2. Inventário de Arquivos do Projeto (Estrutura Principal)

- **[src/routes/](file:///c:/Users/Excel%C3%AAncia%20Tour%20SMO/.gemini/antigravity-ide/scratch/travelagencias/src/routes/)**: Rotas do TanStack Router.
- **[src/components/](file:///c:/Users/Excel%C3%AAncia%20Tour%20SMO/.gemini/antigravity-ide/scratch/travelagencias/src/components/)**: Componentes visuais.
- **[src/lib/](file:///c:/Users/Excel%C3%AAncia%20Tour%20SMO/.gemini/antigravity-ide/scratch/travelagencias/src/lib/)**: Lógica de inteligência artificial (`ActionRegistry.ts`, `ActionExecutor.ts`, `AgentRouter.ts`) e hooks transversais de agência.
- **[supabase/migrations/](file:///c:/Users/Excel%C3%AAncia%20Tour%20SMO/.gemini/antigravity-ide/scratch/travelagencias/supabase/migrations/)**: Arquivos de migração SQL físicos que refletem a evolução do banco de dados na produção.

---

## 3. Estado Físico do Banco de Dados

O banco de dados é hospedado no Supabase. O esquema `public` contém:

- **Tabelas de Negócios**: `leads`, `clients`, `trips`, `trip_passengers`, `proposals`, `vouchers`, `contracts`, `suppliers`, `group_tours`, `group_tour_enrollments`, `group_tour_costs`, `boarding_cards`, `support_tickets`, `agent_tasks`.
- **Tabelas Financeiras (Legadas)**: `financial_records`, `payment_plans`, `payment_installments`.
- **Tabelas Financeiras (Ledger Alvo)**: `financial_ledger_entries`, `financial_categories`, `seller_commission_plans`, `seller_commission_tiers`, `seller_adjustments`, `monthly_closing_periods`, `cash_registers`, `cash_sessions`, `cash_transactions`, `invoices`.
- **Tabelas de Auditoria**: `audit_log`, `ai_rate_limit`, `ai_chat_messages`, `ai_chat_feedback`, `ai_agency_memories`.
