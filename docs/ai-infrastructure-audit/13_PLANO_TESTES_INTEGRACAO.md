# Plano de Testes de Integração e Cenários de Validação

Este documento estabelece o plano de testes e cenários obrigatórios a serem executados com dados artificiais (mocks de arquivos e payloads) para comprovar a segurança, isolamento e resiliência do orquestrador de IA.

---

## 1. Cenários de Testes de Credenciais e Roteamento

### T01: Validação de Credenciais
* **Cenário**: Submeter requisição usando chave de API válida cadastrada para a agência.
* **Resultado Esperado**: O orquestrador descriptografa a chave em memória, executa a chamada no Gemini e retorna sucesso.

### T02: Bloqueio de Chave Inválida
* **Cenário**: Enviar uma chave de API que retorna `401 Unauthorized` da API externa.
* **Resultado Esperado**: O orquestrador detecta o status 401, marca a chave como `invalid` no banco (`ai_api_credentials.status = 'invalid'`), dispara um alerta no console e não tenta usá-la nas requisições seguintes.

### T03: Fallback de Rate Limit (429)
* **Cenário**: Hitar a cota RPM de uma chave (retorno `429 Too Many Requests`).
* **Resultado Esperado**: O orquestrador intercepta o erro 429, marca a credencial em `cooldown_until` (+5 minutos), seleciona a próxima chave com maior prioridade da agência e executa a tarefa com sucesso.

### T04: Coexistência de Chaves Cruzadas (Segurança)
* **Cenário**: Agente da Agência A tenta forçar a execução de um job passando o `agency_id` da Agência B no body.
* **Resultado Esperado**: O orquestrador bloqueia a requisição com `403 Forbidden` na checagem de membership contra a tabela `user_roles`.

---

## 2. Cenários de Testes de Ingestão de OCR e Parsing

### T05: Upload de PDF Grande
* **Cenário**: Enviar um PDF com mais de 30 páginas ou 15MB.
* **Resultado Esperado**: O orquestrador recusa o processamento síncrono imediato com `413 Payload Too Large` e instrui o frontend a iniciar um processamento assíncrono (Job ID) com fatiamento de páginas.

### T06: JSON Parser Sanitizer
* **Cenário**: Provedor retorna markdown com texto extra (ex: "Aqui está o JSON que você pediu: ```json { ... } ```").
* **Resultado Esperado**: O `ResponseValidator` limpa as tags markdown de forma robusta, valida a estrutura JSON contra o schema obrigatório da feature e retorna o objeto formatado.

### T07: Duplo Clique (Idempotência)
* **Cenário**: O usuário clica rapidamente duas vezes no botão de upload do mesmo voucher.
* **Resultado Esperado**: O backend calcula o hash `sha256` do arquivo. O segundo request reconhece o job em andamento (ou concluído) via chave de idempotência e retorna a mesma resposta sem duplicar chamadas de API externas.
