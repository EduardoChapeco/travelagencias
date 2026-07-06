# 07. Canonical Channel Data Model (Modelo Canônico de Dados dos Canais)

## 1. Tabelas de Integração Unificadas
Para evitar duplicação de dados, o Turis consolidará o modelo com base no schema `Umbler Inbox Foundation` (criado em 2026-08-01):

### Tabela `public.channels`
Define cada canal físico ativo na agência:
* `id` uuid PRIMARY KEY
* `agency_id` uuid REFERENCES agencies(id)
* `type` channel_type ('whatsapp', 'email', 'webchat')
* `display_name` text
* `external_id` text (ex: Phone Number ID no WhatsApp ou Instagram Account ID)
* `credentials_encrypted` bytea (credenciais do canal salvas de forma criptografada usando pgcrypto ou referências ao Vault)
* `is_active` boolean

### Tabela `public.contacts`
* `id` uuid PRIMARY KEY
* `agency_id` uuid REFERENCES agencies(id)
* `name` text
* `phone` text
* `email` text
* `metadata` jsonb (propriedades adicionais como waive flags, tags ou origem)

### Tabela `public.conversations`
* `id` uuid PRIMARY KEY
* `agency_id` uuid REFERENCES agencies(id)
* `channel_id` uuid REFERENCES channels(id)
* `contact_id` uuid REFERENCES contacts(id)
* `status` conversation_status ('open', 'pending', 'snoozed', 'closed')
* `ai_mode` boolean (se o auto-responder de IA está ativo para esta conversa)
* `assigned_user_id` uuid REFERENCES auth.users(id)
* `last_message_at` timestamptz

### Tabela `public.messages`
* `id` uuid PRIMARY KEY
* `conversation_id` uuid REFERENCES conversations(id)
* `agency_id` uuid (desnormalizado para RLS de alta performance)
* `direction` message_direction ('inbound', 'outbound')
* `body` text
* `media_url` text
* `status` message_status ('queued', 'sent', 'delivered', 'read', 'failed')
* `external_id` text (wamid ou ID da provedora externa)
* `created_at` timestamptz
