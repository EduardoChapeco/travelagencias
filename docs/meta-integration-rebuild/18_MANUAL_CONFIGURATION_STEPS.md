# 18. Manual Configuration Steps (Passos de Configuração Manual)

## 1. Configurações Manuais Necessárias
Esta seção lista as configurações físicas que devem ser feitas no painel do Supabase e no painel Meta pelo administrador:

### No Painel do Supabase (Secrets / Variables)
* Configurar no menu **Settings → Edge Functions** as seguintes variáveis de ambiente globais:
  * `META_APP_SECRET`: O segredo do aplicativo Meta obtido na seção básica de configurações do app.
  * `META_VERIFY_TOKEN`: A palavra-secreta de validação do webhook (ex: `travelOS-verify-token-2024`).
  * `API_KEY_SECRET`: A chave secreta de encriptação AES utilizada para salvar dados em `credentials_encrypted`.

### No Painel da Meta
* **Configuração de Webhook:**
  * Apontar a URL do Webhook do WhatsApp e Instagram para: `https://[SUPABASE_PROJECT_ID].supabase.co/functions/v1/whatsapp-webhook`.
  * Configurar o Token de Verificação correspondente ao `META_VERIFY_TOKEN`.
* **Configuração de Login:**
  * Adicionar a URI de redirecionamento canônica de produção em "Valid OAuth Redirect URIs".
