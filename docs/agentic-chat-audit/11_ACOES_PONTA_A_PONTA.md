# Ações Ponta a Ponta

Este documento descreve quais ações comerciais propostas pela IA executam mutações e consultas reais no banco de dados da agência.

---

## 1. Mutações Ativas no Banco de Dados (Todas as 23 Ferramentas)

Todas as 23 ferramentas mapeadas no catálogo realizam chamadas completas de persistência e consulta no PostgreSQL da agência, validadas pelo `ActionExecutor`:

### CRM Domain
* **Criar Lead (`create_lead`)**: Consulta o estágio padrão na tabela `lead_stages` e insere o lead em `leads`.
* **Atualizar Lead (`update_lead`)**: Atualiza os dados cadastrais (nome, e-mail, telefone, destino, notas) do lead em `leads`.
* **Alterar Estágio (`change_lead_stage`)**: Altera semanticamente o estágio de vendas do lead com fallbacks dinâmicos em `leads`.
* **Criar Cliente (`create_client`)**: Insere dados pessoais do cliente em `clients`.

### Trips Domain
* **Adicionar Viajante (`add_traveler`)**: Vincula passageiros à viagem na tabela `trip_passengers`.
* **Atualizar Viajante (`update_traveler`)**: Atualiza informações de cadastro do passageiro em `trip_passengers`.
* **Iniciar Cotação (`start_quote`)**: Cria uma cotação/orçamento em rascunho na tabela `proposals`.
* **Criar Proposta (`create_proposal`)**: Converte a cotação em proposta comercial com valores totais na tabela `proposals`.
* **Adicionar Hotel (`add_hotel`)**: Localiza o voucher manual da viagem na tabela `vouchers` e atualiza a coluna JSONB `accommodation` adicionando os dados do hotel (nome, check-in, check-out, localizador). Se não existir, cria o voucher com a acomodação.
* **Adicionar Voo (`add_flight`)**: Localiza o voucher manual em `vouchers` e atualiza a coluna JSONB `flights` com o trecho aéreo (airline, número, origem, destino, tempos, localizador). Se não existir, cria o voucher.
* **Criar Viagem (`create_trip`)**: Insere a viagem em `trips` a partir dos totais e cliente da proposta, e atualiza o status da proposta correspondente para `"converted"`.
* **Consultar Viagem (`query_trip`)**: Realiza busca textual na tabela `trips` retornando detalhes operacionais em tempo real.

### Operational & Support Domain
* **Criar Tarefa (`create_task`)**: Insere tarefas de agentes na tabela `agent_tasks` (associação opcional de `trip_id`).
* **Criar Ticket (`create_ticket`)**: Abre chamados de suporte técnico/pós-venda na tabela `support_tickets`.
* **Consultar Fornecedor (`query_supplier`)**: Busca fornecedores cadastrados na tabela `suppliers`.
* **Consultar Grupos (`query_groups`)**: Consulta excursões ou fretamentos na tabela `group_tours`.
* **Atualizar Rooming (`update_rooming`)**: Atualiza o mapa de acomodações (`seat_map`) na tabela `group_tours`.

### Financial Domain
* **Registrar Pagamento (`register_payment`)**: Insere transações e receitas financeiras confirmadas na tabela `financial_records`.
* **Consultar Parcelas (`query_installments`)**: Consulta o plano financeiro da viagem e retorna a lista de parcelas ativas em `payment_installments` / `payment_plans`.
* **Gerar Relatório (`generate_report`)**: Realiza contagem e agrupamento de viagens no período solicitado na tabela `trips`.

### Documents Domain
* **Gerar Contrato (`generate_contract`)**: Obtém a proposta a partir da viagem cadastrada em `trips`, carrega os totais e notas de `proposals`, e gera o contrato oficial na tabela `contracts`.
* **Gerar Voucher (`generate_voucher`)**: Cria o cabeçalho e rascunho de voucher oficial em `vouchers` com o template visual padrão.
* **Iniciar OCR (`start_ocr`)**: Cria um job de processamento de documento inteligente na tabela `ai_jobs` para análise pela Edge Function.

---

## 2. Matriz de Mutações Atualizada

Todas as ações foram migradas de simuladas para conexões reais com o banco de dados:

| Código da Ação | Escrita Real | Tabela Destino | Validação Zod | Logs Gravados |
| :--- | :--- | :--- | :--- | :--- |
| `create_lead` | Sim | `public.leads` | Sim | Sim (`audit_log`) |
| `update_lead` | Sim | `public.leads` | Sim | Sim (`audit_log`) |
| `change_lead_stage` | Sim | `public.leads` | Sim | Sim (`audit_log`) |
| `create_client` | Sim | `public.clients` | Sim | Sim (`audit_log`) |
| `add_traveler` | Sim | `public.trip_passengers` | Sim | Sim (`audit_log`) |
| `update_traveler` | Sim | `public.trip_passengers` | Sim | Sim (`audit_log`) |
| `start_quote` | Sim | `public.proposals` | Sim | Sim (`audit_log`) |
| `create_proposal` | Sim | `public.proposals` | Sim | Sim (`audit_log`) |
| `add_hotel` | Sim | `public.vouchers` | Sim | Sim (`audit_log`) |
| `add_flight` | Sim | `public.vouchers` | Sim | Sim (`audit_log`) |
| `create_trip` | Sim | `public.trips` | Sim | Sim (`audit_log`) |
| `query_trip` | Consulta Real | `public.trips` | Sim | Sim (`audit_log`) |
| `create_task` | Sim | `public.agent_tasks` | Sim | Sim (`audit_log`) |
| `create_ticket` | Sim | `public.support_tickets` | Sim | Sim (`audit_log`) |
| `register_payment` | Sim | `public.financial_records` | Sim | Sim (`audit_log`) |
| `query_installments` | Consulta Real | `public.payment_installments` | Sim | Sim (`audit_log`) |
| `generate_contract` | Sim | `public.contracts` | Sim | Sim (`audit_log`) |
| `generate_voucher` | Sim | `public.vouchers` | Sim | Sim (`audit_log`) |
| `query_supplier` | Consulta Real | `public.suppliers` | Sim | Sim (`audit_log`) |
| `start_ocr` | Sim | `public.ai_jobs` | Sim | Sim (`audit_log`) |
| `query_groups` | Consulta Real | `public.group_tours` | Sim | Sim (`audit_log`) |
| `update_rooming` | Sim | `public.group_tours` | Sim | Sim (`audit_log`) |
| `generate_report` | Consulta Real | `public.trips` | Sim | Sim (`audit_log`) |
