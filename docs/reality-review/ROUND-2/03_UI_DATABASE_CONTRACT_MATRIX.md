# Matriz de UI, Banco e Contratos de Dados — Rodada 2 (Turis)

Este documento descreve o acoplamento técnico entre as interfaces visuais, os esquemas de validação do TypeScript e Zod, as mutations do TanStack Query e as tabelas correspondentes no banco de dados.

---

## 1. Matriz de Rastreabilidade Operacional

| Tela / Ação                    | Handler                        | Service                                                         | Banco                                                                              | RLS   | Persiste | Recarrega | Propaga | Estado                 |
| :----------------------------- | :----------------------------- | :-------------------------------------------------------------- | :--------------------------------------------------------------------------------- | :---- | :------: | :-------: | :-----: | :--------------------- |
| **Abertura de Caixa**          | `openSession.mutate`           | `rpc('open_cash_session')`                                      | `cash_sessions`                                                                    | Ativo |   Sim    |    Sim    |   Sim   | **REAL PONTA A PONTA** |
| **Fechamento de Caixa**        | `closeSession.mutate`          | `rpc('close_cash_session')`                                     | `cash_sessions`                                                                    | Ativo |   Sim    |    Sim    |   Sim   | **REAL PONTA A PONTA** |
| **Lançar Movimentação**        | `addTransaction.mutate`        | `.from('cash_transactions').insert()`                           | `cash_transactions`                                                                | Ativo |   Sim    |    Sim    |   Sim   | **REAL PONTA A PONTA** |
| **Conciliação de Comprovante** | `approveReceipt.mutate`        | `payment_installments` update + `financial_transactions` insert | `payment_installments` / `financial_transactions`                                  | Ativo |   Sim    |    Sim    |   Sim   | **REAL PONTA A PONTA** |
| **Recusa de Comprovante**      | `rejectReceiptMutation.mutate` | `payment_installments` update                                   | `payment_installments`                                                             | Ativo |   Sim    |    Sim    |   Sim   | **REAL PONTA A PONTA** |
| **Confirmar Ação de IA**       | `handleConfirm`                | `executeAIChatAction`                                           | Várias tabelas (`leads`, `trips`, `contracts`, `vouchers`, `visas`, `agent_tasks`) | Ativo |   Sim    |    Sim    |   Sim   | **REAL PONTA A PONTA** |
| **Enviar Mensagem no Chat**    | `handleSend`                   | `sendAIChatMessage`                                             | `ai_chat_messages` / `audit_log`                                                   | Ativa |   Sim    |    Sim    |   Sim   | **REAL PONTA A PONTA** |
| **Feedback de Mensagem**       | `handleFeedback`               | `submitAIChatFeedback`                                          | `ai_chat_feedback`                                                                 | Ativa |   Sim    |    Não    |   Não   | **REAL PONTA A PONTA** |

---

## 2. Inconsistências de Modelagem Identificadas

- **Ausência de FK Física no Ledger**: A tabela `financial_ledger_entries` declara o campo `source_id` como UUID puro, sem chave estrangeira (`REFERENCES`) vinculada às tabelas de origem (`financial_records` ou `cash_transactions`). Se um registro de origem for excluído do banco, o lançamento no ledger correspondente torna-se órfão sem validação de integridade física.
- **Mutabilidade do Ledger**: A RLS de `financial_ledger_entries` usa a política geral `FOR ALL`, que indevidamente permite que qualquer usuário autenticado com acesso à agência efetue exclusões físicas (`DELETE`) ou alterações (`UPDATE`) nos lançamentos contábeis. Isso viola a premissa de imutabilidade de um livro-razão e de compliance contábil.
- **DELETE irrestrito em seller_adjustments**: A política de RLS em `seller_adjustments` permite operações `DELETE` por qualquer membro comum da agência. Isso representa um risco de fraude de comissão (por exemplo, um agente apagando um desconto operacional lançado contra ele).
