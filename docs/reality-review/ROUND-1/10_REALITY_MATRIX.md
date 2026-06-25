# Matriz de Verdade (Reality Matrix) — Rodada 1

Esta matriz sintetiza a verificação técnica final de cada funcionalidade do TravelOS, auditando a coerência entre as especificações e o estado real.

---

## 1. Matriz Contábil da Realidade

| Funcionalidade | Prometida | Código | UI | Banco | Integração | Segurança | Testada | Estado Real | Evidência |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- | :--- |
| **Livro-Razão Contábil (Ledger)** | Sim | Sim | Não | Sim | Não | Insegura | Sim | **SÓ BANCO** | Tabela e RLS criados na migração; sem fluxo de escrita ou leitura no app. |
| **Travas de Fechamento Contábil** | Sim | Sim | Não | Sim | Não | Ativa | Sim | **PARCIAL** | Trigger `enforce_closed_period_lock` operacional; sem tela de gerenciamento de período. |
| **Comissão Progressiva** | Sim | Sim | Não | Sim | Não | Ativa | Sim | **SÓ BANCO** | Funções matemáticas de escala marginal no banco; sem tela de parametrização. |
| **Conciliação Diária de Recibos** | Sim | Sim | Sim | Sim | Não | Ativa | Sim | **REAL PONTA A PONTA** | Eliminação completa do array `localPending`. |
| **Motor de Ações de IA (CRM/Leads)** | Sim | Sim | Sim | Sim | Sim | Ativa | Sim | **REAL PONTA A PONTA** | `ActionExecutor` insere leads e altera status do CRM com tool call real. |
| **Motor de Ações (Contratos/Vouchers)**| Sim | Sim | Sim | Não | Não | Ativa | Sim | **MOCK/SIMULADO** | Retorna mensagens estáticas e UUIDs simulados no execute. |
| **RAG Vetorial de Dúvidas** | Sim | Sim | Sim | Não | Não | Ativa | Não | **MOCK/SIMULADO** | Busca simples direta com limit 10 no chat, sem busca por similaridade. |
| **WebScraping de Concorrência** | Sim | Sim | Não | Não | Sim | Ativa | Sim | **REAL PONTA A PONTA** | Chamada HTTP ao `ai-orchestrator` sanitizando tags contra injeções. |

---

## 2. Contadores Consolidados

* **Reais ponta a ponta**: 3 (Conciliação Pix, Motor de Ações CRM/Leads, WebScraping)
* **Reais não testadas**: 0
* **Parciais**: 1 (Travas de Fechamento Contábil)
* **Só UI**: 0
* **Só banco**: 2 (Ledger Contábil, Cálculo de Comissão Progressiva)
* **Só backend**: 0
* **Mocks**: 2 (Motor de Ações de Contratos/Vouchers, RAG Vetorial de Dúvidas)
* **Quebradas**: 0
* **Inseguras**: 1 (Permissão de DELETE/UPDATE livre no Ledger Contábil)
* **Duplicadas**: 0
* **Legadas**: 0
* **Órfãs**: 0
* **Ausentes**: 0
