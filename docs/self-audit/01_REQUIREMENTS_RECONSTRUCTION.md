# 01. Reconstrução dos Requisitos Originais

Este documento reconstrói as solicitações originais, os problemas de negócios identificados, as regras operacionais esperadas e os critérios de aceitação que guiaram o desenvolvimento dos módulos core auditados.

---

## 1. Módulo A — Motor de Decisão e Cotações VibeTour

### REQUISITO 1: Compreensão e Busca Inteligente (Quote Engine)
* **Origem**: PRD Master do Motor Inteligente de Cotação (VibeTour).
* **Domínio**: `VibeTour Quote Engine` / `CRM / Leads`.
* **Objetivo**: Receber um pedido de viagem em linguagem natural, extrair dados operacionais estruturados (TravelIntent) e gerar um plano de busca (SearchPlan) com cenários de testes lógicos no GDS.
* **Comportamento Esperado**:
  * O sistema deve processar a intenção extraindo datas, viajantes, orçamento e destinos.
  * Deve consultar a tabela `api_keys` para ver se existem chaves válidas. Em caso positivo, chama o conector real `infotravel-connector`. Caso contrário, ativa o fallback dinâmico gerando alternativas baseadas no orçamento real do lead.
  * O motor de regras deve ler perfis ativos na tabela `score_profiles` e avaliar cada opção de forma determinística, gravando resultados em `package_candidates` e `package_scorecards`.
  * O status do `quote_request` original deve transicionar para `completed`.

### REQUISITO 2: Conversão Atômica para Proposta (Zero Orfandade)
* **Origem**: PRD Master / Auditoria Sistemática.
* **Domínio**: `Proposal Studio` / `VibeTour Quote Engine`.
* **Objetivo**: Converter uma alternativa de pacote candidato aprovada em uma proposta comercial visual compartilhável de forma atômica e segura.
* **Comportamento Esperado**:
  * Toda a operação (criação da proposta, gravação de voos/hotéis e atualização do status da cotação para `completed`) deve ser realizada em uma transação única no banco de dados.
  * Falhas no meio do processo devem disparar rollback automático, impedindo propostas incompletas ou cotações sem rastreabilidade.

---

## 2. Módulo B — Canal Omnichannel, SLA e WhatsApp Oficial

### REQUISITO 3: Recepção Idempotente e Segura de Webhooks
* **Origem**: PRD / Migração 20260729000001.
* **Domínio**: `Omnichannel Inbox` / `WhatsApp Integration`.
* **Objetivo**: Integrar o webhook oficial da Meta API garantindo a validação HMAC da assinatura e impedindo a duplicidade de mensagens (idempotência) usando chaves exclusivas.
* **Comportamento Esperado**:
  * Validação rígida do cabeçalho `x-hub-signature-256` contra a chave secreta da agência.
  * Deduplicação das mensagens de entrada comparando o ID físico (`wamid`) retornado pela Meta.
  * Criação automática de leads e sessões omnichannel caso inexistentes no momento da chegada da mensagem.

### REQUISITO 4: Gerenciamento de SLA, Filas e Equipes
* **Origem**: Migração 20260729000001.
* **Domínio**: `Omnichannel Inbox` / `SLA Management`.
* **Objetivo**: Permitir a alocação de conversas para filas (`inbox_queues`) e equipes (`inbox_teams`), controlando estados de atribuição de agentes e segurança RLS rígida.
* **Comportamento Esperado**:
  * Agentes comuns só visualizam sessões atribuídas a eles ou de sua respectiva equipe que estejam na fila.
  * Administradores da agência visualizam todo o painel de atendimentos.

---

## 3. Módulo C — Fluxo de Caixa e Auditoria Inviolável

### REQUISITO 5: Caixa Diário (Abertura e Fechamento Operacional)
* **Origem**: PRD / Migração 20260628000000.
* **Domínio**: `Financial Cashier` / `Ledger`.
* **Objetivo**: Permitir que operadores abram e fechem expedientes de caixas físicos e contas bancárias, lançando entradas, saídas, conciliações B2B e vales de funcionários.
* **Comportamento Esperado**:
  * Abertura (`open_cash_session`) e fechamento (`close_cash_session`) coordenados via RPCs que recalculam saldos reais.
  * Auditoria física e inviolável (`cash_audit_logs`) alimentada por triggers automatizados de banco para registrar cada inserção, alteração ou exclusão nas tabelas de caixas.
