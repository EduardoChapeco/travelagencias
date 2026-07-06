# PLAN.md (A.I.R.I. Phase 2 - P.L.A.N.)
**Objetivo:** Transformar o Turis numa central Omnichannel (Umbler Talk + Mail) mantendo 100% de compatibilidade retroativa.

## 1. Módulo INBOX WhatsApp (Onda 1 e 2)
**User Story:** Como atendente, quero ver todas as conversas do WhatsApp em tempo real sem recarregar a tela.
**Storyboard:** Login -> Clica em "Inbox" -> Lista virtualizada de conversas -> Seleciona conversa -> Chat e envio instantâneo -> Recebe recibo de leitura via Realtime.
**Delta de Schema:**
- `CREATE TABLE public.channels` (whatsapp, email)
- `CREATE TABLE public.contacts`
- `CREATE TABLE public.conversations` (com RLS via `agency_id`)
- `CREATE TABLE public.messages` (id, conversation_id, direction, status)
**Delta de API:**
- Nova Edge Function: `whatsapp-webhook` (verifica HMAC, faz upsert da mensagem).
- Nova Edge Function: `whatsapp-sender` (consome Meta Cloud API).
**Delta UI:** Nova rota `/agency/$slug/inbox` consumindo hooks de Realtime.
**Feature Flag:** `inbox_v1`
**Riscos:** Rate limit da Meta. Mitigação: Retry queue assíncrona.

## 2. Módulo CHATBOT VISUAL (Onda 3)
**User Story:** Como admin, quero arrastar nós visuais para construir meu funil de bot.
**Delta de Schema:** `CREATE TABLE public.chatbot_flows` (jsonb_definition).
**Delta UI:** Integração isolada do `reactflow` num modal restrito.
**Feature Flag:** `bot_visual`

## 3. Módulo AGENTE IA + RAG (Onda 4)
**User Story:** Como admin, quero que uma IA baseada no site responda clientes.
**Delta de Schema:** (A tabela `knowledge_chunks` e `rag-document-processor` já existem no inventário, apenas re-linkaremos às conversas).
**Delta de API:** Edge Function `ai-reply` (busca embeddings no PgVector -> Prompt Gemini -> Envia resposta).
**Feature Flag:** `ai_agent`

## 4. Módulo CAMPANHAS (Onda 5)
**User Story:** Como marketing, quero disparar templates HSM para um CSV.
**Delta de Schema:** `CREATE TABLE public.campaigns` e `campaign_leads`.
**Feature Flag:** `campaigns`
**Riscos:** Bloqueio por spam na Meta. Mitigação: Validação estrita de status HSM.

## 5. Módulo CRM BOARD (Onda 6)
**User Story:** Como vendedor, quero arrastar deals num kanban.
**Delta de Schema:** `deal_stages` e `deals`.
**Delta UI:** Reutilizar `@dnd-kit/core` já presente.
**Feature Flag:** `crm_board`

## 6. Módulo EMAIL WHITE-LABEL (Onda 7)
**User Story:** Como cliente, quero autenticar meu Workspace (OAuth2) e usar webmail na plataforma.
**Delta de Schema:** `CREATE TABLE public.email_accounts` (tokens encriptados por tenant).
**Delta de API:** 
- `gmail-oauth` (Callback do Google).
- `gmail-sync` (Push notifications via Pub/Sub).
**Feature Flag:** `gmail_oauth`
**Riscos:** Vazamento de tokens. Mitigação: Chaves no Vault e pgcrypto AES.
