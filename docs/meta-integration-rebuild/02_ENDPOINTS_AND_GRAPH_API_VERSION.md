# 02. Endpoints and Graph API Version (Endpoints e Versão da API Graph)

## 1. Versão da API Graph
A versão padrão utilizada nas requisições da Meta é a **v21.0** (declarada em `whatsapp-sender`) e **v19.0** (definida como default na coluna `graph_api_version` da tabela `whatsapp_connections`).
* **Correção:** Vamos centralizar o consumo em uma constante única e versionada compatível com as regras vigentes da Meta.

## 2. Matriz de Endpoints Utilizados no Sistema
* **Autenticação / OAuth:**
  * Inexistente no código. Falta implementar o Token Exchange Endpoint para trocar o OAuth authorization code por um token de acesso de longa duração.
* **WhatsApp Cloud API:**
  * `POST https://graph.facebook.com/v21.0/{phone_number_id}/messages`: Usado para enviar mensagens (texto e mídia) ao cliente.
* **Business Management API / Discovery:**
  * Inexistentes no código. Precisamos de:
    * `GET https://graph.facebook.com/v21.0/{business_id}/owned_businesses`
    * `GET https://graph.facebook.com/v21.0/{business_id}/client_whatsapp_business_accounts`
    * `POST https://graph.facebook.com/v21.0/{waba_id}/subscribed_apps` (para registrar o webhook automático na WABA)
* **Instagram Professional API:**
  * Inexistentes no código. Precisamos de:
    * `GET https://graph.facebook.com/v21.0/{page_id}?fields=instagram_business_account`
    * `POST https://graph.facebook.com/v21.0/{instagram_business_account_id}/messages` (Instagram Messaging API)
