# 10. Domain Cloudflare and URLs (Configuração de Domínio e Cloudflare)

## 1. Origem Canônica e URLs Únicas
Para o correto funcionamento do OAuth da Meta e das chamadas de Webhook, a aplicação deve rodar sob um domínio próprio estável:
* **Produção:** `app.vibetour.com.br` (exemplo)
* **Homologação/Staging:** `staging.vibetour.com.br`
* **Desenvolvimento:** Túnel seguro local usando `ngrok` ou Cloudflare Tunnel.

## 2. Configurações Centrais no Env
As seguintes variáveis de ambiente devem ser centralizadas e configuradas no painel da Cloudflare/Edge Functions e no `.env` local:
* `PUBLIC_APP_URL`: URL canônica do frontend da aplicação.
* `META_REDIRECT_URI`: Endereço de callback do OAuth da Meta (ex: `https://app.vibetour.com.br/api/meta/oauth/callback`).
* `META_WHATSAPP_CALLBACK_URL`: Endpoint exposto para recebimento de webhooks do WhatsApp (ex: `https://[SUPABASE_PROJECT].supabase.co/functions/v1/whatsapp-webhook`).

## 3. Configurações de DNS e CSP
* Configurar no painel da Cloudflare redirecionamentos automáticos do domínio temporário da Vercel/Netlify/Cloudflare Pages (`*.pages.dev`) para o domínio oficial da agência.
* Injetar cabeçalhos CSP (Content Security Policy) e CORS corretos para permitir a execução de frames e scripts do SDK de Login da Meta de forma segura.
