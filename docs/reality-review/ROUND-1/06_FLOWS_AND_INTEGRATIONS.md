# Rastreamento de Fluxos e Integrações (Turis)

Este documento descreve detalhadamente o rastreamento dos dois fluxos principais auditados neste round: Conciliação de Recibos e o Motor de Ações de Inteligência Artificial.

---

## 1. Rastreamento de Fluxos Ponta a Ponta

### 1.1 Fluxo: Conciliação Diária de Recibos Pix

Este fluxo rastreia a quitação de parcelas pelos viajantes até o fechamento contábil.

```mermaid
sequenceDiagram
    participant P as Portal do Viajante
    participant DB as Supabase Banco
    participant UI as Painel de Conciliação
    participant C as Caixa de Destino (cash_transactions)

    P->>DB: Upload de comprovante na parcela (receipt_status: pending)
    UI->>DB: Consulta parcelas pendentes (TanStack Query)
    DB-->>UI: Retorna parcelas
    UI->>UI: Operador analisa anexo (Signed URL)
    UI->>DB: Mutação: Aprova comprovante
    DB->>DB: Atualiza parcela para status: paid
    DB->>C: Insere registro de entrada de caixa
    UI->>UI: Recarrega caches (Refetch) e atualiza saldos
```

- **Rastreabilidade**:
  - **Etapa 1**: Inscrição / Upload -> Portal público (magic link token).
  - **Etapa 2**: Visualização -> Rota `/agency/$slug/financial/reconciliation`.
  - **Etapa 3**: Validação e Lançamento -> `approveReceipt.mutate` no frontend -> Insere em `cash_transactions` e atualiza `payment_installments` no banco.
  - **Estado**: **REAL PONTA A PONTA**

---

### 1.2 Fluxo: Motor de Ações do Chat de IA (Action Execution)

Este fluxo mapeia a interpretação de mensagens em linguagem natural convertendo em comandos de persistência de dados.

```mermaid
sequenceDiagram
    participant O as Operador (Chat UI)
    participant Fn as Server Function (sendAIChatMessage)
    participant LLM as OpenRouter / Gateway API
    participant UI as ChatBlockRenderer (Card de Confirmação)
    participant Exec as Server Function (executeAIChatAction)
    participant Audit as Tabela de Auditoria (audit_log)

    O->>Fn: Envia prompt em linguagem natural
    Fn->>LLM: Envia histórico + prompt + ferramentas (Tools Schema)
    LLM-->>Fn: Retorna texto explicativo + Tool Call JSON
    Fn-->>O: Retorna JSON de Tool Call e exibe Card
    O->>UI: Revisa dados e clica em "Confirmar"
    UI->>Exec: Dispara executeAIChatAction(agencyId, actionCode, payload)
    Exec->>Exec: Valida RBAC do operador e schema Zod
    Exec->>DB: Executa Insert / Update (Real ou Simulado)
    Exec->>Audit: Salva log transacional da ação
    Exec-->>O: Retorna sucesso e atualiza estado do Card na UI
```

- **Rastreabilidade**:
  - **Interpretação**: `sendAIChatMessage` (tanstack start service).
  - **Exibição do Card**: `ChatBlockRenderer.tsx` (ConfirmationCard).
  - **Confirmação e Execução**: `executeAIChatAction` (tanstack start service).
  - **Persistência**: `audit_log` e tabelas de CRM/Trips.
  - **Estado**: **PARCIAL** (Funciona ponta a ponta para ações do CRM como `create_lead`, mas simula com UUIDs aleatórios ações de cotação ou contratos).
