# Matriz de UI, Banco e Contratos de Dados (TravelOS)

Esta matriz mapeia o acoplamento entre os componentes de interface (UI), esquemas de validação, chaves de persistência e políticas de banco de dados para as principais interações do subsistema financeiro e de IA.

---

## 1. Matriz de Rastreabilidade

| Tela/Ação | Handler | Service | Banco | RLS | Persiste | Recarrega | Propaga | Estado |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Abertura de Caixa** (`CashPage`) | `openSession.mutate` | `rpc('open_cash_session')` | `cash_sessions` | Ativo (`is_agency_member`) | Sim | Sim (Invalidates query) | Sim | **REAL PONTA A PONTA** |
| **Fechamento de Caixa** (`CashPage`) | `closeSession.mutate` | `rpc('close_cash_session')` | `cash_sessions` | Ativo (`is_agency_member`) | Sim | Sim (Invalidates query) | Sim | **REAL PONTA A PONTA** |
| **Lançar Transação avulsa** (`CashPage`) | `addTransaction.mutate` | `.from('cash_transactions').insert()` | `cash_transactions` | Ativo (`is_agency_member`) | Sim | Sim (Invalidates query) | Sim | **REAL PONTA A PONTA** |
| **Conciliação de Comprovante** (`ReconciliationPage`) | `approveReceipt.mutate` | `.from('payment_installments').update()` | `payment_installments` / `cash_transactions` | Ativo (`is_agency_member`) | Sim | Sim (Invalidates query) | Sim | **REAL PONTA A PONTA** |
| **Visualizar DRE** (`DREPage`) | TanStack Query lookup | `rpc('calculate_dre_summary')` | `financial_records` (Select) | Ativo (`is_agency_member`) | Não (Apenas leitura) | Sim (On Period Toggle) | Não | **REAL PONTA A PONTA** |
| **Confirmar Ação da IA** (`AIChatPanel`) | `handleConfirmAction` | `executeAIChatAction` | Várias tabelas (CRM, Trips) | Ativo (`user_roles` membership) | Parcial (Varia por ActionCode) | Sim (Refetches chat messages) | Sim (Audit log entry) | **PARCIAL** (Mocks em metade das ações) |
| **Enviar Mensagem no Chat** (`AIChatPanel`) | `handleSendMessage` | `sendAIChatMessage` | `ai_chat_messages` / `audit_log` | Ativa (`user_roles` verification) | Sim | Sim (TanStack start RPC) | Sim (Scraper) | **REAL PONTA A PONTA** |
| **Feedbacks de Resposta IA** (`AIChatPanel`) | `submitFeedback` | `submitAIChatFeedback` | `ai_chat_feedback` | Ativa (`user_roles` check) | Sim | Não | Não | **REAL, MAS NÃO TESTADO** |

---

## 2. Inconsistências de Chaves e Gaps Técnicos

* **Falta de Validação de Cascade Contábil**: Se um registro em `financial_records` que serviu de fonte para um lançamento contábil em `financial_ledger_entries` for excluído ou sofrer soft-delete (`deleted_at`), não há nenhuma chave estrangeira (FK) na tabela contábil forçando integridade. A tabela de ledger (`financial_ledger_entries`) possui apenas o campo genérico `source_id` do tipo UUID sem integridade referencial física declarada (`REFERENCES`), o que permite órfãos.
* **Sobrescrita Silenciosa de Comprovantes**: O update em `payment_installments` feito pelo portal do viajante quando este anexa um novo comprovante substitui diretamente a coluna `receipt_url` anterior de forma silenciosa, sem manter um histórico dos comprovantes enviados anteriormente que foram rejeitados.
