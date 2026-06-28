# 05. WhatsApp Webhook and Sender (Webhook e Emissor do WhatsApp)

## 1. Webhook Oficial (`whatsapp-webhook`)
O webhook atual precisa ser robustecido:
* **GET (Verificação):** O verify token agora deve ser validado buscando na tabela `whatsapp_connections` onde `status = 'active'` e `verify_token_reference = <token>`.
* **POST (Eventos):**
  * O webhook deve ler o header `x-hub-signature-256` e validar o hash HMAC-SHA256 do payload bruto utilizando o segredo configurado.
  * Deve persistir o evento original em uma tabela de auditoria/logs de webhook (`meta_webhook_events`) antes do processamento pesado.
  * O processamento deve normalizar a mensagem inbound (texto, imagem, áudio, localização) e injetá-la na tabela canônica `messages` vinculada à `conversations` e `contacts`.

## 2. Emissor Oficial (`whatsapp-sender`)
O emissor é disparado por uma trigger de banco após a inserção de uma mensagem em `messages` onde `direction = 'outbound'` e `status = 'queued'`.
* **Segurança:** O token de acesso deve ser descriptografado com segurança antes da chamada ou obtido a partir de uma referência segura.
* **Envio:** Chama a Graph API com o payload normalizado.
* **Status Tracking:** Quando o envio retorna com sucesso, atualiza a mensagem para `sent` e grava o `external_id` (wamid) retornado pela Meta para acompanhar as confirmações de `delivered` e `read` posteriores via webhook.
