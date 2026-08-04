# 08. Edge Functions Reality (Realidade das Edge Functions)

## 1. Mapeamento e Auditoria das Edge Functions

### `whatsapp-webhook`

- **Localização:** `supabase/functions/whatsapp-webhook/index.ts`.
- **Segurança:** Implementa rejeição imediata se o header `x-hub-signature-256` estiver ausente.
- **Integridade:** Valida a assinatura HMAC-SHA256 usando o `META_APP_SECRET` global ou o `secret_reference` do canal correspondente.
- **Processamento:** Insere dados diretamente no novo modelo de mensagens (`messages`, `conversations`, `contacts`).

### `whatsapp-sender`

- **Localização:** `supabase/functions/whatsapp-sender/index.ts`.
- **Segurança:** Só pode ser invocado internamente com o token de autorização `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` (segurança de trigger de banco de dados).
- **Envio:** Chama a Graph API da Meta `/messages` usando o token descriptografado.

### `meta-capi-sync`

- **Localização:** `supabase/functions/meta-capi-sync/index.ts`.
- **Funcionamento:** Sincroniza conversões de propostas marcadas como `converted` com a API de conversões da Meta.
