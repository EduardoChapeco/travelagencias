# 06. Auditoria de Transações, Fluxos e Garantias de Banco

Este documento analisa as principais transações comerciais e operacionais do sistema, verificando suas garantias de atomicidade, controle de erros, concorrência e idempotência.

---

## 1. Fluxo A — Conversão de Cotação para Proposta (`convert_quote_to_proposal`)

### ESPECIFICAÇÃO COMPORTAMENTAL
* **Ação**: Conversão atômica de alternativa em proposta.
* **Ator**: Operador Comercial / Agente de Viagens.
* **Permissão**: Usuário autenticado, membro ativo da agência (`is_agency_member`).
* **Entrada**:
  ```ts
  p_quote_request_id: UUID
  p_proposal_payload: JSON
  p_owner_id: UUID
  ```
* **Processamento Transacional**: A RPC em PL/pgSQL executa dentro de um bloco `BEGIN ... EXCEPTION ... END`.
  1. Cria um registro na tabela `proposals`.
  2. Associa e insere voos e hotéis.
  3. Transiciona o status do `quote_request` para `completed` para disparar triggers de notificação.
* **Garantia de Rollback**: Se a inserção de voos falhar ou houver quebra de chaves estrangeiras, a transação inteira sofre rollback físico no PostgreSQL.
* **Idempotência**: O status da cotação original impede re-conversões duplicadas se verificado na UI, e a RPC é protegida contra re-execuções em cotações finalizadas.

---

## 2. Fluxo B — Recebimento de Webhooks WhatsApp (`whatsapp-webhook`)

### ESPECIFICAÇÃO COMPORTAMENTAL
* **Ação**: Ingestão e processamento de mensagens recebidas via WhatsApp Business API.
* **Ator**: Sistema Meta Cloud API (origem externa).
* **Permissão**: Verificação de HMAC (`x-hub-signature-256`) baseada na chave do app Meta.
* **Processamento Transacional**:
  1. Captura e valida assinatura.
  2. Localiza ou cria o Lead e a Sessão de chat.
  3. Verifica a duplicidade do `wamid` recebido no banco de dados.
  4. Insere o registro em `omnichannel_messages`.
* **Idempotência Física**: O índice exclusivo `omnichannel_messages_external_id_uidx` atua como barreira final física no banco contra repetições de webhook da Meta, disparando erro de violação de restrição de unicidade e impedindo mensagens duplicadas na UI.

---

## 3. Fluxo C — Abertura e Fechamento de Caixa Diário

### ESPECIFICAÇÃO COMPORTAMENTAL
* **Ação**: Abertura (`open_cash_session`) e Fechamento (`close_cash_session`) de expediente de caixa.
* **Ator**: Operador Financeiro / Administrador.
* **Permissão**: Membro da agência autenticado (`is_agency_member`).
* **Validação de Negócio**:
  * Não é permitido abrir uma nova sessão se já existir uma sessão aberta (`status = 'open'`) para o mesmo caixa.
  * O fechamento recalcula e consolida o saldo real com base nas movimentações.
* **Auditoria Física Inviolável**: As triggers `audit_cash_sessions_trigger` e `audit_cash_transactions_trigger` capturam as alterações e escrevem de forma transparente em `cash_audit_logs`, preservando o estado anterior (`old_data`) e o novo (`new_data`), o ID do operador executor e o timestamp preciso da modificação.
