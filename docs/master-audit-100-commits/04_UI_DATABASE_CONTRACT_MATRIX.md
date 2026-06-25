# 04. Matriz UI ↔ Contratos ↔ Banco de Dados

Este documento mapeia o fluxo completo das transações críticas do TravelOS, rastreando desde o evento disparado no frontend até a persistência física no banco de dados e auditoria contábil.

---

## 1. Rastreamento de Fluxos Transacionais

### 1.1 Conciliação Bancária de Comprovante Pix

- **UI & Evento**: Clique em "Aprovar Recibo" em `PaymentReceiptModal.tsx` acionando o handler `handleApprove`.
- **Validação & Mutation**: `approveReceipt.mutate` enviando o id da parcela.
- **Service & Banco**: Chamada ao PostgREST na tabela `payment_installments` atualizando o `status` para `paid` e a data de pagamento, seguida da inserção em `cash_transactions` e `financial_ledger_entries` (via triggers de banco).
- **RLS & Auditoria**: RLS valida se o usuário é membro ativo da agência do lançamento. A trigger contábil escreve o débito/crédito no ledger e grava na tabela `audit_log`.
- **Retorno, Cache e Propagação**: O query client do TanStack invalida `payment-installments` e `cash-registers`, recarregando os saldos e refletindo em tempo real no extrato e DRE.

### 1.2 Aceite Eletrônico de Reacomodação Aérea (Cliente B2C)

- **UI & Evento**: Clique em "Confirmar Aceite da Nova Malha" em `client.trips.$id.tsx` acionando `handleAccept`.
- **Validação & Mutation**: Validação Zod da assinatura digitada (nome completo) e verificação dos três checkboxes de consentimento. Dispara `saveCustomerDecision.mutate` com o payload de telemetria.
- **Service & Banco**: O service `saveCustomerDecision` em `reaccommodation.ts` grava um registro na tabela `customer_travel_decisions` contendo a telemetria (IP, User Agent, Hash de Integridade do PDF de termos aceitos).
- **RLS & Auditoria**: RLS valida que o usuário autenticado corresponde ao `client_id` da viagem. A trigger de fechamento executa `resolveChangeCase` atualizando o status do voo em `flight_itineraries` e alterando `trips.lifecycle_status` para `confirmed`.
- **Retorno, Cache e Propagação**: O portal móvel e o dashboard da agência são atualizados via refetch do TanStack Query. O voucher e o guia offline são marcados como "desatualizados" na tabela `trip_documents`.

---

## 2. Matriz Geral de CRUDs e Ações Críticas

| Tela / Ação             | Handler               | Service                | Schema Zod          | Banco de Dados                                 |  RLS Ativa?  | Persiste?  | Recarrega? | Propaga? | Estado             |
| :---------------------- | :-------------------- | :--------------------- | :------------------ | :--------------------------------------------- | :----------: | :--------: | :--------: | :------: | :----------------- |
| **Aprovação de Pix**    | `handleApprove`       | `approveReceipt`       | N/A                 | `payment_installments` / `cash_transactions`   |     Sim      |    Sim     |    Sim     |   Sim    | REAL PONTA A PONTA |
| **Criar Lead via IA**   | `executeAIChatAction` | `executeAIChatAction`  | `createLeadSchema`  | `leads` / `audit_log`                          |     Sim      |    Sim     |    Sim     |   Sim    | REAL PONTA A PONTA |
| **Aceite Reacomodação** | `handleAccept`        | `saveCustomerDecision` | `decisionSchema`    | `customer_travel_decisions`                    |     Sim      |    Sim     |    Sim     |   Sim    | REAL PONTA A PONTA |
| **Exportar Rooming**    | `onExportPdf`         | `exportRoomingListPdf` | N/A                 | Local download (`jspdf`)                       | Sim (select) |    N/A     |    Não     |   Não    | REAL PONTA A PONTA |
| **Revisar Destino**     | `handleToggleReview`  | PostgREST `.update()`  | N/A                 | `destination_info` / `destination_review_logs` |     Sim      |    Sim     |    Sim     |   Sim    | REAL PONTA A PONTA |
| **Fechar Período**      | `handleClosePeriod`   | PostgREST `.insert()`  | N/A                 | `monthly_closing_periods`                      |     Sim      |    Sim     |    Sim     |   Sim    | REAL PONTA A PONTA |
| **Criar Visto Real**    | `executeAIChatAction` | `executeAIChatAction`  | `createVisaSchema`  | `visas` / `visa_stages`                        |     Sim      |    Sim     |    Sim     |   Sim    | REAL PONTA A PONTA |
| **Gerar Contrato Real** | `executeAIChatAction` | `executeAIChatAction`  | `genContractSchema` | `contracts`                                    |     Sim      |    Sim     |    Sim     |   Sim    | REAL PONTA A PONTA |
| **Abrir Caixa**         | `handleOpenRegister`  | `openCashSession`      | N/A                 | `cash_sessions` / `cash_registers`             |     Sim      |    Sim     |    Sim     |   Sim    | REAL PONTA A PONTA |
| **Faturamento Grupos**  | `handleSearch`        | `fetchGroupSummary`    | N/A                 | `group_tours_financial_summary` (View)         |     Sim      | N/A (view) |    Sim     |   Sim    | REAL PONTA A PONTA |
