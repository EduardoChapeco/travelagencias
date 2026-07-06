# Rastreamento de Fluxos e Integrações — Rodada 2 (Turis)

Este documento detalha o rastreamento técnico de fluxos ponta a ponta e integrações externas no ecossistema do Turis.

---

## 1. Fluxo de Conciliação Diária de Recibos Pix

Este fluxo envolve a auditoria física de depósitos enviados por clientes até a efetivação no caixa/banco da agência.

```mermaid
sequenceDiagram
    participant T as Viajante (Portal B2C)
    participant DB as Banco de Dados (Supabase)
    participant UI as Painel de Conciliação (ReconciliationPage)
    participant C as Lançamentos de Caixa (financial_transactions)

    T->>DB: Faz upload de comprovante na parcela (receipt_status: pending)
    UI->>DB: Consulta parcelas pendentes com status 'pending' via TanStack Query
    DB-->>UI: Retorna lista de parcelas
    UI->>UI: Operador visualiza imagem do comprovante (Signed URL)
    UI->>DB: Mutação: approveReceipt.mutate(receiptId, registerId, sessionId)
    DB->>DB: Atualiza payment_installments (status: paid, receipt_status: approved)
    DB->>C: Insere entrada em financial_transactions vinculando caixa/sessão e código
    UI->>UI: Invalida caches do React Query e atualiza saldos em tempo real
```

- **Rastreabilidade**:
  - **Visualização**: Rota `/agency/$slug/financial/reconciliation`.
  - **Persistência**: `approveReceipt.mutate` no frontend -> executa updates em `payment_installments` e inserts em `financial_transactions`.
  - **Conclusão**: **REAL PONTA A PONTA**.

---

## 2. Fluxo do Motor de Ações do Chat de IA (Action Execution)

Mapeia o processamento de texto em linguagem natural convertendo em chamadas de escrita estruturadas nas tabelas de negócios da plataforma.

```mermaid
sequenceDiagram
    participant O as Operador (Chat UI)
    participant Fn as Server Function (sendAIChatMessage)
    participant API as OpenAI/OpenRouter (Gemini-2.5)
    participant UI as ChatBlockRenderer (Card de Confirmação)
    participant Exec as Server Function (executeAIChatAction)
    participant Audit as Tabela de Auditoria (audit_log)

    O->>Fn: Envia prompt (ex: "Cadastre lead Maria interessada em Tailândia")
    Fn->>API: Envia histórico + prompt + esquemas de ferramentas (Zod mappings)
    API-->>Fn: Retorna texto comercial + JSON de Tool Call
    Fn-->>O: Exibe mensagem no chat e renderiza Card de Confirmação
    O->>UI: Revisa parâmetros e clica em "Confirmar"
    UI->>Exec: Dispara executeAIChatAction(agencyId, actionCode, payload)
    Exec->>Exec: Valida permissões RBAC e schemas Zod do input
    Exec->>DB: Insere ou atualiza registros reais na tabela correspondente (ex: leads)
    Exec->>Audit: Insere registro de trilha de auditoria (audit_log)
    Exec-->>O: Retorna sucesso e exibe resultado verde no Card do chat
```

- **Rastreabilidade**:
  - **Chamador**: `AIChatPanel.tsx` -> `sendAIChatMessage` em `ai-chat.functions.ts`.
  - **Card de Consentimento**: `ChatBlockRenderer.tsx` (`ConfirmationCard`).
  - **Execução Contábil/Operacional**: `executeAIChatAction` em `ActionExecutor.ts`.
  - **Conclusão**: **REAL PONTA A PONTA** (As ações de geração de rascunhos de contratos e vouchers agora inserem dados físicos no banco local nas tabelas `contracts` e `vouchers`, em vez de simularem com UUIDs aleatórios em memória).
