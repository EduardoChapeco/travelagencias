# Auditoria de Tratamento de Erros, Logs e Exceções

Este documento analisa as falhas de tratamento de erros e a falta de observabilidade na infraestrutura de IA e OCR do sistema, indicando as causas raiz de falhas em runtime.

---

## 1. Mapeamento de Falhas e Causas Raiz

| Categoria do Erro | Status HTTP | Causa Raiz | Impacto na Experiência do Usuário |
| :--- | :---: | :--- | :--- |
| **API Key Inválida (401)**| `401 Unauthorized` | Chaves cadastradas na UI expiram ou são inseridas incorretamente. Fallback global é acionado ou a chamada quebra. | Tela congela em estado de "carregamento" ou exibe mensagem genérica. |
| **Falta de Acesso (403)**| `403 Forbidden` | Usuário tenta enviar documento mas não possui o vínculo correto na tabela `user_roles` para o `agency_id`. | Processamento de OCR falha silenciosamente ou barra o agente. |
| **Estouro de Cota (429)** | `429 Too Many Requests`| Chaves de API gratuitas do Gemini/Groq estouram o limite por minuto (RPM) sob múltiplos uploads sequenciais. | O OCR falha na primeira tentativa e o usuário precisa reenviar o arquivo manualmente. |
| **Timeout (504)** | `504 Gateway Timeout`| PDFs grandes (mais de 10 páginas) demoram mais de 60s para serem parseados visualmente pelas APIs externas. | Conexão cai e o resultado da extração nunca é recebido pela UI. |
| **Falha de Parsing JSON** | `400 Bad Request` | O modelo retorna um JSON malformado (ex: com chaves extras ou texto explicativo fora da estrutura). | Falha no parseamento interno do Deno (`SyntaxError`). A requisição é perdida. |

---

## 2. Diagnóstico de Observabilidade e Logs

* **Ocultação de Erros**: Atualmente, a Edge Function captura exceções genéricas e devolve `{ error: error.message }` ao front-end. O erro retornado pelas APIs externas (como a mensagem de cota excedida do Gemini ou erro de pagamento do OpenAI) é mascarado, dificultando o debug em produção.
* **Falta de Rastreamento de Consumo (Tokens e Custos)**:
  * Não há persistência estruturada do consumo de tokens (`prompt_tokens`, `completion_tokens`) por agência ou por chamada.
  * O sistema não sabe quanto cada tenant gasta ou se atingiu o budget de uso diário.
* **Logs Não Estruturados**: As funções apenas usam `console.log` e `console.error` no terminal do Deno Cloud. Não há tabelas de auditoria como `ai_request_logs` ou `ai_job_attempts` no banco de dados operacional.
