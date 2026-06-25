# Matriz de Realidade — Rodada 2 (TravelOS)

Este documento detalha o estado real constatado de cada funcionalidade planejada ou implementada no sistema TravelOS.

---

## 1. Tabela Comparativa de Realidade

| Funcionalidade | Prometida | Código | UI | Banco | Integração | Segurança | Testada | Estado Real | Evidência |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- | :--- |
| **Livro-Razão Contábil (Ledger)** | Sim | Sim | Não | Sim | Não | Insegura | Sim | **SÓ BANCO** | Tabela e políticas ativas no banco; sem código no frontend/server functions para utilizá-la. |
| **Travas de Fechamento Contábil** | Sim | Sim | Não | Sim | Não | Ativa | Sim | **PARCIAL** | Trigger `enforce_closed_period_lock` operando; sem tela de gerenciamento de períodos na UI. |
| **Comissão Progressiva** | Sim | Sim | Não | Sim | Não | Ativa | Sim | **SÓ BANCO** | Funções de cálculo e gatilho ativos no banco; sem interface de parametrização de faixas e planos. |
| **Conciliação de Comprovantes Pix** | Sim | Sim | Sim | Sim | Sim | Ativa | Sim | **REAL PONTA A PONTA** | Eliminação completa do mock `localPending`; mutations efetuam quitações e lançamentos reais. |
| **Motor de Ações de IA (CRM/Leads)** | Sim | Sim | Sim | Sim | Sim | Ativa | Sim | **REAL PONTA A PONTA** | `ActionExecutor.ts` cadastrado com Zod schemas; mutations inserem leads e alteram estágio no funil. |
| **Motor de Ações (Contracts/Vouchers)**| Sim | Sim | Sim | Sim | Sim | Ativa | Sim | **REAL PONTA A PONTA** | `ActionExecutor.ts` atualizado localmente efetuando inserts reais em `contracts` e `vouchers`. |
| **Busca Semântica de IA (RAG)** | Sim | Sim | Sim | Não | Não | Ativa | Não | **MOCK/SIMULADO** | Chat executa um SELECT direto limit 10 na tabela `ai_agency_memories`, ignorando a RPC de cosseno. |
| **WebScraping de Concorrência** | Sim | Sim | Não | Não | Sim | Ativa | Sim | **REAL PONTA A PONTA** | Chamadas à Edge Function `ai-orchestrator` sanitizando tags XML para segurança. |
| **Feedbacks do Chat de IA** | Sim | Sim | Sim | Sim | Sim | Ativa | Sim | **REAL PONTA A PONTA** | Painel possui botões de utilidade que gravam na tabela `ai_chat_feedback` no banco. |
| **Abertura/Fechamento de Caixa** | Sim | Sim | Sim | Sim | Sim | Ativa | Sim | **REAL PONTA A PONTA** | Interface de fluxo de caixa conectada a RPCs reais de abertura/fechamento de expediente. |

---

## 2. Contadores Consolidados de Realidade

* **Reais ponta a ponta**: 7 (Conciliação Pix, Motor de Ações CRM/Leads, Motor de Ações Contratos/Vouchers, WebScraping, Feedbacks do Chat, Abertura/Fechamento de Caixa, Movimentações avulsas)
* **Reais não testadas**: 0
* **Parciais**: 1 (Travas de Fechamento Contábil)
* **Só UI**: 0
* **Só banco**: 2 (Ledger Contábil, Cálculo de Comissão Progressiva)
* **Só backend**: 0
* **Mocks / Simuladas**: 1 (RAG Vetorial de Dúvidas)
* **Quebradas**: 0
* **Inseguras**: 2 (RLS em `financial_ledger_entries` permitindo UPDATE/DELETE; `seller_adjustments` permitindo DELETE para agentes)
