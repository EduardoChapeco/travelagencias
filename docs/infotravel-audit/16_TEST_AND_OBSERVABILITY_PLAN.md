# 16. Plano de Testes e Observabilidade

Este documento apresenta a estratégia de **Observabilidade** e o plano de **Testes Automatizados** para a integração **Infotravel/Infotera**, garantindo monitoramento e detecção precoce de falhas de comunicação com o GDS em produção.

---

## 1. Módulo de Observabilidade e Telemetria de Transações

Toda chamada de API efetuada pelo adaptador Infotravel deve ser registrada na tabela de logs de transações `public.api_transaction_logs` no PostgreSQL para permitir auditoria e depuração.

### 1.1. Campos Mapeados no Log de Telemetria
* `request_id`: Identificador único UUID de rastreamento para agrupar chamadas correlacionadas.
* `agency_id`: Identificador da agência executora da consulta.
* `user_id`: Operador responsável pela ação.
* `endpoint`: Caminho físico acessado (ex: `/api/v1/avail/hotel`).
* `method`: Método HTTP utilizado (GET, POST, etc.).
* `duration_ms`: Tempo total de resposta do servidor da Infotravel em milissegundos.
* `http_status`: Código de status HTTP retornado (200, 429, 500, etc.).
* `error_code`: Código de erro normalizado pelo adaptador.
* `request_payload_hash`: Hash SHA-256 do corpo da requisição para auditoria sem expor dados confidenciais.
* `response_payload_hash`: Hash SHA-256 da resposta.

### 1.2. Regra Estrita: Mascaramento de Dados Sensíveis
O coletor de logs é programado no lado do servidor para **nunca** salvar credenciais, senhas em texto limpo, tokens JWT ou dados sensíveis de pagamento (números de cartões de crédito) nos logs do console ou do banco de dados. Os campos `password`, `key_value` e `cvv` são limpos ou substituídos pela string `[MASKED]` antes da escrita física no banco.

---

## 2. Matriz de Testes Automatizados (Playwright)

A suíte de testes de integração do Playwright sob o diretório `tests/e2e/` deve cobrir os seguintes cenários críticos antes da homologação final:

### 2.1. Testes de Autenticação e Conectividade
* **Cenário 1: Sucesso de Conexão**: Insere credenciais de teste válidas, dispara `infotravelTestConnection` e valida o retorno `success = true`.
* **Cenário 2: Credenciais Inválidas**: Simula erro de credenciais incorretas e valida se o sistema retorna erro amigável de conexão sem expor senhas.
* **Cenário 3: Token Expirado**: Simula o recebimento de erro 401 e valida se o conector renova o token JWT automaticamente e completa a chamada original.

### 2.2. Testes de Disponibilidade e Tarifas
* **Cenário 4: Busca de Hotéis/Voos**: Dispara buscas com filtros complexos (idades de crianças) e valida se a resposta é mapeada corretamente para `NormalizedOffer`.
* **Cenário 5: Timeout e Throttling**: Simula atraso na resposta da API superior a 15 segundos e valida se a UI exibe o fallback de preenchimento manual graciosamente.

### 2.3. Testes de Segurança (Isolamento de Tenants)
* **Cenário 6: Tentativa de IDOR de Credenciais**: Usuário autenticado na Agência A tenta forçar uma busca utilizando o `agencyId` da Agência B. O teste valida se o PostgreSQL aborta a operação e retorna `403 Forbidden` nas Edge Functions.
