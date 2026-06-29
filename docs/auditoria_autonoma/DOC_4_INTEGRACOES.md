# ARQUITETURA DE INTEGRAÇÕES
## Instrução: Preencher durante auditoria. Atualizar quando integrações mudam.

| Módulo Origem | Módulo Destino | Campo de Vínculo | Tipo | Direção | Status |
|---------------|----------------|-----------------|------|---------|--------|
| **Trips (Viagens)** | **Financeiro (Records)** | `trip_id` em `financial_records` | Provisões Contábeis | Trips -> Financeiro | ✅ OK (Provisão e Partidas Dobradas alinhadas) |
| **Trips (Viagens)** | **Financeiro (Installments)**| `payment_plan_id` / `trip_id` | Contas a Receber | Trips -> Financeiro | ✅ OK (Pagamento manual gera transação de caixa e liquida contas a receber) |
| **Reconciliação** | **Financeiro (Transactions)**| `cash_register_id`, `payment_installment_id`, `trip_id` | Conciliação via UI | Reconciliação -> Caixa | ✅ OK (Vincula transação contábil e liquida contas a receber no Ledger) |
| **Grupos & Pacotes** | **Financeiro (Transactions)** | `trip_id` em `cash_transactions` | Fluxo de Caixa de Aprovação | Grupos -> Caixa | ✅ OK (RPC approve_group_enrollment gera transação de caixa automática) |
| **Grupos & Pacotes** | **Frota/Bus Layouts** | `bus_layout_id` em `group_tours` | Mapa de Assentos | Grupos -> Frota | ✅ OK (Seat grid resiliência fallbacks) |
| **Trips (Viagens)** | **Financeiro (Transactions)**| `is_third_party=false` em `payment_installments` | Isolamento de Caixa | Trips -> Caixa | ✅ OK (Parcelas externas não sujam o caixa oficial. Visualizadas na aba "Faturamento Operadoras") |
| **Chatbots (Mapeador)** | **Database (chatbot_flows)** | `agency_id` em `chatbot_flows` | Definição de Fluxo JSON | Editor -> Supabase | ✅ OK (Salva e recupera definição estrita JSON via ReactFlow) |
| **Admin Portal** | **Database (System Tables)** | Consultas globais (agencies, bills, logs) | Gestão e Auditoria | Admin -> Supabase | ✅ OK (Protegido por permissão super_admin; erros assíncronos tratados visualmente) |
