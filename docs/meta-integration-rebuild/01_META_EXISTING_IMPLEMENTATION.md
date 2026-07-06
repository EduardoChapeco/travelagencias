# 01. Meta Existing Implementation (Implementação Meta Existente)

## 1. Mapeamento de Arquivos no Projeto
* **Frontend UI:**
  * [integrations.tsx](file:///c:/Users/Turis Tecnologia SMO/.gemini/antigravity-ide/scratch/travelagencias/src/routes/agency.$slug.integrations.tsx): Possui form manual para WhatsApp e chaves genéricas.
  * [inbox.tsx](file:///c:/Users/Turis Tecnologia SMO/.gemini/antigravity-ide/scratch/travelagencias/src/routes/agency.$slug.inbox.tsx): Possui um popover/sheet de conexões rápidas onde insere canais de `whatsapp` e `instagram` diretamente.
* **Edge Functions:**
  * [whatsapp-webhook](file:///c:/Users/Turis Tecnologia SMO/.gemini/antigravity-ide/scratch/travelagencias/supabase/functions/whatsapp-webhook/index.ts): Recebe eventos do WhatsApp Business Cloud API e atualiza as tabelas `contacts`, `conversations` e `messages`.
  * [whatsapp-sender](file:///c:/Users/Turis Tecnologia SMO/.gemini/antigravity-ide/scratch/travelagencias/supabase/functions/whatsapp-sender/index.ts): Disparado por webhook do DB para enviar mensagens de saída chamando a Graph API `/messages`.
  * [meta-capi-sync](file:///c:/Users/Turis Tecnologia SMO/.gemini/antigravity-ide/scratch/travelagencias/supabase/functions/meta-capi-sync/index.ts): Sincroniza conversões de leads do banco com a API de Conversões da Meta.

## 2. O que funciona de verdade
* O recebimento de mensagens no `whatsapp-webhook` funciona apenas se o Verify Token global `META_VERIFY_TOKEN` ou um registro correspondente em `whatsapp_connections` bater.
* O envio de mensagens no `whatsapp-sender` funciona via chamada Graph API se as credenciais do canal estiverem legíveis.

## 3. O que está simulado ou incompleto
* **Instagram:** Totalmente simulado/mockado. O token é salvo, o canal é criado, mas não há processamento real de mensagens no webhook, nem envio implementado.
* **OAuth e Signup:** Inexistente. A agência precisa colar tokens gerados manualmente no Meta App Developer Dashboard.
* **Coexistência:** Não há fluxo ou lógica tratando a coexistência com o aplicativo WhatsApp Business tradicional.
